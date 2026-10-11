import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Absence } from '../entities/absence.entity';
import { SubjectAssignment } from '../entities/subject-assignment.entity';
import { Student } from '../entities/student.entity';
import { User } from '../entities/user.entity';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import { RecordAttendanceDto, ApproveJustificationDto, ConfirmJustificationDto } from './dto/absence.dto';

@Injectable()
export class AbsencesService {
  constructor(
    @InjectRepository(Absence) private repo: Repository<Absence>,
    @InjectRepository(SubjectAssignment) private subjectRepo: Repository<SubjectAssignment>,
    @InjectRepository(Student) private studentRepo: Repository<Student>,
    @InjectRepository(User) private userRepo: Repository<User>,
    private realtime: RealtimeGateway,
  ) {}

  // Appel de fin de cours — AUCUN accès temporaire requis (contrairement aux notes).
  // Seule vérification : l'enseignant doit bien être celui assigné à cette matière.
  async recordAttendance(teacherId: string, dto: RecordAttendanceDto) {
    const subject = await this.subjectRepo.findOne({ where: { id: dto.subjectAssignmentId } });
    if (!subject) throw new NotFoundException('Matière introuvable');
    if (subject.teacherId !== teacherId) {
      throw new ForbiddenException("Vous n'êtes pas l'enseignant assigné à cette matière");
    }

    const teacher = await this.userRepo.findOneOrFail({ where: { id: teacherId } });
    const created: Absence[] = [];

    for (const studentId of dto.absentStudentIds) {
      const absence = this.repo.create({
        studentId,
        classRoomId: dto.classRoomId,
        subjectAssignmentId: dto.subjectAssignmentId,
        teacherId,
        term: dto.term,
        date: dto.date,
        hours: dto.hours,
      });
      created.push(await this.repo.save(absence));
    }

    if (created.length > 0) {
      const students = await this.studentRepo.find({
        where: dto.absentStudentIds.map((id) => ({ id })),
      });
      // Diffusion immédiate à l'admin ET aux superviseurs — dès l'appel fait,
      // pas besoin d'attendre une justification pour que ce soit visible.
      this.realtime.notifyAbsenceRecorded({
        classRoomId: dto.classRoomId,
        subjectName: subject.name,
        teacherName: `${teacher.firstName} ${teacher.lastName}`,
        date: dto.date,
        studentNames: students.map((s) => `${s.firstName} ${s.lastName}`),
        hours: dto.hours,
      });
    }

    return created;
  }

  // Étape 2 de la chaîne : le superviseur approuve, pour un élève et un jour précis
  // (pas "toutes ses absences"). Sans cette étape, l'admin ne peut pas justifier.
  async approveJustification(supervisorId: string, dto: ApproveJustificationDto) {
    const absences = await this.repo.find({
      where: { studentId: dto.studentId, date: dto.date, justified: false },
    });

    if (absences.length === 0) {
      throw new NotFoundException('Aucune absence non justifiée trouvée pour cet élève à cette date');
    }

    for (const absence of absences) {
      absence.supervisorApproved = true;
      absence.supervisorApprovedById = supervisorId;
      absence.supervisorApprovedAt = new Date();
      await this.repo.save(absence);
    }

    const student = await this.studentRepo.findOneOrFail({ where: { id: dto.studentId } });
    const supervisor = await this.userRepo.findOneOrFail({ where: { id: supervisorId } });

    this.realtime.notifyJustificationApproved({
      studentName: `${student.firstName} ${student.lastName}`,
      date: dto.date,
      supervisorName: `${supervisor.firstName} ${supervisor.lastName}`,
    });

    return { message: `${absences.length} absence(s) approuvée(s) pour justification`, count: absences.length };
  }

  // Étape 3 : l'admin ne peut marquer justifié QUE ce que le superviseur a déjà
  // approuvé — l'admin ne peut jamais court-circuiter l'étape superviseur.
  async confirmJustification(adminId: string, dto: ConfirmJustificationDto) {
    const absences = await this.repo.find({
      where: { studentId: dto.studentId, date: dto.date, justified: false },
    });

    if (absences.length === 0) {
      throw new NotFoundException('Aucune absence en attente pour cet élève à cette date');
    }

    const notApproved = absences.filter((a) => !a.supervisorApproved);
    if (notApproved.length > 0) {
      throw new ForbiddenException(
        "Le superviseur n'a pas encore approuvé la justification de ces absences — impossible de les marquer justifiées.",
      );
    }

    for (const absence of absences) {
      absence.justified = true;
      absence.justifiedByAdminId = adminId;
      absence.justifiedAt = new Date();
      await this.repo.save(absence);
    }

    return { message: `${absences.length} absence(s) marquée(s) justifiée(s)`, count: absences.length };
  }

  // Superviseur : vue complète, avec statut de justification.
  async findAllForSupervisor(filters?: { classRoomId?: string; studentId?: string }) {
    const absences = await this.repo.find({
      where: filters,
      relations: ['student', 'subjectAssignment', 'teacher'],
      order: { date: 'DESC' },
    });
    return absences.map((a) => {
      const { passwordHash, ...safeTeacher } = a.teacher as any;
      return { ...a, teacher: safeTeacher };
    });
  }

  // Admin : mêmes données, mêmes garde-fous que pour l'audit — pas de restriction
  // ici car l'absence n'est pas une donnée à protéger comme la note elle-même,
  // c'est un fait objectif (présent/absent), pas un jugement noté.
  async findAllForAdmin(filters?: { classRoomId?: string }) {
    return this.findAllForSupervisor(filters);
  }

  // Utilisé par BulletinsService pour agréger les heures d'absence sur le bulletin.
  async getAbsenceSummaryForStudent(studentId: string, term: string) {
    const absences = await this.repo.find({ where: { studentId, term } });
    const totalHours = absences.reduce((sum, a) => sum + a.hours, 0);
    const justifiedHours = absences.filter((a) => a.justified).reduce((sum, a) => sum + a.hours, 0);
    const unjustifiedHours = totalHours - justifiedHours;
    return { totalHours, justifiedHours, unjustifiedHours };
  }
}
