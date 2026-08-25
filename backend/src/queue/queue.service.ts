import { Injectable, OnModuleInit } from '@nestjs/common';
import { Queue } from 'bullmq';
import { InjectQueue } from '@nestjs/bullmq';

export enum QueueName {
  COMMENTS = 'comments',
  AUTOMATIONS = 'automations',
  EMAILS = 'emails',
  WEBHOOKS = 'webhooks',
}

export interface CommentJobData {
  channelId: string;
  videoId?: string;
  pageToken?: string;
}

export interface AutomationJobData {
  executionId: string;
  automationId: string;
  triggerData: Record<string, any>;
}

export interface EmailJobData {
  emailLogId: string;
  toEmail: string;
  subject: string;
  htmlContent: string;
  textContent?: string;
}

export interface WebhookJobData {
  eventId: string;
  channelId: string;
  eventType: string;
  payload: Record<string, any>;
}

@Injectable()
export class QueueService implements OnModuleInit {
  constructor(
    @InjectQueue(QueueName.COMMENTS) private commentsQueue: Queue,
    @InjectQueue(QueueName.AUTOMATIONS) private automationsQueue: Queue,
    @InjectQueue(QueueName.EMAILS) private emailsQueue: Queue,
    @InjectQueue(QueueName.WEBHOOKS) private webhooksQueue: Queue,
  ) {}

  async onModuleInit() {
    await this.setupJobCleanup();
  }

  private async setupJobCleanup() {
    setInterval(async () => {
      await Promise.all([
        this.commentsQueue.clean(1000 * 60 * 60 * 24 * 7, 100, 'completed'),
        this.automationsQueue.clean(1000 * 60 * 60 * 24 * 7, 100, 'completed'),
        this.emailsQueue.clean(1000 * 60 * 60 * 24 * 7, 100, 'completed'),
        this.webhooksQueue.clean(1000 * 60 * 60 * 24 * 7, 100, 'completed'),
      ]);
    }, 1000 * 60 * 60 * 24);
  }

  async addCommentJob(data: CommentJobData, options?: { delay?: number; priority?: number }) {
    return this.commentsQueue.add('fetch-comments', data, {
      delay: options?.delay || 0,
      priority: options?.priority || 0,
    });
  }

  async addAutomationJob(data: AutomationJobData) {
    return this.automationsQueue.add('execute-automation', data, {
      priority: 10,
    });
  }

  async addEmailJob(data: EmailJobData, options?: { delay?: number }) {
    return this.emailsQueue.add('send-email', data, {
      delay: options?.delay || 0,
    });
  }

  async addWebhookJob(data: WebhookJobData) {
    return this.webhooksQueue.add('process-webhook', data, {
      priority: 5,
    });
  }

  async addScheduledCommentFetch(channelId: string, intervalMinutes: number = 5) {
    return this.commentsQueue.add(
      'fetch-comments',
      { channelId },
      {
        repeat: { every: intervalMinutes * 60 * 1000 },
        jobId: `comment-fetch-${channelId}`,
      },
    );
  }

  async removeScheduledCommentFetch(channelId: string) {
    const job = await this.commentsQueue.getJob(`comment-fetch-${channelId}`);
    if (job) {
      await job.remove();
    }
  }

  async getQueueStats() {
    const [comments, automations, emails, webhooks] = await Promise.all([
      this.getQueueStatsFor(this.commentsQueue),
      this.getQueueStatsFor(this.automationsQueue),
      this.getQueueStatsFor(this.emailsQueue),
      this.getQueueStatsFor(this.webhooksQueue),
    ]);
    return { comments, automations, emails, webhooks };
  }

  private async getQueueStatsFor(queue: Queue) {
    const [waiting, active, completed, failed, delayed] = await Promise.all([
      queue.getWaitingCount(),
      queue.getActiveCount(),
      queue.getCompletedCount(),
      queue.getFailedCount(),
      queue.getDelayedCount(),
    ]);
    return { waiting, active, completed, failed, delayed };
  }
}