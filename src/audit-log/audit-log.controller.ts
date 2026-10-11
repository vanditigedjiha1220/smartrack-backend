import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../entities/user.entity';
import { AuditLogService } from './audit-log.service';

@Controller('audit-log')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AuditLogController {
  constructor(private auditLogService: AuditLogService) {}

  // Superviseurs uniquement : historique complet, valeurs comprises.
  @Get('full')
  @Roles(Role.SUPERVISOR)
  findAllFull(@Query('studentId') studentId?: string, @Query('classRoomId') classRoomId?: string) {
    return this.auditLogService.findAllFull({ studentId, classRoomId });
  }

  // Admin uniquement : métadonnées (qui/quand/quelle salle), jamais les valeurs de notes.
  @Get('metadata')
  @Roles(Role.ADMIN)
  findAllMetadataOnly(@Query('classRoomId') classRoomId?: string) {
    return this.auditLogService.findAllMetadataOnly({ classRoomId });
  }
}
