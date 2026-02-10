import { Module } from '@nestjs/common';
import { ViolationService } from './violation.service';
import { ViolationController } from './violation.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { TimeBankModule } from '../time-bank/time-bank.module';

@Module({
  imports: [PrismaModule, TimeBankModule],
  controllers: [ViolationController],
  providers: [ViolationService],
  exports: [ViolationService],
})
export class ViolationModule {}
