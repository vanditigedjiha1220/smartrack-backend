import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  Unique,
  OneToMany,
} from 'typeorm';
import { Student } from './student.entity';
import { ClassRoom } from './classroom.entity';
import { SubjectAssignment } from './subject-assignment.entity';
import { User } from './user.entity';
import { AccessGrant } from './access-grant.entity';

@Entity('grades')
@Unique(['studentId', 'subjectAssignmentId', 'term'])
export class Grade {
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
  term: string; // "Trimestre 1"

  @Column('float')
  value: number;

  @Column('float', { default: 20 })
  maxValue: number;

  @CreateDateColumn()
  enteredAt: Date;

  @Column()
  enteredViaGrantId: string;

  @ManyToOne(() => AccessGrant)
  enteredViaGrant: AccessGrant;

  @OneToMany(() => GradeModification, (m) => m.grade)
  modificationHistory: GradeModification[];
}

@Entity('grade_modifications')
export class GradeModification {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  gradeId: string;

  @ManyToOne(() => Grade, (g) => g.modificationHistory)
  grade: Grade;

  @Column('float')
  oldValue: number;

  @Column('float')
  newValue: number;

  @Column()
  reason: string; // OBLIGATOIRE — jamais vide, vérifié côté serveur

  @CreateDateColumn()
  modifiedAt: Date;
}
