import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@database/prisma.service';
import { YouTubeService } from '../../youtube/youtube.service';
import { QueueService, CommentJobData, QueueName } from '@queue/queue.service';
import { AutomationsService } from '@modules/automations/automations.service';
import { TriggerType } from '@prisma/client';

@Processor(QueueName.COMMENTS)
@Injectable()
export class CommentProcessor extends WorkerHost {
  private readonly logger = new Logger(CommentProcessor.name);

  constructor(
    private prisma: PrismaService,
    private youtubeService: YouTubeService,
    private queueService: QueueService,
    private automationService: AutomationService,
  ) {
    super();
  }

  async process(job: Job<CommentJobData>) {
    const { channelId, videoId, pageToken } = job.data;

    try {
      this.logger.log(`Processing comment fetch for channel ${channelId}`);

      const count = await this.youtubeService.fetchAndStoreComments(channelId);

      const channel = await this.prisma.channel.findUnique({
        where: { id: channelId },
        select: { userId: true, youtubeChannelId: true },
      });

      if (channel) {
        await this.checkAutomationTriggers(channelId, channel.userId);
      }

      this.logger.log(`Fetched and stored ${count} comments for channel ${channelId}`);
      return { success: true, count };
    } catch (error) {
      this.logger.error(`Error fetching comments for channel ${channelId}`, error);
      throw error;
    }
  }

  private async checkAutomationTriggers(channelId: string, userId: string) {
    const automations = await this.prisma.automation.findMany({
      where: {
        channelId,
        userId,
        status: 'ACTIVE',
        deletedAt: null,
        triggerType: { in: ['COMMENT_KEYWORD', 'COMMENT_REGEX'] },
      },
      include: {
        actions: { orderBy: { order: 'asc' } },
      },
    });

    for (const automation of automations) {
      const unprocessedComments = await this.prisma.comment.findMany({
        where: {
          channelId,
          processedAt: null,
          isReply: false,
        },
        take: 100,
        orderBy: { publishedAt: 'desc' },
      });

      for (const comment of unprocessedComments) {
        const shouldTrigger = await this.evaluateTrigger(automation, comment);
        
        if (shouldTrigger) {
          await this.queueService.addAutomationJob({
            executionId: '',
            automationId: automation.id,
            triggerData: {
              commentId: comment.id,
              commentText: comment.text,
              authorChannelId: comment.authorChannelId,
              authorName: comment.authorName,
              videoId: comment.videoId,
            },
          });

          await this.prisma.comment.update({
            where: { id: comment.id },
            data: { processedAt: new Date() },
          });
        }
      }
    }
  }

  private async evaluateTrigger(automation: any, comment: any): Promise<boolean> {
    const triggerConfig = automation.triggerConfig || {};
    
    switch (automation.triggerType) {
      case TriggerType.COMMENT_KEYWORD: {
        const keywords = triggerConfig.keywords || [];
        const commentText = comment.text.toLowerCase();
        return keywords.some((keyword: string) => 
          commentText.includes(keyword.toLowerCase())
        );
      }
      
      case TriggerType.COMMENT_REGEX: {
        const pattern = triggerConfig.pattern;
        if (!pattern) return false;
        try {
          const regex = new RegExp(pattern, 'i');
          return regex.test(comment.text);
        } catch {
          return false;
        }
      }
      
      default:
        return false;
    }
  }

  @OnWorkerEvent('completed')
  onCompleted(job: Job) {
    this.logger.debug(`Comment fetch job ${job.id} completed`);
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job, error: Error) {
    this.logger.error(`Comment fetch job ${job.id} failed: ${error.message}`);
  }
}