import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm';
import { ClassRoom } from './classroom.entity';

@Entity('students')
export class Student {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  firstName: string;

  @Column()
  lastName: string;

  @Column({ unique: true })
  matricule: string;

  @Column()
  classRoomId: string;

  @ManyToOne(() => ClassRoom, { onDelete: 'CASCADE' })
  classRoom: ClassRoom;
}
