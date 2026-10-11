import { IsEnum, IsNumber, IsString, Min } from 'class-validator';
import { SubjectCategory } from '../../entities/subject-assignment.entity';

export class CreateClassRoomDto {
  @IsString() name: string;
  @IsString() level: string;
  @IsString() year: string;
}

export class AddSubjectAssignmentDto {
  @IsString() name: string;
  @IsEnum(SubjectCategory) category: SubjectCategory;
  @IsNumber() @Min(0.1) coefficient: number;
  @IsString() teacherId: string;
}

export class AddStudentDto {
  @IsString() firstName: string;
  @IsString() lastName: string;
  @IsString() matricule: string;
}

export class SetPrincipalTeacherDto {
  @IsString() teacherId: string;
}
