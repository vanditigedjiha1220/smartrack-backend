import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';

import { User } from './entities/user.entity';
import { ClassRoom } from './entities/classroom.entity';
import { SubjectAssignment } from './entities/subject-assignment.entity';
import { Student } from './entities/student.entity';
import { AccessGrant } from './entities/access-grant.entity';
import { Grade, GradeModification } from './entities/grade.entity';
import { AuditLog } from './entities/audit-log.entity';
import { Bulletin } from './entities/bulletin.entity';
import { Absence } from './entities/absence.entity';

import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { ClassroomsModule } from './classrooms/classrooms.module';
import { AccessGrantsModule } from './access-grants/access-grants.module';
import { GradesModule } from './grades/grades.module';
import { AbsencesModule } from './absences/absences.module';
import { AuditLogModule } from './audit-log/audit-log.module';
import { BulletinsModule } from './bulletins/bulletins.module';
import { RealtimeModule } from './realtime/realtime.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    // Base de données locale — un fichier SQLite par établissement.
    // Pour un établissement plus grand, changer "type" en "postgres" et fournir
    // host/port/username/password/database ; aucun autre code n'a besoin de changer.
    TypeOrmModule.forRoot({
      type: 'better-sqlite3',
      database: process.env.DATABASE_PATH || 'dev.db',
      entities: [
        User,
        ClassRoom,
        SubjectAssignment,
        Student,
        AccessGrant,
        Grade,
        GradeModification,
        AuditLog,
        Bulletin,
        Absence,
      ],
      synchronize: true, // OK en développement ; utiliser des migrations en production
    }),
    AuthModule,
    UsersModule,
    ClassroomsModule,
    AccessGrantsModule,
    GradesModule,
    AbsencesModule,
    AuditLogModule,
    BulletinsModule,
    RealtimeModule,
  ],
})
export class AppModule {}
