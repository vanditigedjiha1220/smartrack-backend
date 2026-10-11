import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AccessGrant } from '../entities/access-grant.entity';
import { ClassRoom } from '../entities/classroom.entity';
import { SubjectAssignment } from '../entities/subject-assignment.entity';
import { User } from '../entities/user.entity';
import { AccessGrantsService } from './access-grants.service';
import { AccessGrantsController } from './access-grants.controller';
import { GrantExpirationTask } from './grant-expiration.task';
import { AuthModule } from '../auth/auth.module';
import { AuditLogModule } from '../audit-log/audit-log.module';
import { RealtimeModule } from '../realtime/realtime.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([AccessGrant, ClassRoom, SubjectAssignment, User]),
    AuthModule,
    AuditLogModule,
    RealtimeModule,
  ],
  providers: [AccessGrantsService, GrantExpirationTask],
  controllers: [AccessGrantsController],
  exports: [AccessGrantsService],
})
export class AccessGrantsModule {}
