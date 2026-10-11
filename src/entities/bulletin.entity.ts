import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn } from 'typeorm';
import { Student } from './student.entity';
import { ClassRoom } from './classroom.entity';
import { User } from './user.entity';

@Entity('bulletins')
export class Bulletin {
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
  term: string;

  @CreateDateColumn()
  generatedAt: Date;

  @Column()
  generatedById: string;

  @ManyToOne(() => User)
  generatedBy: User;

  @Column('float')
  average: number;

  @Column({ nullable: true })
  rank: number;

  @Column({ nullable: true })
  pdfPath: string;

  @Column('text')
  detailsJson: string; // snapshot JSON des matières/notes/coefficients au moment de la génération

  // --- Habillage du document ---
  @Column({ nullable: true })
  schoolName: string;

  @Column({ nullable: true })
  principalTeacherName: string;

  // --- Assiduité, agrégée depuis les absences au moment de la génération ---
  @Column('float', { default: 0 })
  totalAbsenceHours: number;

  @Column('float', { default: 0 })
  justifiedAbsenceHours: number;

  @Column('float', { default: 0 })
  unjustifiedAbsenceHours: number;

  // --- Signature du superviseur ---
  @Column({ nullable: true })
  signedById: string;

  @ManyToOne(() => User)
  signedBy: User;

  @Column({ type: 'datetime', nullable: true })
  signedAt: Date;

  @Column({ nullable: true })
  supervisorComment: string; // mot de félicitations/encouragements, auto-généré selon la moyenne, modifiable par le superviseur
}
