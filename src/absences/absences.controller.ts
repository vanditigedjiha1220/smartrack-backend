import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { Role } from '../entities/user.entity';
import { AbsencesService } from './absences.service';
import { RecordAttendanceDto, ApproveJustificationDto, ConfirmJustificationDto } from './dto/absence.dto';

@Controller('absences')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AbsencesController {
  constructor(private service: AbsencesService) {}

  // Aucun accès temporaire requis ici — volontairement différent de /grades.
  @Post('record')
  @Roles(Role.TEACHER)
  record(@CurrentUser() user: AuthenticatedUser, @Body() dto: RecordAttendanceDto) {
    return this.service.recordAttendance(user.userId, dto);
  }

  @Post('approve-justification')
  @Roles(Role.SUPERVISOR)
  approve(@CurrentUser() user: AuthenticatedUser, @Body() dto: ApproveJustificationDto) {
    return this.service.approveJustification(user.userId, dto);
  }

  @Post('confirm-justification')
  @Roles(Role.ADMIN)
  confirm(@CurrentUser() user: AuthenticatedUser, @Body() dto: ConfirmJustificationDto) {
    return this.service.confirmJustification(user.userId, dto);
  }

  @Get()
  @Roles(Role.SUPERVISOR)
  findAllSupervisor(@Query('classRoomId') classRoomId?: string, @Query('studentId') studentId?: string) {
    return this.service.findAllForSupervisor({ classRoomId, studentId });
  }

  @Get('admin')
  @Roles(Role.ADMIN)
  findAllAdmin(@Query('classRoomId') classRoomId?: string) {
    return this.service.findAllForAdmin({ classRoomId });
  }
}
