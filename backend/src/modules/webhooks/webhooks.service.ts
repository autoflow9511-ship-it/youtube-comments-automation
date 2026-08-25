import { Injectable } from '@nestjs/common';
import { PrismaService } from '@database/prisma.service';
import { WebhookEventType } from '@prisma/client';
import { google } from 'googleapis';

@Injectable()
export class WebhooksService {
  constructor(private prisma: PrismaService) {}

  async handleYouTubeWebhook(channelId: string, eventType: WebhookEventType, resourceId: string, payload: any) {
    // Store webhook event
    const event = await this.prisma.webhookEvent.create({
      data: {
        channelId,
        eventType,
        resourceId,
        payload,
      },
    });

    // Process based on event type
    switch (eventType) {
      case WebhookEventType.COMMENT_CREATED:
        await this.processNewComment(channelId, resourceId, payload);
        break;
      case WebhookEventType.VIDEO_UPLOADED:
        await this.processNewVideo(channelId, resourceId, payload);
        break;
      // Add more handlers as needed
    }

    // Mark as processed
    await this.prisma.webhookEvent.update({
      where: { id: event.id },
      data: { processed: true, processedAt: new Date() },
    });

    return event;
  }

  private async processNewComment(channelId: string, commentId: string, payload: any) {
    // This would fetch the comment details from YouTube API
    // and check against automation triggers
    // For now, just log
    console.log(`New comment on channel ${channelId}: ${commentId}`);
  }

  private async processNewVideo(channelId: string, videoId: string, payload: any) {
    console.log(`New video on channel ${channelId}: ${videoId}`);
  }

  async subscribeToChannel(channelId: string, accessToken: string) {
    // Subscribe to YouTube PubSubHubbub for real-time notifications
    // This would call the YouTube API to set up webhook subscriptions
    // For now, return mock response
    return { success: true, message: 'Webhook subscription initiated' };
  }

  async unsubscribeFromChannel(channelId: string, accessToken: string) {
    // Unsubscribe from YouTube webhooks
    return { success: true, message: 'Webhook subscription removed' };
  }

  async getWebhookEvents(channelId: string, params: {
    page?: number;
    limit?: number;
    eventType?: WebhookEventType;
    processed?: boolean;
  }) {
    const { page = 1, limit = 50, eventType, processed } = params;
    const skip = (page - 1) * limit;

    const where: any = { channelId };
    if (eventType) where.eventType = eventType;
    if (processed !== undefined) where.processed = processed;

    const [events, total] = await Promise.all([
      this.prisma.webhookEvent.findMany({
        where,
        skip,
        take: limit,
        orderBy: { receivedAt: 'desc' },
      }),
      this.prisma.webhookEvent.count({ where }),
    ]);

    return { data: events, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }
}