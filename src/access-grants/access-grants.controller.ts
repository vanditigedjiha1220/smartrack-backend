import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { Role } from '../entities/user.entity';
import { AccessGrantsService } from './access-grants.service';
import { GrantAccessDto, RequestAccessDto } from './dto/access-grant.dto';

@Controller('access-grants')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AccessGrantsController {
  constructor(private service: AccessGrantsService) {}

  @Post('request')
  @Roles(Role.TEACHER)
  requestAccess(@CurrentUser() user: AuthenticatedUser, @Body() dto: RequestAccessDto) {
    return this.service.requestAccess(user.userId, dto);
  }

  @Post('grant')
  @Roles(Role.ADMIN)
  grantAccess(@CurrentUser() user: AuthenticatedUser, @Body() dto: GrantAccessDto) {
    return this.service.grantAccess(user.userId, dto);
  }

  @Post(':id/revoke')
  @Roles(Role.ADMIN)
  revokeAccess(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.service.revokeAccess(user.userId, id);
  }

  @Get('mine')
  @Roles(Role.TEACHER)
  myActiveGrants(@CurrentUser() user: AuthenticatedUser) {
    return this.service.findActiveForTeacher(user.userId);
  }

  @Get()
  @Roles(Role.ADMIN)
  findAll() {
    return this.service.findAllForAdmin();
  }
}
