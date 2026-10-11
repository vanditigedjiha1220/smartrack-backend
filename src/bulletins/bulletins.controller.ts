import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { Role } from '../entities/user.entity';
import { BulletinsService } from './bulletins.service';
import { GenerateBulletinsDto, SignBulletinDto } from './dto/bulletin.dto';

@Controller('bulletins')
@UseGuards(JwtAuthGuard, RolesGuard)
export class BulletinsController {
  constructor(private bulletinsService: BulletinsService) {}

  // Seul l'admin déclenche la génération — mais ne reçoit en retour que le résumé
  // (élève, moyenne, rang), jamais la grille de notes qui a servi au calcul.
  @Post('generate')
  @Roles(Role.ADMIN)
  generate(@CurrentUser() user: AuthenticatedUser, @Body() dto: GenerateBulletinsDto) {
    return this.bulletinsService.generateForClass(user.userId, dto.classRoomId, dto.term);
  }

  // Seul le superviseur peut signer — c'est lui qui porte l'appréciation finale.
  @Post(':id/sign')
  @Roles(Role.SUPERVISOR)
  sign(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: SignBulletinDto) {
    return this.bulletinsService.signBulletin(user.userId, id, dto.comment);
  }

  // Consultable par admin ET superviseur : c'est un document final déjà généré, pas une saisie.
  @Get()
  @Roles(Role.ADMIN, Role.SUPERVISOR)
  list(@Query('classRoomId') classRoomId: string, @Query('term') term: string) {
    return this.bulletinsService.listForClass(classRoomId, term);
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.SUPERVISOR)
  details(@Param('id') id: string) {
    return this.bulletinsService.getBulletinDetails(id);
  }
}
