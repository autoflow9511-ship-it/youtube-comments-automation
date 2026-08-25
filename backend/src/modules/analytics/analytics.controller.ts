import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { AnalyticsService } from './analytics.service';
import { AuthGuard } from '@guards/auth.guard';
import { CurrentUser } from '@decorators/current-user.decorator';

@ApiTags('Analytics')
@Controller('analytics')
@UseGuards(AuthGuard)
@ApiBearerAuth()
export class AnalyticsController {
  constructor(private analyticsService: AnalyticsService) {}

  @Get('dashboard')
  @ApiOperation({ summary: 'Get dashboard statistics' })
  @ApiResponse({ status: 200, description: 'Dashboard stats retrieved successfully' })
  async getDashboardStats(@CurrentUser('id') userId: string) {
    return this.analyticsService.getDashboardStats(userId);
  }

  @Get('automations')
  @ApiOperation({ summary: 'Get automation statistics' })
  @ApiQuery({ name: 'automationId', required: false, type: String })
  @ApiQuery({ name: 'days', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Automation stats retrieved successfully' })
  async getAutomationStats(
    @CurrentUser('id') userId: string,
    @Query('automationId') automationId?: string,
    @Query('days') days?: number,
  ) {
    return this.analyticsService.getAutomationStats(userId, automationId, days || 30);
  }

  @Get('emails')
  @ApiOperation({ summary: 'Get email statistics' })
  @ApiQuery({ name: 'days', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Email stats retrieved successfully' })
  async getEmailStats(
    @CurrentUser('id') userId: string,
    @Query('days') days?: number,
  ) {
    return this.analyticsService.getEmailStats(userId, days || 30);
  }

  @Get('channels/:channelId')
  @ApiOperation({ summary: 'Get channel analytics' })
  @ApiQuery({ name: 'days', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Channel analytics retrieved successfully' })
  async getChannelAnalytics(
    @CurrentUser('id') userId: string,
    @Param('channelId') channelId: string,
    @Query('days') days?: number,
  ) {
    return this.analyticsService.getChannelAnalytics(userId, channelId, days || 30);
  }

  @Post('track')
  @ApiOperation({ summary: 'Track custom event' })
  @ApiResponse({ status: 201, description: 'Event tracked successfully' })
  async trackEvent(
    @CurrentUser('id') userId: string,
    @Body() data: {
      channelId?: string;
      automationId?: string;
      eventType: string;
      eventData?: any;
      metadata?: any;
      sessionId?: string;
    },
  ) {
    return this.analyticsService.trackEvent(userId, data);
  }

  @Get('events')
  @ApiOperation({ summary: 'Get analytics events' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'eventType', required: false, type: String })
  @ApiQuery({ name: 'channelId', required: false, type: String })
  @ApiQuery({ name: 'automationId', required: false, type: String })
  @ApiQuery({ name: 'startDate', required: false, type: String })
  @ApiQuery({ name: 'endDate', required: false, type: String })
  @ApiResponse({ status: 200, description: 'Events retrieved successfully' })
  async getEvents(
    @CurrentUser('id') userId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('eventType') eventType?: string,
    @Query('channelId') channelId?: string,
    @Query('automationId') automationId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.analyticsService.getEvents(userId, {
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 50,
      eventType,
      channelId,
      automationId,
      startDate,
      endDate,
    });
  }
}