import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne } from 'typeorm';
import { User } from './user.entity';

@Entity('classrooms')
export class ClassRoom {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string; // ex: "3e A"

  @Column()
  level: string;

  @Column()
  year: string; // année scolaire, ex "2026-2027"

  // Affiché sur l'en-tête du bulletin — un enseignant parmi ceux assignés à la salle,
  // désigné par l'admin (pas forcément lié à une matière en particulier).
  @Column({ nullable: true })
  principalTeacherId: string;

  @ManyToOne(() => User, { nullable: true })
  principalTeacher: User;

  @CreateDateColumn()
  createdAt: Date;
}
