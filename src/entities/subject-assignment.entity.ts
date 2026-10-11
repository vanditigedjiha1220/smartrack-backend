import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, Unique } from 'typeorm';
import { ClassRoom } from './classroom.entity';
import { User } from './user.entity';

export enum SubjectCategory {
  LITTERAIRE = 'LITTERAIRE',
  SCIENTIFIQUE = 'SCIENTIFIQUE',
  AUTRE = 'AUTRE',
}

// Une matière telle qu'enseignée dans UNE salle donnée : coefficient + enseignant assigné.
@Entity('subject_assignments')
@Unique(['classRoomId', 'name'])
export class SubjectAssignment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string; // ex: "Mathématiques"

  @Column({ type: 'varchar', default: SubjectCategory.AUTRE })
  category: SubjectCategory;

  @Column('float')
  coefficient: number;

  @Column()
  classRoomId: string;

  @ManyToOne(() => ClassRoom, { onDelete: 'CASCADE' })
  classRoom: ClassRoom;

  @Column()
  teacherId: string;

  @ManyToOne(() => User)
  teacher: User;
}
