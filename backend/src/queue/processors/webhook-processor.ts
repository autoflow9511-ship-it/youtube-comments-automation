import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@database/prisma.service';
import { QueueService, WebhookJobData, QueueName } from '@queue/queue.service';
import { WebhookEventType } from '@prisma/client';

@Processor(QueueName.WEBHOOKS)
@Injectable()
export class WebhookProcessor extends WorkerHost {
  private readonly logger = new Logger(WebhookProcessor.name);

  constructor(
    private prisma: PrismaService,
    private queueService: QueueService,
  ) {
    super();
  }

  async process(job: Job<WebhookJobData>) {
    const { eventId, channelId, eventType, payload } = job.data;

    try {
      this.logger.log(`Processing webhook ${eventType} for channel ${channelId}`);

      const event = await this.prisma.webhookEvent.findUnique({
        where: { id: eventId },
      });

      if (!event) {
        throw new Error('Webhook event not found');
      }

      switch (eventType) {
        case WebhookEventType.COMMENT_CREATED:
          await this.handleCommentCreated(channelId, payload);
          break;
        case WebhookEventType.COMMENT_UPDATED:
          await this.handleCommentUpdated(channelId, payload);
          break;
        case WebhookEventType.VIDEO_UPLOADED:
          await this.handleVideoUploaded(channelId, payload);
          break;
        case WebhookEventType.SUBSCRIPTION_CHANGED:
          await this.handleSubscriptionChanged(channelId, payload);
          break;
      }

      await this.prisma.webhookEvent.update({
        where: { id: eventId },
        data: { processed: true, processedAt: new Date() },
      });

      return { success: true };
    } catch (error) {
      this.logger.error(`Failed to process webhook ${eventId}`, error);
      
      await this.prisma.webhookEvent.update({
        where: { id: eventId },
        data: { 
          error: error.message, 
          retryCount: { increment: 1 },
          processed: false,
        },
      });
      
      throw error;
    }
  }

  private async handleCommentCreated(channelId: string, payload: any) {
    const commentId = payload.resourceId;
    
    await this.queueService.addCommentJob({ channelId });
    
    this.logger.log(`Comment created webhook processed, queued comment fetch for ${channelId}`);
  }

  private async handleCommentUpdated(channelId: string, payload: any) {
    this.logger.log(`Comment updated webhook processed for ${channelId}`);
  }

  private async handleVideoUploaded(channelId: string, payload: any) {
    const videoId = payload.resourceId;
    
    const automations = await this.prisma.automation.findMany({
      where: {
        channelId,
        status: 'ACTIVE',
        deletedAt: null,
        triggerType: 'NEW_VIDEO',
      },
    });

    for (const automation of automations) {
      await this.queueService.addAutomationJob({
        executionId: '',
        automationId: automation.id,
        triggerData: {
          videoId,
          eventType: 'VIDEO_UPLOADED',
        },
      });
    }

    this.logger.log(`Video uploaded webhook processed, triggered ${automations.length} automations for ${channelId}`);
  }

  private async handleSubscriptionChanged(channelId: string, payload: any) {
    this.logger.log(`Subscription changed webhook processed for ${channelId}`);
  }

  @OnWorkerEvent('completed')
  onCompleted(job: Job) {
    this.logger.debug(`Webhook job ${job.id} completed`);
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job, error: Error) {
    this.logger.error(`Webhook job ${job.id} failed: ${error.message}`);
  }
}