import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { Bulletin } from '../entities/bulletin.entity';
import { Student } from '../entities/student.entity';
import { SubjectAssignment } from '../entities/subject-assignment.entity';
import { ClassRoom } from '../entities/classroom.entity';
import { GradesService } from '../grades/grades.service';
import { AbsencesService } from '../absences/absences.service';
import { AuditLogService } from '../audit-log/audit-log.service';
import { AuditAction } from '../entities/audit-log.entity';

interface StudentComputation {
  studentId: string;
  studentName: string;
  average: number;
  subjectDetails: { subjectName: string; grade: number; coefficient: number; weighted: number }[];
}

// Seuils utilisés pour le mot du superviseur, générés automatiquement à partir
// de la moyenne — le superviseur peut ensuite le modifier avant de signer.
function autoComment(average: number): string {
  if (average >= 16) return 'Félicitations — excellent travail, continuez ainsi.';
  if (average >= 14) return 'Encouragements — très bon trimestre.';
  if (average >= 12) return 'Encouragements — bon travail, poursuivez vos efforts.';
  if (average >= 10) return 'Travail satisfaisant — des efforts restent à fournir.';
  return 'Doit fournir des efforts sérieux — un accompagnement est recommandé.';
}

@Injectable()
export class BulletinsService {
  constructor(
    @InjectRepository(Bulletin) private bulletinRepo: Repository<Bulletin>,
    @InjectRepository(Student) private studentRepo: Repository<Student>,
    @InjectRepository(SubjectAssignment) private subjectRepo: Repository<SubjectAssignment>,
    @InjectRepository(ClassRoom) private classRoomRepo: Repository<ClassRoom>,
    private gradesService: GradesService,
    private absencesService: AbsencesService,
    private auditLog: AuditLogService,
    private config: ConfigService,
  ) {}

  // Déclenchée par l'admin, mais TOUT le calcul se fait ici, côté serveur.
  // L'admin ne reçoit en retour que le résumé (moyenne, rang) — jamais la grille
  // de notes qui a servi au calcul (voir GradesService.findRawForBulletinComputation,
  // méthode interne non exposée sur une route accessible à l'admin).
  async generateForClass(adminId: string, classRoomId: string, term: string) {
    const classRoom = await this.classRoomRepo.findOne({
      where: { id: classRoomId },
      relations: ['principalTeacher'],
    });
    if (!classRoom) throw new NotFoundException('Salle introuvable');

    const students = await this.studentRepo.find({ where: { classRoomId } });
    const subjects = await this.subjectRepo.find({ where: { classRoomId } });
    const grades = await this.gradesService.findRawForBulletinComputation(classRoomId, term);

    if (students.length === 0) throw new BadRequestException('Aucun élève dans cette salle');
    if (subjects.length === 0) throw new BadRequestException('Aucune matière configurée pour cette salle');

    const missing: string[] = [];
    const computations: StudentComputation[] = [];

    for (const student of students) {
      let weightedSum = 0;
      let coefSum = 0;
      const subjectDetails: StudentComputation['subjectDetails'] = [];

      for (const subject of subjects) {
        const grade = grades.find(
          (g) => g.studentId === student.id && g.subjectAssignmentId === subject.id,
        );
        if (!grade) {
          missing.push(`${student.firstName} ${student.lastName} — ${subject.name}`);
          continue;
        }
        const normalized = (grade.value / grade.maxValue) * 20;
        weightedSum += normalized * subject.coefficient;
        coefSum += subject.coefficient;
        subjectDetails.push({
          subjectName: subject.name,
          grade: grade.value,
          coefficient: subject.coefficient,
          weighted: normalized * subject.coefficient,
        });
      }

      computations.push({
        studentId: student.id,
        studentName: `${student.firstName} ${student.lastName}`,
        average: coefSum > 0 ? Math.round((weightedSum / coefSum) * 100) / 100 : 0,
        subjectDetails,
      });
    }

    if (missing.length > 0) {
      // On renvoie la liste des manquants (noms de matières/élèves), jamais les valeurs déjà saisies.
      throw new BadRequestException({
        message: 'Notes manquantes pour générer les bulletins de cette salle',
        missing,
      });
    }

    // Classement
    const ranked = [...computations].sort((a, b) => b.average - a.average);
    ranked.forEach((c, index) => ((c as any).rank = index + 1));

    const schoolName = this.config.get<string>('SCHOOL_NAME', 'Établissement scolaire');
    const principalTeacherName = classRoom.principalTeacher
      ? `${classRoom.principalTeacher.firstName} ${classRoom.principalTeacher.lastName}`
      : undefined;

    const savedBulletins: Bulletin[] = [];
    for (const comp of ranked) {
      // Heures d'absence agrégées pour ce trimestre — comptent dans le document
      // final pour aider à statuer sur la situation de l'élève.
      const absenceSummary = await this.absencesService.getAbsenceSummaryForStudent(comp.studentId, term);

      const bulletin = this.bulletinRepo.create({
        studentId: comp.studentId,
        classRoomId,
        term,
        generatedById: adminId,
        average: comp.average,
        rank: (comp as any).rank,
        detailsJson: JSON.stringify(comp.subjectDetails),
        schoolName,
        principalTeacherName,
        totalAbsenceHours: absenceSummary.totalHours,
        justifiedAbsenceHours: absenceSummary.justifiedHours,
        unjustifiedAbsenceHours: absenceSummary.unjustifiedHours,
        supervisorComment: autoComment(comp.average), // pré-rempli, le superviseur pourra l'ajuster avant signature
      });
      savedBulletins.push(await this.bulletinRepo.save(bulletin));
    }

    await this.auditLog.record({
      action: AuditAction.BULLETIN_GENERATED,
      actorId: adminId,
      classRoomId,
    });

    // Réponse à l'admin : uniquement les résumés (élève, moyenne, rang) — jamais le détail matière par matière brut.
    return ranked.map((c) => ({
      studentId: c.studentId,
      studentName: c.studentName,
      average: c.average,
      rank: (c as any).rank,
    }));
  }

  // Signature du superviseur — seul rôle habilité à signer. Le mot de félicitations/
  // encouragements est pré-rempli automatiquement selon la moyenne à la génération,
  // mais le superviseur peut l'ajuster avant de signer définitivement.
  async signBulletin(supervisorId: string, bulletinId: string, comment?: string) {
    const bulletin = await this.bulletinRepo.findOne({ where: { id: bulletinId } });
    if (!bulletin) throw new NotFoundException('Bulletin introuvable');
    if (bulletin.signedById) {
      throw new ForbiddenException('Ce bulletin est déjà signé');
    }

    bulletin.signedById = supervisorId;
    bulletin.signedAt = new Date();
    if (comment && comment.trim().length > 0) {
      bulletin.supervisorComment = comment;
    }

    return this.bulletinRepo.save(bulletin);
  }

  // Détail complet d'un bulletin — consultable par l'admin car c'est un DOCUMENT FINAL déjà généré,
  // pas une grille de saisie modifiable. La distinction est importante : ceci est un résultat figé.
  async getBulletinDetails(bulletinId: string) {
    const bulletin = await this.bulletinRepo.findOne({
      where: { id: bulletinId },
      relations: ['student', 'classRoom', 'signedBy'],
    });
    if (!bulletin) return null;
    return {
      ...bulletin,
      subjectDetails: JSON.parse(bulletin.detailsJson),
    };
  }

  async listForClass(classRoomId: string, term: string) {
    return this.bulletinRepo.find({
      where: { classRoomId, term },
      relations: ['student'],
      order: { rank: 'ASC' },
    });
  }
}
