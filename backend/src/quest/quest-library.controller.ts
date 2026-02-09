import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
} from '@nestjs/swagger';
import { QuestService } from './quest.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Quest Library')
@Controller('quest-library')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class QuestLibraryController {
  constructor(private questService: QuestService) {}

  @Get()
  @ApiOperation({ summary: 'List all published quest library entries' })
  @ApiQuery({ name: 'category', required: false })
  async findAll(@Query('category') category?: string) {
    return this.questService.getLibraryQuests(category);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single quest library entry' })
  async findOne(@Param('id') id: string) {
    return this.questService.getLibraryQuest(id);
  }
}
