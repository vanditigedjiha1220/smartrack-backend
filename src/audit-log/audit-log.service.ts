import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog, AuditAction } from '../entities/audit-log.entity';

@Injectable()
export class AuditLogService {
  constructor(@InjectRepository(AuditLog) private repo: Repository<AuditLog>) {}

  // Appelée UNIQUEMENT depuis d'autres services (GradesService, AccessGrantsService...).
  // Aucun controller n'expose d'écriture directe sur ce repository.
  async record(entry: {
    action: AuditAction;
    actorId: string;
    studentId?: string;
    classRoomId?: string;
    subjectAssignmentId?: string;
    oldValue?: number;
    newValue?: number;
    reason?: string;
  }): Promise<AuditLog> {
    const log = this.repo.create(entry);
    return this.repo.save(log);
  }

  // Vue COMPLÈTE — réservée aux superviseurs (voir AuditLogController + RolesGuard).
  // passwordHash de l'acteur retiré systématiquement, même dans cette vue "complète" :
  // "complet" porte sur les valeurs de notes, jamais sur les identifiants de connexion.
  async findAllFull(filters?: { studentId?: string; classRoomId?: string }) {
    const logs = await this.repo.find({
      where: filters,
      relations: ['actor'],
      order: { timestamp: 'DESC' },
    });
    return logs.map((log) => {
      const { passwordHash, ...safeActor } = log.actor as any;
      return { ...log, actor: safeActor };
    });
  }

  // Vue MÉTADONNÉES SEULEMENT — pour l'admin : qui/quand/quelle salle/quelle action,
  // JAMAIS oldValue/newValue (les valeurs de notes). C'est la garantie concrète
  // que l'admin ne peut techniquement pas déduire une note via le journal d'audit.
  async findAllMetadataOnly(filters?: { classRoomId?: string }) {
    const logs = await this.repo.find({
      where: filters,
      relations: ['actor'],
      order: { timestamp: 'DESC' },
    });

    return logs.map((log) => ({
      id: log.id,
      action: log.action,
      actorName: `${log.actor.firstName} ${log.actor.lastName}`,
      classRoomId: log.classRoomId,
      subjectAssignmentId: log.subjectAssignmentId,
      timestamp: log.timestamp,
      // oldValue, newValue, studentId volontairement omis
    }));
  }
}
