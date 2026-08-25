import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { WebhooksService } from './webhooks.service';
import { AuthGuard } from '@guards/auth.guard';
import { CurrentUser } from '@decorators/current-user.decorator';
import { WebhookEventType } from '@prisma/client';

@ApiTags('Webhooks')
@Controller('webhooks')
export class WebhooksController {
  constructor(private webhooksService: WebhooksService) {}

  // Public endpoint for YouTube webhook callbacks
  @Post('youtube/:channelId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Receive YouTube webhook (public endpoint)' })
  @ApiResponse({ status: 200, description: 'Webhook received' })
  async youtubeWebhook(
    @Param('channelId') channelId: string,
    @Body() payload: any,
    @Query('hub.mode') mode: string,
    @Query('hub.challenge') challenge: string,
  ) {
    // Handle PubSubHubbub verification
    if (mode === 'subscribe' && challenge) {
      return challenge;
    }

    // Process the webhook
    // In production, verify the webhook signature
    await this.webhooksService.handleYouTubeWebhook(
      channelId,
      WebhookEventType.COMMENT_CREATED, // Determine from payload
      payload.resourceId || '',
      payload,
    );

    return { received: true };
  }

  @Post('subscribe/:channelId')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Subscribe to YouTube webhooks for a channel' })
  @ApiResponse({ status: 200, description: 'Subscription initiated' })
  async subscribe(
    @CurrentUser('id') userId: string,
    @Param('channelId') channelId: string,
  ) {
    // Verify channel ownership
    // Get access token
    // Subscribe
    return { success: true, message: 'Webhook subscription initiated' };
  }

  @Post('unsubscribe/:channelId')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Unsubscribe from YouTube webhooks for a channel' })
  @ApiResponse({ status: 200, description: 'Unsubscribed successfully' })
  async unsubscribe(
    @CurrentUser('id') userId: string,
    @Param('channelId') channelId: string,
  ) {
    return { success: true, message: 'Webhook subscription removed' };
  }

  @Get('events/:channelId')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get webhook events for a channel' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'eventType', required: false, enum: WebhookEventType })
  @ApiQuery({ name: 'processed', required: false, type: Boolean })
  @ApiResponse({ status: 200, description: 'Webhook events retrieved successfully' })
  async getEvents(
    @CurrentUser('id') userId: string,
    @Param('channelId') channelId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('eventType') eventType?: WebhookEventType,
    @Query('processed') processed?: boolean,
  ) {
    return this.webhooksService.getWebhookEvents(channelId, {
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 50,
      eventType,
      processed,
    });
  }
}