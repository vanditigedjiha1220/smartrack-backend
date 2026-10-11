import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

export enum Role {
  ADMIN = 'ADMIN',
  TEACHER = 'TEACHER',
  SUPERVISOR = 'SUPERVISOR',
}

// Compte utilisateur générique (admin, enseignant ou superviseur).
// L'appartenance au rôle détermine strictement ce que le middleware d'autorisation permet.
// Un compte ADMIN ne doit JAMAIS pouvoir lire une valeur de note — voir GradesController.
@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  firstName: string;

  @Column()
  lastName: string;

  @Column({ unique: true })
  email: string;

  @Column()
  passwordHash: string;

  @Column({ type: 'varchar' })
  role: Role;

  // Vrai tant que le titulaire n'a pas remplacé le mot de passe temporaire
  // communiqué par l'admin à la création du compte. Tant que c'est vrai,
  // JwtAuthGuard bloque toutes les routes sauf POST /auth/change-password —
  // l'admin connaît ce mot de passe temporaire, il ne doit donc jamais permettre
  // d'agir ailleurs dans l'application (ex: écrire des notes en se faisant passer
  // pour l'enseignant).
  @Column({ default: true })
  mustChangePassword: boolean;

  // Horodatage du dernier changement de mot de passe volontaire (audit / support).
  // Type explicite requis : TypeORM ne peut pas déduire "Object" (Date | null)
  // automatiquement pour better-sqlite3.
  @Column({ type: 'datetime', nullable: true })
  passwordChangedAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;
}