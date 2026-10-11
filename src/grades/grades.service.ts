import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Grade, GradeModification } from '../entities/grade.entity';
import { Student } from '../entities/student.entity';
import { SubjectAssignment } from '../entities/subject-assignment.entity';
import { User } from '../entities/user.entity';
import { AccessGrantsService } from '../access-grants/access-grants.service';
import { AuditLogService } from '../audit-log/audit-log.service';
import { AuditAction } from '../entities/audit-log.entity';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import { CreateGradeDto, ModifyGradeDto } from './dto/grade.dto';

@Injectable()
export class GradesService {
  constructor(
    @InjectRepository(Grade) private gradeRepo: Repository<Grade>,
    @InjectRepository(GradeModification) private modRepo: Repository<GradeModification>,
    @InjectRepository(Student) private studentRepo: Repository<Student>,
    @InjectRepository(SubjectAssignment) private subjectRepo: Repository<SubjectAssignment>,
    @InjectRepository(User) private userRepo: Repository<User>,
    private accessGrants: AccessGrantsService,
    private auditLog: AuditLogService,
    private realtime: RealtimeGateway,
  ) {}

  // Création d'une note — réservée à l'enseignant titulaire, dans sa fenêtre d'accès active.
  // ADMIN n'a aucune route qui appelle cette méthode (voir GradesController + RolesGuard).
  async create(teacherId: string, dto: CreateGradeDto): Promise<Grade> {
    // 1. Vérification stricte de l'accès temporaire — jamais de confiance côté client.
    const grant = await this.accessGrants.assertValidGrant(
      teacherId,
      dto.classRoomId,
      dto.subjectAssignmentId,
    );

    const subject = await this.subjectRepo.findOne({ where: { id: dto.subjectAssignmentId } });
    if (!subject) throw new NotFoundException('Matière introuvable');
    if (subject.teacherId !== teacherId) {
      throw new ForbiddenException("Vous n'êtes pas l'enseignant assigné à cette matière");
    }

    const existing = await this.gradeRepo.findOne({
      where: { studentId: dto.studentId, subjectAssignmentId: dto.subjectAssignmentId, term: dto.term },
    });
    if (existing) {
      throw new BadRequestException(
        'Une note existe déjà pour cet élève/matière/trimestre — utilisez la route de modification (motif obligatoire).',
      );
    }

    const grade = this.gradeRepo.create({
      studentId: dto.studentId,
      classRoomId: dto.classRoomId,
      subjectAssignmentId: dto.subjectAssignmentId,
      teacherId,
      term: dto.term,
      value: dto.value,
      maxValue: dto.maxValue ?? 20,
      enteredViaGrantId: grant.id,
    });
    const saved = await this.gradeRepo.save(grade);

    await this.auditLog.record({
      action: AuditAction.GRADE_CREATED,
      actorId: teacherId,
      studentId: dto.studentId,
      classRoomId: dto.classRoomId,
      subjectAssignmentId: dto.subjectAssignmentId,
      newValue: dto.value,
    });

    await this.broadcastToSupervisors('GRADE_CREATED', saved, undefined, dto.value, undefined);

    return saved;
  }

  // Modification d'une note existante — motif OBLIGATOIRE, revérification de l'accès.
  async modify(teacherId: string, gradeId: string, dto: ModifyGradeDto): Promise<Grade> {
    if (!dto.reason || dto.reason.trim().length === 0) {
      throw new BadRequestException('Le motif de modification est obligatoire');
    }

    const grade = await this.gradeRepo.findOne({ where: { id: gradeId } });
    if (!grade) throw new NotFoundException('Note introuvable');

    if (grade.teacherId !== teacherId) {
      throw new ForbiddenException("Vous ne pouvez modifier que vos propres saisies");
    }

    // Revérification stricte : la fenêtre d'accès doit être active AU MOMENT de la modification,
    // pas seulement au moment de la saisie initiale.
    const grant = await this.accessGrants.assertValidGrant(
      teacherId,
      grade.classRoomId,
      grade.subjectAssignmentId,
    );

    const oldValue = grade.value;
    grade.value = dto.newValue;
    grade.enteredViaGrantId = grant.id;
    const saved = await this.gradeRepo.save(grade);

    const modification = this.modRepo.create({
      gradeId: grade.id,
      oldValue,
      newValue: dto.newValue,
      reason: dto.reason,
    });
    await this.modRepo.save(modification);

    await this.auditLog.record({
      action: AuditAction.GRADE_MODIFIED,
      actorId: teacherId,
      studentId: grade.studentId,
      classRoomId: grade.classRoomId,
      subjectAssignmentId: grade.subjectAssignmentId,
      oldValue,
      newValue: dto.newValue,
      reason: dto.reason,
    });

    await this.broadcastToSupervisors('GRADE_MODIFIED', saved, oldValue, dto.newValue, dto.reason);

    return saved;
  }

  private async broadcastToSupervisors(
    action: 'GRADE_CREATED' | 'GRADE_MODIFIED',
    grade: Grade,
    oldValue: number | undefined,
    newValue: number,
    reason: string | undefined,
  ) {
    const student = await this.studentRepo.findOneOrFail({ where: { id: grade.studentId } });
    const subject = await this.subjectRepo.findOneOrFail({
      where: { id: grade.subjectAssignmentId },
      relations: ['classRoom'],
    });
    const teacher = await this.userRepo.findOneOrFail({ where: { id: grade.teacherId } });

    this.realtime.notifySupervisorsGradeEvent({
      action,
      studentName: `${student.firstName} ${student.lastName}`,
      teacherName: `${teacher.firstName} ${teacher.lastName}`,
      subjectName: subject.name,
      classRoomName: subject.classRoom.name,
      oldValue,
      newValue,
      reason,
      timestamp: new Date(),
    });
  }

  // --- Lectures ---

  // Enseignant : uniquement SES propres saisies.
  async findByTeacherAndClass(teacherId: string, classRoomId: string, subjectAssignmentId: string) {
    return this.gradeRepo.find({
      where: { teacherId, classRoomId, subjectAssignmentId },
      relations: ['student'],
    });
  }

  // Superviseur : lecture complète, avec historique.
  // Le hash du mot de passe de l'enseignant ne doit JAMAIS transiter dans une réponse API,
  // même haché — on le retire explicitement de l'objet relationnel avant de renvoyer.
  async findAllForSupervisor(filters?: { classRoomId?: string; studentId?: string }) {
    const grades = await this.gradeRepo.find({
      where: filters,
      relations: ['student', 'subjectAssignment', 'teacher', 'modificationHistory'],
      order: { enteredAt: 'DESC' },
    });

    return grades.map((g) => {
      const { passwordHash, ...safeTeacher } = g.teacher as any;
      return { ...g, teacher: safeTeacher };
    });
  }

  // Utilisé en interne par BulletinsService UNIQUEMENT — jamais exposé à une route
  // accessible par l'admin. Le contrôleur bulletins ne renvoie que le résultat agrégé (PDF/moyenne).
  async findRawForBulletinComputation(classRoomId: string, term: string) {
    return this.gradeRepo.find({
      where: { classRoomId, term },
      relations: ['student', 'subjectAssignment'],
    });
  }
}
