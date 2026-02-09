import { Module } from '@nestjs/common';
import { TimeBankService } from './time-bank.service';
import { TimeBankController } from './time-bank.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [TimeBankController],
  providers: [TimeBankService],
  exports: [TimeBankService],
})
export class TimeBankModule {}
