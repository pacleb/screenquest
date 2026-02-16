import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';
import { FamilyAdminService } from './family-admin.service';
import { ListFamiliesQueryDto, ListUsersQueryDto } from './dto/family-admin.dto';

@ApiTags('Admin — Families')
@Controller('admin/families')
@UseGuards(JwtAuthGuard, AdminGuard)
@ApiBearerAuth()
export class FamilyAdminController {
  constructor(private adminService: FamilyAdminService) {}

  @Get()
  @ApiOperation({ summary: 'List all families (admin, paginated)' })
  async listAll(@Query() query: ListFamiliesQueryDto) {
    return this.adminService.listFamilies(query);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get family & user aggregate stats' })
  async getStats() {
    return this.adminService.getFamilyStats();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single family with members' })
  async getOne(@Param('id') id: string) {
    return this.adminService.getFamilyById(id);
  }
}

@ApiTags('Admin — Users')
@Controller('admin/users')
@UseGuards(JwtAuthGuard, AdminGuard)
@ApiBearerAuth()
export class UserAdminController {
  constructor(private adminService: FamilyAdminService) {}

  @Get()
  @ApiOperation({ summary: 'List all users (admin, paginated)' })
  async listAll(@Query() query: ListUsersQueryDto) {
    return this.adminService.listUsers(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single user' })
  async getOne(@Param('id') id: string) {
    return this.adminService.getUserById(id);
  }
}
