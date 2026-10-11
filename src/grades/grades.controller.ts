import { Body, Controller, Get, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { Role } from '../entities/user.entity';
import { GradesService } from './grades.service';
import { CreateGradeDto, ModifyGradeDto } from './dto/grade.dto';

// AUCUNE route de ce contrôleur n'autorise Role.ADMIN — c'est la traduction directe
// de la matrice de permissions : l'admin ne doit techniquement avoir aucun moyen
// de lire ou écrire une valeur de note via cette API.
@Controller('grades')
@UseGuards(JwtAuthGuard, RolesGuard)
export class GradesController {
  constructor(private gradesService: GradesService) {}

  @Post()
  @Roles(Role.TEACHER)
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateGradeDto) {
    return this.gradesService.create(user.userId, dto);
  }

  @Put(':id')
  @Roles(Role.TEACHER)
  modify(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: ModifyGradeDto,
  ) {
    return this.gradesService.modify(user.userId, id, dto);
  }

  // Un enseignant ne voit que ce qu'il a lui-même saisi.
  @Get('mine')
  @Roles(Role.TEACHER)
  findMine(
    @CurrentUser() user: AuthenticatedUser,
    @Query('classRoomId') classRoomId: string,
    @Query('subjectAssignmentId') subjectAssignmentId: string,
  ) {
    return this.gradesService.findByTeacherAndClass(user.userId, classRoomId, subjectAssignmentId);
  }

  // Vue complète réservée au superviseur (proviseur, surveillants).
  @Get()
  @Roles(Role.SUPERVISOR)
  findAll(@Query('classRoomId') classRoomId?: string, @Query('studentId') studentId?: string) {
    return this.gradesService.findAllForSupervisor({ classRoomId, studentId });
  }
}
