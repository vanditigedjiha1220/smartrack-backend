import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn } from 'typeorm';
import { User } from './user.entity';
import { ClassRoom } from './classroom.entity';
import { SubjectAssignment } from './subject-assignment.entity';

export enum GrantStatus {
  ACTIVE = 'ACTIVE',
  EXPIRED = 'EXPIRED',
  REVOKED = 'REVOKED',
}

// ACCÈS TEMPORAIRE — cœur du système anti-fraude.
// Un enseignant ne peut écrire une note QUE s'il existe un grant ACTIVE non expiré
// pour la matière/salle concernée. Vérifié à CHAQUE requête côté serveur (voir AccessGrantsService.assertValidGrant),
// jamais mis en cache ou fait confiance côté client.
@Entity('access_grants')
export class AccessGrant {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  teacherId: string;

  @ManyToOne(() => User)
  teacher: User;

  @Column()
  classRoomId: string;

  @ManyToOne(() => ClassRoom)
  classRoom: ClassRoom;

  @Column()
  subjectAssignmentId: string;

  @ManyToOne(() => SubjectAssignment)
  subjectAssignment: SubjectAssignment;

  @Column()
  grantedById: string;

  @ManyToOne(() => User)
  grantedBy: User;

  @CreateDateColumn()
  grantedAt: Date;

  @Column({ type: 'datetime' })
  expiresAt: Date;

  @Column({ type: 'varchar', default: GrantStatus.ACTIVE })
  status: GrantStatus;

  @Column({ nullable: true })
  reason: string; // "saisie initiale" | "correction demandée" etc.
}
