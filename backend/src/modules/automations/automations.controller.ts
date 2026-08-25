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
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';
import { AutomationEngineService } from './services/automation-engine.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { 
  CreateAutomationDto, 
  UpdateAutomationDto, 
  TriggerAutomationDto,
  AutomationResponseDto,
  AutomationExecutionResponseDto,
  ActionExecutionResponseDto,
} from './dto/automation.dto';
import { AutomationStatus, TriggerType } from '@prisma/client';

@ApiTags('Automations')
@Controller('automations')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AutomationsController {
  constructor(private automationEngine: AutomationEngineService) {}

  @Get()
  @ApiOperation({ 
    summary: 'Get all automations for user',
    description: 'Retrieves all automations with pagination and filtering.'
  })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number (default 1)' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page (default 20, max 100)' })
  @ApiQuery({ name: 'status', required: false, enum: AutomationStatus, description: 'Filter by status' })
  @ApiQuery({ name: 'channelId', required: false, type: String, description: 'Filter by channel ID' })
  @ApiResponse({ status: 200, description: 'List of automations' })
  async getAutomations(
    @CurrentUser('id') userId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('status') status?: AutomationStatus,
    @Query('channelId') channelId?: string,
  ) {
    const take = Math.min(limit || 20, 100);
    const skip = ((page || 1) - 1) * take;

    const where: any = { userId, deletedAt: null };
    if (status) where.status = status;
    if (channelId) where.channelId = channelId;

    const [automations, total] = await Promise.all([
      this.prisma.automation.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: { 
          actions: { orderBy: { order: 'asc' } },
          channel: { select: { id: true, title: true, thumbnailUrl: true } },
        },
      }),
      this.prisma.automation.count({ where }),
    ]);

    return {
      data: automations,
      meta: { total, page: page || 1, limit: take, totalPages: Math.ceil(total / take) },
    };
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ 
    summary: 'Create a new automation',
    description: 'Creates a new automation rule with trigger and actions.'
  })
  @ApiResponse({ status: 201, description: 'Automation created successfully', type: AutomationResponseDto })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 404, description: 'Channel not found' })
  async createAutomation(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateAutomationDto,
  ) {
    return this.automationEngine.createAutomation({ userId, ...dto });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get automation by ID' })
  @ApiParam({ name: 'id', description: 'Automation ID' })
  @ApiResponse({ status: 200, description: 'Automation details', type: AutomationResponseDto })
  @ApiResponse({ status: 404, description: 'Automation not found' })
  async getAutomation(@CurrentUser('id') userId: string, @Param('id') id: string) {
    const automation = await this.prisma.automation.findFirst({
      where: { id, userId, deletedAt: null },
      include: { 
        actions: { orderBy: { order: 'asc' } },
        channel: { select: { id: true, title: true, thumbnailUrl: true } },
      },
    });

    if (!automation) {
      throw new NotFoundException('Automation not found');
    }

    return automation;
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update automation' })
  @ApiParam({ name: 'id', description: 'Automation ID' })
  @ApiResponse({ status: 200, description: 'Automation updated successfully', type: AutomationResponseDto })
  @ApiResponse({ status: 404, description: 'Automation not found' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  async updateAutomation(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() dto: UpdateAutomationDto,
  ) {
    return this.automationEngine.updateAutomation(id, userId, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete automation' })
  @ApiParam({ name: 'id', description: 'Automation ID' })
  @ApiResponse({ status: 200, description: 'Automation deleted successfully' })
  @ApiResponse({ status: 404, description: 'Automation not found' })
  async deleteAutomation(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.automationEngine.deleteAutomation(id, userId);
  }

  @Post(':id/duplicate')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Duplicate automation' })
  @ApiParam({ name: 'id', description: 'Automation ID' })
  @ApiResponse({ status: 201, description: 'Automation duplicated successfully', type: AutomationResponseDto })
  @ApiResponse({ status: 404, description: 'Automation not found' })
  async duplicateAutomation(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.automationEngine.duplicateAutomation(id, userId);
  }

  @Post(':id/trigger')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ 
    summary: 'Manually trigger automation',
    description: 'Manually triggers an automation with custom trigger data for testing.'
  })
  @ApiParam({ name: 'id', description: 'Automation ID' })
  @ApiResponse({ status: 201, description: 'Automation triggered successfully' })
  @ApiResponse({ status: 404, description: 'Automation not found' })
  async triggerAutomation(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() dto: TriggerAutomationDto,
  ) {
    return this.automationEngine.triggerAutomationManually(id, dto.triggerData);
  }

  @Get(':id/executions')
  @ApiOperation({ summary: 'Get automation execution history' })
  @ApiParam({ name: 'id', description: 'Automation ID' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false, enum: ['pending', 'running', 'completed', 'failed'] })
  @ApiResponse({ status: 200, description: 'Execution history' })
  async getExecutions(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('status') status?: string,
  ) {
    return this.automationEngine.getAutomationExecutions(id, userId, { page, limit, status });
  }

  @Get(':id/executions/:executionId')
  @ApiOperation({ summary: 'Get execution details' })
  @ApiParam({ name: 'id', description: 'Automation ID' })
  @ApiParam({ name: 'executionId', description: 'Execution ID' })
  @ApiResponse({ status: 200, description: 'Execution details with action logs' })
  async getExecution(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Param('executionId') executionId: string,
  ) {
    const execution = await this.prisma.automationExecution.findFirst({
      where: { id: executionId, automationId: id },
      include: { actions: { include: { action: true } } },
    });

    if (!execution) {
      throw new NotFoundException('Execution not found');
    }

    return execution;
  }

  @Get(':id/stats')
  @ApiOperation({ summary: 'Get automation statistics' })
  @ApiParam({ name: 'id', description: 'Automation ID' })
  @ApiQuery({ name: 'days', required: false, type: Number, description: 'Time period in days (default 30)' })
  @ApiResponse({ status: 200, description: 'Automation statistics' })
  async getStats(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Query('days') days?: number,
  ) {
    const automation = await this.prisma.automation.findFirst({
      where: { id, userId, deletedAt: null },
    });

    if (!automation) {
      throw new NotFoundException('Automation not found');
    }

    const startDate = new Date(Date.now() - (days || 30) * 24 * 60 * 60 * 1000);

    const executions = await this.prisma.automationExecution.findMany({
      where: {
        automationId: id,
        startedAt: { gte: startDate },
      },
      select: { status: true, startedAt: true, completedAt: true },
    });

    const total = executions.length;
    const successful = executions.filter(e => e.status === 'completed').length;
    const failed = executions.filter(e => e.status === 'failed').length;
    const pending = executions.filter(e => e.status === 'pending' || e.status === 'running').length;

    const byDay: Record<string, { total: number; successful: number; failed: number }> = {};
    executions.forEach(e => {
      const day = e.startedAt.toISOString().split('T')[0];
      if (!byDay[day]) byDay[day] = { total: 0, successful: 0, failed: 0 };
      byDay[day].total++;
      if (e.status === 'completed') byDay[day].successful++;
      if (e.status === 'failed') byDay[day].failed++;
    });

    return {
      total,
      successful,
      failed,
      pending,
      successRate: total > 0 ? (successful / total) * 100 : 0,
      byDay: Object.entries(byDay).map(([date, stats]) => ({ date, ...stats })),
    };
  }
}