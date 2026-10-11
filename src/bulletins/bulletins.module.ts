import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Bulletin } from '../entities/bulletin.entity';
import { Student } from '../entities/student.entity';
import { SubjectAssignment } from '../entities/subject-assignment.entity';
import { ClassRoom } from '../entities/classroom.entity';
import { BulletinsService } from './bulletins.service';
import { BulletinsController } from './bulletins.controller';
import { AuthModule } from '../auth/auth.module';
import { GradesModule } from '../grades/grades.module';
import { AbsencesModule } from '../absences/absences.module';
import { AuditLogModule } from '../audit-log/audit-log.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Bulletin, Student, SubjectAssignment, ClassRoom]),
    AuthModule,
    GradesModule,
    AbsencesModule,
    AuditLogModule,
  ],
  providers: [BulletinsService],
  controllers: [BulletinsController],
})
export class BulletinsModule {}
