import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';
import { QuestLibraryAdminService } from './quest-library-admin.service';
import {
  CreateLibraryQuestDto,
  UpdateLibraryQuestDto,
  ReorderQuestsDto,
  BulkImportDto,
  ListLibraryQuestsQueryDto,
  CreateCategoryDto,
  UpdateCategoryDto,
  ReorderCategoriesDto,
} from './dto/quest-library-admin.dto';

@ApiTags('Admin — Quest Library')
@Controller('admin/quest-library')
@UseGuards(JwtAuthGuard, AdminGuard)
@ApiBearerAuth()
export class QuestLibraryAdminController {
  constructor(private adminService: QuestLibraryAdminService) {}

  // ─── Quest Library ──────────────────────────────────────────

  @Get()
  @ApiOperation({ summary: 'List all library quests (admin, paginated)' })
  async listAll(@Query() query: ListLibraryQuestsQueryDto) {
    return this.adminService.listAll(query);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get quest library usage stats' })
  async getStats() {
    return this.adminService.getStats();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single library quest' })
  async getOne(@Param('id') id: string) {
    return this.adminService.getById(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new library quest' })
  async create(@Body() dto: CreateLibraryQuestDto) {
    return this.adminService.create(dto);
  }

  @Put('reorder')
  @ApiOperation({ summary: 'Reorder library quests' })
  async reorder(@Body() dto: ReorderQuestsDto) {
    return this.adminService.reorder(dto.ids);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a library quest' })
  async update(@Param('id') id: string, @Body() dto: UpdateLibraryQuestDto) {
    return this.adminService.update(id, dto);
  }

  @Put(':id/publish')
  @ApiOperation({ summary: 'Publish a library quest' })
  async publish(@Param('id') id: string) {
    return this.adminService.publish(id);
  }

  @Put(':id/unpublish')
  @ApiOperation({ summary: 'Unpublish a library quest' })
  async unpublish(@Param('id') id: string) {
    return this.adminService.unpublish(id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a library quest' })
  async remove(@Param('id') id: string) {
    return this.adminService.remove(id);
  }

  @Post('bulk-import')
  @ApiOperation({ summary: 'Bulk import library quests from CSV data' })
  async bulkImport(@Body() dto: BulkImportDto) {
    return this.adminService.bulkImport(dto.rows);
  }
}

@ApiTags('Admin — Categories')
@Controller('admin/categories')
@UseGuards(JwtAuthGuard, AdminGuard)
@ApiBearerAuth()
export class QuestCategoryAdminController {
  constructor(private adminService: QuestLibraryAdminService) {}

  @Get()
  @ApiOperation({ summary: 'List all quest categories' })
  async list() {
    return this.adminService.listCategories();
  }

  @Post()
  @ApiOperation({ summary: 'Create a category' })
  async create(@Body() dto: CreateCategoryDto) {
    return this.adminService.createCategory(dto);
  }

  @Put('reorder')
  @ApiOperation({ summary: 'Reorder categories' })
  async reorder(@Body() dto: ReorderCategoriesDto) {
    return this.adminService.reorderCategories(dto.ids);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a category' })
  async update(@Param('id') id: string, @Body() dto: UpdateCategoryDto) {
    return this.adminService.updateCategory(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a category' })
  async remove(@Param('id') id: string) {
    return this.adminService.removeCategory(id);
  }
}
