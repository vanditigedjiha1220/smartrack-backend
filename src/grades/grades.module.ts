import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Grade, GradeModification } from '../entities/grade.entity';
import { Student } from '../entities/student.entity';
import { SubjectAssignment } from '../entities/subject-assignment.entity';
import { User } from '../entities/user.entity';
import { GradesService } from './grades.service';
import { GradesController } from './grades.controller';
import { AuthModule } from '../auth/auth.module';
import { AccessGrantsModule } from '../access-grants/access-grants.module';
import { AuditLogModule } from '../audit-log/audit-log.module';
import { RealtimeModule } from '../realtime/realtime.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Grade, GradeModification, Student, SubjectAssignment, User]),
    AuthModule,
    AccessGrantsModule,
    AuditLogModule,
    RealtimeModule,
  ],
  providers: [GradesService],
  controllers: [GradesController],
  exports: [GradesService],
})
export class GradesModule {}
