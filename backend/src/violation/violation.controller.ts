import {
  Controller,
  Get,
  Post,
  Put,
  Param,
  Body,
  Request,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ViolationService } from './violation.service';
import { RecordViolationDto } from './dto/violation.dto';

@Controller()
@UseGuards(AuthGuard('jwt'))
export class ViolationController {
  constructor(private violationService: ViolationService) {}

  @Post('children/:childId/violations')
  recordViolation(
    @Param('childId') childId: string,
    @Body() dto: RecordViolationDto,
    @Request() req: any,
  ) {
    return this.violationService.recordViolation(childId, req.user.sub, dto);
  }

  @Get('children/:childId/violations')
  listViolations(@Param('childId') childId: string, @Request() req: any) {
    return this.violationService.listViolations(childId, req.user.sub);
  }

  @Post('children/:childId/violations/reset')
  resetCounter(@Param('childId') childId: string, @Request() req: any) {
    return this.violationService.resetCounter(childId, req.user.sub);
  }

  @Get('children/:childId/violation-status')
  getViolationStatus(@Param('childId') childId: string, @Request() req: any) {
    return this.violationService.getViolationStatus(childId, req.user.sub);
  }

  @Put('violations/:violationId/forgive')
  forgiveViolation(@Param('violationId') violationId: string, @Request() req: any) {
    return this.violationService.forgiveViolation(violationId, req.user.sub);
  }
}
