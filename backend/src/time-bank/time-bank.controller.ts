import {
  Controller,
  Get,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
} from '@nestjs/swagger';
import { TimeBankService } from './time-bank.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Time Bank')
@Controller('children/:childId/time-bank')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class TimeBankController {
  constructor(private timeBankService: TimeBankService) {}

  @Get()
  @ApiOperation({ summary: 'Get time bank balance for a child' })
  async getBalance(
    @Param('childId') childId: string,
    @Request() req: any,
  ) {
    return this.timeBankService.getBalance(childId, req.user.id);
  }
}
