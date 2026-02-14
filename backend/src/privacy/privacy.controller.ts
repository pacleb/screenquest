import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  Request,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard, Roles } from '../auth/guards/roles.guard';
import { ConsentService } from './consent.service';
import { DeletionService } from './deletion.service';
import { PolicyService } from './policy.service';
import { RequestDeletionDto, AcceptPolicyDto } from './dto/privacy.dto';

@ApiTags('Privacy')
@Controller('privacy')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class PrivacyController {
  constructor(
    private consentService: ConsentService,
    private deletionService: DeletionService,
    private policyService: PolicyService,
  ) {}

  // --- Consent ---

  @Post('consent/:childId')
  @Roles('parent', 'guardian')
  @ApiOperation({ summary: 'Record parental consent for an existing child' })
  async createConsent(
    @Param('childId') childId: string,
    @Body('consentText') consentText: string,
    @Request() req: any,
  ) {
    const ipAddress =
      (req.headers['x-forwarded-for'] as string)?.split(',')[0] ||
      req.ip ||
      null;
    return this.consentService.createConsent(
      childId,
      req.user.id,
      consentText,
      ipAddress,
    );
  }

  @Get('consent/:childId')
  @Roles('parent', 'guardian')
  @ApiOperation({ summary: 'Get consent status for a child' })
  async getConsent(@Param('childId') childId: string, @Request() req: any) {
    return this.consentService.getConsentForChild(childId, req.user.id);
  }

  @Post('consent/:childId/revoke')
  @Roles('parent')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Revoke parental consent (schedules child deletion)' })
  async revokeConsent(
    @Param('childId') childId: string,
    @Request() req: any,
  ) {
    return this.consentService.revokeConsent(childId, req.user.id);
  }

  // --- Account Deletion ---

  @Delete('account')
  @ApiOperation({ summary: 'Request account deletion (30-day grace period)' })
  async requestDeletion(@Request() req: any, @Body() dto: RequestDeletionDto) {
    return this.deletionService.requestDeletion(req.user.id, dto);
  }

  @Post('account/cancel-deletion')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancel pending account deletion' })
  async cancelDeletion(@Request() req: any) {
    return this.deletionService.cancelDeletion(req.user.id);
  }

  @Get('account/deletion-status')
  @ApiOperation({ summary: 'Check account deletion status' })
  async getDeletionStatus(@Request() req: any) {
    return this.deletionService.getDeletionStatus(req.user.id);
  }

  // --- Policy ---

  @Post('policy/accept')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Accept privacy policy or terms of service' })
  async acceptPolicy(@Request() req: any, @Body() dto: AcceptPolicyDto) {
    const ipAddress =
      (req.headers['x-forwarded-for'] as string)?.split(',')[0] ||
      req.ip ||
      null;
    return this.policyService.acceptPolicy(req.user.id, dto, ipAddress);
  }

  @Get('policy/acceptances')
  @ApiOperation({ summary: 'List all policy acceptances for current user' })
  async getAcceptances(@Request() req: any) {
    return this.policyService.getUserAcceptances(req.user.id);
  }
}
