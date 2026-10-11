import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThan, Repository } from 'typeorm';
import { AccessGrant, GrantStatus } from '../entities/access-grant.entity';
import { ClassRoom } from '../entities/classroom.entity';
import { SubjectAssignment } from '../entities/subject-assignment.entity';
import { User } from '../entities/user.entity';
import { AuditLogService } from '../audit-log/audit-log.service';
import { AuditAction } from '../entities/audit-log.entity';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import { GrantAccessDto, RequestAccessDto } from './dto/access-grant.dto';

@Injectable()
export class AccessGrantsService {
  constructor(
    @InjectRepository(AccessGrant) private grantRepo: Repository<AccessGrant>,
    @InjectRepository(ClassRoom) private classRepo: Repository<ClassRoom>,
    @InjectRepository(SubjectAssignment) private subjectRepo: Repository<SubjectAssignment>,
    @InjectRepository(User) private userRepo: Repository<User>,
    private auditLog: AuditLogService,
    private realtime: RealtimeGateway,
  ) {}

  // L'enseignant signale à l'admin qu'il veut saisir/corriger des notes.
  // Ne crée PAS d'accès — juste une notification, l'admin garde la main.
  async requestAccess(teacherId: string, dto: RequestAccessDto) {
    const classRoom = await this.classRepo.findOne({ where: { id: dto.classRoomId } });
    const subject = await this.subjectRepo.findOne({ where: { id: dto.subjectAssignmentId } });
    const teacher = await this.userRepo.findOne({ where: { id: teacherId } });
    if (!classRoom || !subject || !teacher) throw new NotFoundException();

    await this.auditLog.record({
      action: AuditAction.ACCESS_REQUESTED,
      actorId: teacherId,
      classRoomId: dto.classRoomId,
      subjectAssignmentId: dto.subjectAssignmentId,
    });

    this.realtime.notifyAdminAccessRequest({
      teacherName: `${teacher.firstName} ${teacher.lastName}`,
      classRoomName: classRoom.name,
      subjectName: subject.name,
      requestedAt: new Date(),
    });

    return { message: 'Demande envoyée à l’administrateur' };
  }

  // Seul l'admin peut créer un grant. Durée précise, jamais illimitée.
  async grantAccess(adminId: string, dto: GrantAccessDto) {
    const subject = await this.subjectRepo.findOne({ where: { id: dto.subjectAssignmentId } });
    if (!subject) throw new NotFoundException('Matière introuvable');
    if (subject.teacherId !== dto.teacherId) {
      throw new ForbiddenException(
        "Cet enseignant n'est pas assigné à cette matière dans cette salle",
      );
    }

    const classRoom = await this.classRepo.findOne({ where: { id: dto.classRoomId } });
    if (!classRoom) throw new NotFoundException('Salle introuvable');

    const grant = this.grantRepo.create({
      teacherId: dto.teacherId,
      classRoomId: dto.classRoomId,
      subjectAssignmentId: dto.subjectAssignmentId,
      grantedById: adminId,
      expiresAt: new Date(dto.expiresAt),
      status: GrantStatus.ACTIVE,
      reason: dto.reason,
    });
    const saved = await this.grantRepo.save(grant);

    await this.auditLog.record({
      action: AuditAction.ACCESS_GRANTED,
      actorId: adminId,
      classRoomId: dto.classRoomId,
      subjectAssignmentId: dto.subjectAssignmentId,
      reason: dto.reason,
    });

    this.realtime.notifyTeacherAccessGranted(dto.teacherId, {
      classRoomName: classRoom.name,
      subjectName: subject.name,
      expiresAt: saved.expiresAt,
    });

    return saved;
  }

  async revokeAccess(adminId: string, grantId: string) {
    const grant = await this.grantRepo.findOne({
      where: { id: grantId },
      relations: ['classRoom', 'subjectAssignment'],
    });
    if (!grant) throw new NotFoundException('Accès introuvable');

    grant.status = GrantStatus.REVOKED;
    await this.grantRepo.save(grant);

    await this.auditLog.record({
      action: AuditAction.ACCESS_REVOKED,
      actorId: adminId,
      classRoomId: grant.classRoomId,
      subjectAssignmentId: grant.subjectAssignmentId,
    });

    this.realtime.notifyTeacherAccessRevoked(grant.teacherId, {
      classRoomName: grant.classRoom.name,
      subjectName: grant.subjectAssignment.name,
    });

    return grant;
  }

  // Tâche d'expiration automatique — à appeler périodiquement (cron, cf. ScheduleModule).
  async expireOutdatedGrants() {
    const outdated = await this.grantRepo.find({
      where: { status: GrantStatus.ACTIVE, expiresAt: LessThan(new Date()) },
    });

    for (const grant of outdated) {
      grant.status = GrantStatus.EXPIRED;
      await this.grantRepo.save(grant);
      await this.auditLog.record({
        action: AuditAction.ACCESS_EXPIRED,
        actorId: grant.teacherId,
        classRoomId: grant.classRoomId,
        subjectAssignmentId: grant.subjectAssignmentId,
      });
    }

    return outdated.length;
  }

  // *** FONCTION CLÉ DE SÉCURITÉ ***
  // Appelée par GradesService avant TOUTE écriture. Revérifiée à chaque requête,
  // jamais mise en cache. C'est la seule porte d'entrée légitime pour écrire une note.
  async assertValidGrant(teacherId: string, classRoomId: string, subjectAssignmentId: string): Promise<AccessGrant> {
    const grant = await this.grantRepo.findOne({
      where: { teacherId, classRoomId, subjectAssignmentId, status: GrantStatus.ACTIVE },
      order: { grantedAt: 'DESC' },
    });

    if (!grant) {
      throw new ForbiddenException(
        "Aucun accès actif pour cette matière/salle. Demandez un accès à l'administrateur.",
      );
    }

    if (grant.expiresAt.getTime() < Date.now()) {
      grant.status = GrantStatus.EXPIRED;
      await this.grantRepo.save(grant);
      throw new ForbiddenException('Votre accès a expiré. Demandez un nouvel accès.');
    }

    return grant;
  }

  async findActiveForTeacher(teacherId: string) {
    return this.grantRepo.find({
      where: { teacherId, status: GrantStatus.ACTIVE },
      relations: ['classRoom', 'subjectAssignment'],
    });
  }

  async findAllForAdmin() {
    // Vue admin : liste des accès (qui, quelle salle/matière, statut, durée) —
    // aucune valeur de note n'est bien sûr présente dans ce modèle.
    // On retire systématiquement passwordHash de l'enseignant chargé en relation.
    const grants = await this.grantRepo.find({
      relations: ['teacher', 'classRoom', 'subjectAssignment'],
      order: { grantedAt: 'DESC' },
    });
    return grants.map((g) => {
      const { passwordHash, ...safeTeacher } = g.teacher as any;
      return { ...g, teacher: safeTeacher };
    });
  }
}
