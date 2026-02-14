import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  ForbiddenException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import { FamilyService } from './family.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard, Roles } from '../auth/guards/roles.guard';
import {
  CreateFamilyDto,
  JoinFamilyDto,
  InviteMemberDto,
  CreateChildDto,
  UpdateChildDto,
  UpdateFamilyDto,
  UpdateGuardianPermissionsDto,
} from './dto/family.dto';

@ApiTags('Families')
@Controller('families')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class FamilyController {
  constructor(private familyService: FamilyService) {}

  @Post()
  @Roles('parent')
  @ApiOperation({ summary: 'Create a new family' })
  @ApiResponse({ status: 201, description: 'Family created' })
  async createFamily(@Request() req: any, @Body() dto: CreateFamilyDto) {
    return this.familyService.createFamily(req.user.id, dto);
  }

  @Post('join')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Join a family via family code' })
  async joinFamily(@Request() req: any, @Body() dto: JoinFamilyDto) {
    return this.familyService.joinFamily(req.user.id, dto.familyCode);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get family details' })
  async getFamily(@Param('id') id: string, @Request() req: any) {
    this.ensureFamilyAccess(req.user.familyId, id);
    return this.familyService.getFamily(id);
  }

  @Get(':id/members')
  @ApiOperation({ summary: 'List family members' })
  async getMembers(@Param('id') id: string, @Request() req: any) {
    this.ensureFamilyAccess(req.user.familyId, id);
    return this.familyService.getMembers(id, req.user.role);
  }

  @Post(':id/invite')
  @Roles('parent', 'guardian')
  @ApiOperation({ summary: 'Invite a member to the family' })
  async inviteMember(
    @Param('id') id: string,
    @Request() req: any,
    @Body() dto: InviteMemberDto,
  ) {
    this.ensureFamilyAccess(req.user.familyId, id);
    return this.familyService.inviteMember(id, req.user.id, dto.email);
  }

  @Post(':id/children')
  @Roles('parent', 'guardian')
  @ApiOperation({ summary: 'Add a child to the family' })
  async createChild(
    @Param('id') id: string,
    @Request() req: any,
    @Body() dto: CreateChildDto,
  ) {
    this.ensureFamilyAccess(req.user.familyId, id);
    const ipAddress =
      (req.headers['x-forwarded-for'] as string)?.split(',')[0] ||
      req.ip ||
      null;
    return this.familyService.createChild(id, req.user.id, dto, ipAddress);
  }

  @Put(':id/children/:childId')
  @Roles('parent', 'guardian')
  @ApiOperation({ summary: 'Update child profile' })
  async updateChild(
    @Param('id') id: string,
    @Param('childId') childId: string,
    @Request() req: any,
    @Body() dto: UpdateChildDto,
  ) {
    this.ensureFamilyAccess(req.user.familyId, id);
    return this.familyService.updateChild(id, childId, dto);
  }

  @Delete(':id/children/:childId')
  @Roles('parent', 'guardian')
  @ApiOperation({ summary: 'Remove child from family' })
  async removeChild(
    @Param('id') id: string,
    @Param('childId') childId: string,
    @Request() req: any,
  ) {
    this.ensureFamilyAccess(req.user.familyId, id);
    return this.familyService.removeChild(id, childId);
  }

  @Put(':id/members/:userId/role')
  @Roles('parent')
  @ApiOperation({ summary: 'Change member role (owner only)' })
  async updateMemberRole(
    @Param('id') id: string,
    @Param('userId') userId: string,
    @Request() req: any,
    @Body('role') role: string,
  ) {
    this.ensureFamilyAccess(req.user.familyId, id);
    return this.familyService.updateMemberRole(id, userId, role, req.user.id);
  }

  @Delete(':id/members/:userId')
  @Roles('parent')
  @ApiOperation({ summary: 'Remove member from family (owner only)' })
  async removeMember(
    @Param('id') id: string,
    @Param('userId') userId: string,
    @Request() req: any,
  ) {
    this.ensureFamilyAccess(req.user.familyId, id);
    return this.familyService.removeMember(id, userId, req.user.id);
  }

  @Put(':id')
  @Roles('parent')
  @ApiOperation({ summary: 'Update family name/settings (owner only)' })
  async updateFamily(
    @Param('id') id: string,
    @Request() req: any,
    @Body() dto: UpdateFamilyDto,
  ) {
    this.ensureFamilyAccess(req.user.familyId, id);
    return this.familyService.updateFamily(id, req.user.id, dto);
  }

  @Post(':id/transfer-ownership')
  @Roles('parent')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Transfer family ownership' })
  async transferOwnership(
    @Param('id') id: string,
    @Request() req: any,
    @Body('newOwnerId') newOwnerId: string,
  ) {
    this.ensureFamilyAccess(req.user.familyId, id);
    return this.familyService.transferOwnership(id, newOwnerId, req.user.id);
  }

  @Get(':id/members/:userId/permissions')
  @Roles('parent')
  @ApiOperation({ summary: 'Get guardian permissions' })
  async getGuardianPermissions(
    @Param('id') id: string,
    @Param('userId') userId: string,
    @Request() req: any,
  ) {
    this.ensureFamilyAccess(req.user.familyId, id);
    return this.familyService.getGuardianPermissions(id, userId);
  }

  @Put(':id/members/:userId/permissions')
  @Roles('parent')
  @ApiOperation({ summary: 'Update guardian permissions (owner only)' })
  async updateGuardianPermissions(
    @Param('id') id: string,
    @Param('userId') userId: string,
    @Request() req: any,
    @Body() dto: UpdateGuardianPermissionsDto,
  ) {
    this.ensureFamilyAccess(req.user.familyId, id);
    return this.familyService.updateGuardianPermissions(id, userId, req.user.id, dto);
  }

  private ensureFamilyAccess(userFamilyId: string | null, requestedFamilyId: string) {
    if (userFamilyId !== requestedFamilyId) {
      throw new ForbiddenException('Access denied');
    }
  }
}
