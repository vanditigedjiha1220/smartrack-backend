import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn } from 'typeorm';
import { User } from './user.entity';

export enum AuditAction {
  GRADE_CREATED = 'GRADE_CREATED',
  GRADE_MODIFIED = 'GRADE_MODIFIED',
  ACCESS_GRANTED = 'ACCESS_GRANTED',
  ACCESS_REVOKED = 'ACCESS_REVOKED',
  ACCESS_EXPIRED = 'ACCESS_EXPIRED',
  ACCESS_REQUESTED = 'ACCESS_REQUESTED',
  BULLETIN_GENERATED = 'BULLETIN_GENERATED',
}

// Journal d'audit immuable — écrit UNIQUEMENT par le code serveur (services),
// jamais exposé en écriture directe via une route API. Consultable en lecture
// intégrale par les superviseurs ; par l'admin en métadonnées seulement (voir AuditLogService).
@Entity('audit_logs')
export class AuditLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar' })
  action: AuditAction;

  @Column()
  actorId: string;

  @ManyToOne(() => User)
  actor: User;

  @Column({ nullable: true })
  studentId: string;

  @Column({ nullable: true })
  classRoomId: string;

  @Column({ nullable: true })
  subjectAssignmentId: string;

  @Column('float', { nullable: true })
  oldValue: number;

  @Column('float', { nullable: true })
  newValue: number;

  @Column({ nullable: true })
  reason: string;

  @CreateDateColumn()
  timestamp: Date;
}
