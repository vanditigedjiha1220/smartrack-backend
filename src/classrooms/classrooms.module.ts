import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClassRoom } from '../entities/classroom.entity';
import { SubjectAssignment } from '../entities/subject-assignment.entity';
import { Student } from '../entities/student.entity';
import { User } from '../entities/user.entity';
import { ClassroomsService } from './classrooms.service';
import { ClassroomsController } from './classrooms.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [TypeOrmModule.forFeature([ClassRoom, SubjectAssignment, Student, User]), AuthModule],
  providers: [ClassroomsService],
  controllers: [ClassroomsController],
  exports: [ClassroomsService],
})
export class ClassroomsModule {}
