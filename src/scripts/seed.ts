import 'reflect-metadata';
import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User, Role } from '../entities/user.entity';
import { ClassRoom } from '../entities/classroom.entity';
import { SubjectAssignment } from '../entities/subject-assignment.entity';
import { Student } from '../entities/student.entity';
import { AccessGrant } from '../entities/access-grant.entity';
import { Grade, GradeModification } from '../entities/grade.entity';
import { AuditLog } from '../entities/audit-log.entity';
import { Bulletin } from '../entities/bulletin.entity';
import { Absence } from '../entities/absence.entity';

import { SubjectCategory } from '../entities/subject-assignment.entity';

// Usage : npm run seed
// Crée le tout premier compte ADMIN (impossible à créer via l'API, volontairement),
// plus un enseignant, un superviseur, une salle de démo avec une matière et deux élèves.
async function seed() {
  const dataSource = new DataSource({
    type: 'better-sqlite3',
    database: process.env.DATABASE_PATH || 'dev.db',
    entities: [User, ClassRoom, SubjectAssignment, Student, AccessGrant, Grade, GradeModification, AuditLog, Bulletin, Absence],
    synchronize: true,
  });

  await dataSource.initialize();
  console.log('Connexion à la base établie.');

  const userRepo = dataSource.getRepository(User);
  const classRepo = dataSource.getRepository(ClassRoom);
  const subjectRepo = dataSource.getRepository(SubjectAssignment);
  const studentRepo = dataSource.getRepository(Student);

  const existingAdmin = await userRepo.findOne({ where: { role: Role.ADMIN } });
  if (existingAdmin) {
    console.log('Un compte admin existe déjà — seed ignoré. Supprimez dev.db pour recommencer à zéro.');
    await dataSource.destroy();
    return;
  }

  const hash = (pw: string) => bcrypt.hash(pw, 12);

  const admin = await userRepo.save(
    userRepo.create({
      firstName: 'Admin',
      lastName: 'Principal',
      email: 'admin@lycee.cm',
      passwordHash: await hash('ChangeMoi123!'),
      role: Role.ADMIN,
    }),
  );

  const teacher = await userRepo.save(
    userRepo.create({
      firstName: 'Jean',
      lastName: 'Mbarga',
      email: 'jean.mbarga@lycee.cm',
      passwordHash: await hash('Enseignant123!'),
      role: Role.TEACHER,
    }),
  );

  const supervisor = await userRepo.save(
    userRepo.create({
      firstName: 'Marie',
      lastName: 'Fotso',
      email: 'proviseur@lycee.cm',
      passwordHash: await hash('Superviseur123!'),
      role: Role.SUPERVISOR,
    }),
  );

  const classRoom = await classRepo.save(
    classRepo.create({ name: '3e A', level: '3e', year: '2026-2027' }),
  );

  const subject = await subjectRepo.save(
    subjectRepo.create({
      name: 'Mathématiques',
      category: SubjectCategory.SCIENTIFIQUE,
      coefficient: 4,
      classRoomId: classRoom.id,
      teacherId: teacher.id,
    }),
  );

  await studentRepo.save([
    studentRepo.create({
      firstName: 'Paul',
      lastName: 'Nkeng',
      matricule: 'MAT001',
      classRoomId: classRoom.id,
    }),
    studentRepo.create({
      firstName: 'Aïcha',
      lastName: 'Bello',
      matricule: 'MAT002',
      classRoomId: classRoom.id,
    }),
  ]);

  console.log('\n=== Comptes créés ===');
  console.log('ADMIN       :', admin.email, '/ ChangeMoi123!');
  console.log('ENSEIGNANT  :', teacher.email, '/ Enseignant123!');
  console.log('SUPERVISEUR :', supervisor.email, '/ Superviseur123!');
  console.log('\nSalle "3e A" créée avec la matière "Mathématiques" (coef. 4) assignée à Jean Mbarga.');
  console.log('2 élèves ajoutés : Paul Nkeng, Aïcha Bello.');
  console.log('\n⚠️  Changez ces mots de passe immédiatement en production.');

  await dataSource.destroy();
}

seed().catch((err) => {
  console.error('Erreur de seed :', err);
  process.exit(1);
});
