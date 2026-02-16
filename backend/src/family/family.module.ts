import { Module } from '@nestjs/common';
import { FamilyService } from './family.service';
import { FamilyController } from './family.controller';
import { FamilyAdminController, UserAdminController } from './family-admin.controller';
import { FamilyAdminService } from './family-admin.service';
import { ExportService } from './export.service';
import { SubscriptionModule } from '../subscription/subscription.module';

@Module({
  imports: [SubscriptionModule],
  controllers: [FamilyController, FamilyAdminController, UserAdminController],
  providers: [FamilyService, FamilyAdminService, ExportService],
  exports: [FamilyService],
})
export class FamilyModule {}
