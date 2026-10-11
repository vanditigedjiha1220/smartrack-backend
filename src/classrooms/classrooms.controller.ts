import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../entities/user.entity';
import { ClassroomsService } from './classrooms.service';
import {
  CreateClassRoomDto,
  AddSubjectAssignmentDto,
  AddStudentDto,
  SetPrincipalTeacherDto,
} from './dto/classroom.dto';

@Controller('classrooms')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ClassroomsController {
  constructor(private classroomsService: ClassroomsService) {}

  @Post()
  @Roles(Role.ADMIN)
  create(@Body() dto: CreateClassRoomDto) {
    return this.classroomsService.create(dto);
  }

  // Lecture ouverte à tous les rôles authentifiés : la structure (salles/matières/élèves)
  // n'est pas une donnée sensible en soi — seules les VALEURS de notes le sont.
  @Get()
  findAll() {
    return this.classroomsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.classroomsService.findOneWithDetails(id);
  }

  @Post(':id/subjects')
  @Roles(Role.ADMIN)
  addSubject(@Param('id') id: string, @Body() dto: AddSubjectAssignmentDto) {
    return this.classroomsService.addSubjectAssignment(id, dto);
  }

  @Post(':id/students')
  @Roles(Role.ADMIN)
  addStudent(@Param('id') id: string, @Body() dto: AddStudentDto) {
    return this.classroomsService.addStudent(id, dto);
  }

  @Patch(':id/principal-teacher')
  @Roles(Role.ADMIN)
  setPrincipalTeacher(@Param('id') id: string, @Body() dto: SetPrincipalTeacherDto) {
    return this.classroomsService.setPrincipalTeacher(id, dto);
  }
}
