import {
  Controller,
  Get,
  Put,
  Body,
  Param,
  UseGuards,
  Request,
  ForbiddenException,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { UserService } from './user.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Users')
@Controller('users')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class UserController {
  constructor(private userService: UserService) {}

  @Get(':id')
  @ApiOperation({ summary: 'Get user by ID (self or same family only)' })
  async getUser(@Param('id') id: string, @Request() req: any) {
    // Allow viewing own profile
    if (req.user.id === id) {
      return this.userService.findById(id);
    }

    // Allow viewing family members' profiles
    const targetUser = await this.userService.findById(id);
    if (!targetUser || targetUser.familyId !== req.user.familyId) {
      throw new ForbiddenException('Access denied');
    }

    return targetUser;
  }

  @Put('profile')
  @ApiOperation({ summary: 'Update own profile' })
  async updateProfile(
    @Request() req: any,
    @Body() body: { name?: string; avatarUrl?: string },
  ) {
    return this.userService.updateProfile(req.user.id, body);
  }
}
