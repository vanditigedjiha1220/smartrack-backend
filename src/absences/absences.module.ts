import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Absence } from '../entities/absence.entity';
import { SubjectAssignment } from '../entities/subject-assignment.entity';
import { Student } from '../entities/student.entity';
import { User } from '../entities/user.entity';
import { AbsencesService } from './absences.service';
import { AbsencesController } from './absences.controller';
import { AuthModule } from '../auth/auth.module';
import { RealtimeModule } from '../realtime/realtime.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Absence, SubjectAssignment, Student, User]),
    AuthModule,
    RealtimeModule,
  ],
  providers: [AbsencesService],
  controllers: [AbsencesController],
  exports: [AbsencesService],
})
export class AbsencesModule {}
