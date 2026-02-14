import { Module } from '@nestjs/common';
import { FamilyService } from './family.service';
import { FamilyController } from './family.controller';
import { ExportService } from './export.service';
import { SubscriptionModule } from '../subscription/subscription.module';

@Module({
  imports: [SubscriptionModule],
  controllers: [FamilyController],
  providers: [FamilyService, ExportService],
  exports: [FamilyService],
})
export class FamilyModule {}
