import { Module } from '@nestjs/common';
import { PrivacyController } from './privacy.controller';
import { ConsentService } from './consent.service';
import { DeletionService } from './deletion.service';
import { DeletionScheduler } from './deletion.scheduler';
import { PolicyService } from './policy.service';
import { MailModule } from '../mail/mail.module';

@Module({
  imports: [MailModule],
  controllers: [PrivacyController],
  providers: [ConsentService, DeletionService, DeletionScheduler, PolicyService],
  exports: [ConsentService, DeletionService, PolicyService],
})
export class PrivacyModule {}
