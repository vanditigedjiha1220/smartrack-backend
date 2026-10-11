import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { AccessGrantsService } from '../access-grants/access-grants.service';

// Repasse automatiquement à "expired" tout accès temporaire dépassé, toutes les 5 minutes.
// C'est ce qui garantit qu'un enseignant ne peut PAS continuer à écrire après la fin
// de sa fenêtre, même si personne côté admin n'intervient manuellement.
@Injectable()
export class GrantExpirationTask {
  private logger = new Logger('GrantExpirationTask');

  constructor(private accessGrantsService: AccessGrantsService) {}

  @Cron(CronExpression.EVERY_5_MINUTES)
  async handleExpiration() {
    const count = await this.accessGrantsService.expireOutdatedGrants();
    if (count > 0) {
      this.logger.log(`${count} accès expiré(s) automatiquement`);
    }
  }
}
