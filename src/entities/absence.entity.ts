import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn } from 'typeorm';
import { Student } from './student.entity';
import { ClassRoom } from './classroom.entity';
import { SubjectAssignment } from './subject-assignment.entity';
import { User } from './user.entity';

// Une absence = une séance de cours manquée par un élève, enregistrée par
// l'enseignant au moment de l'appel. AUCUN accès temporaire requis pour créer
// une absence (contrairement aux notes) — c'est un acte de routine de fin de cours,
// pas une donnée à haut risque de manipulation comme une note.
//
// Chaîne de justification, dans cet ordre strict (vérifié côté serveur) :
//   1. Élève justifie en personne auprès du superviseur (hors app)
//   2. Superviseur approuve dans l'app -> supervisorApproved = true
//   3. Admin, UNIQUEMENT après l'approbation du superviseur, marque justifié -> justified = true
// L'admin ne peut jamais sauter l'étape 2.
@Entity('absences')
export class Absence {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  studentId: string;

  @ManyToOne(() => Student)
  student: Student;

  @Column()
  classRoomId: string;

  @ManyToOne(() => ClassRoom)
  classRoom: ClassRoom;

  @Column()
  subjectAssignmentId: string;

  @ManyToOne(() => SubjectAssignment)
  subjectAssignment: SubjectAssignment;

  @Column()
  teacherId: string;

  @ManyToOne(() => User)
  teacher: User;

  @Column()
  term: string; // "Trimestre 1" — pour l'agrégation sur le bulletin

  @Column({ type: 'date' })
  date: string; // jour du cours manqué (YYYY-MM-DD) — la justification s'applique par jour, pas par séance individuelle

  @Column('float')
  hours: number; // durée de la séance manquée, comptabilisée sur le bulletin

  @Column({ default: false })
  supervisorApproved: boolean;

  @Column({ nullable: true })
  supervisorApprovedById: string;

  @ManyToOne(() => User)
  supervisorApprovedBy: User;

  @Column({ type: 'datetime', nullable: true })
  supervisorApprovedAt: Date;

  @Column({ default: false })
  justified: boolean;

  @Column({ nullable: true })
  justifiedByAdminId: string;

  @ManyToOne(() => User)
  justifiedByAdmin: User;

  @Column({ type: 'datetime', nullable: true })
  justifiedAt: Date;

  @CreateDateColumn()
  recordedAt: Date;
}
