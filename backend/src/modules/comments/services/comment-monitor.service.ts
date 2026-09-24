import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../../database/prisma.service';
import { YouTubeApiService } from '../../youtube/services/youtube-api.service';
import { QueueService, CommentJobData } from '../../../queue/queue.service';
import { ChannelStatus, AutomationStatus, TriggerType } from '@prisma/client';

export interface CommentTriggerData {
  commentId: string;
  commentText: string;
  authorChannelId: string;
  authorName: string;
  authorAvatar?: string;
  videoId: string;
  videoTitle?: string;
  publishedAt: Date;
}

@Injectable()
export class CommentMonitorService {
  private readonly logger = new Logger(CommentMonitorService.name);

  constructor(
    private prisma: PrismaService,
    private youtubeApiService: YouTubeApiService,
    private queueService: QueueService,
  ) {}

  // ============================================
  // SCHEDULED COMMENT FETCHING
  // ============================================

  @Cron(CronExpression.EVERY_5_MINUTES)
  async fetchCommentsForAllChannels() {
    this.logger.debug('Starting scheduled comment fetch for all channels');

    const channels = await this.prisma.channel.findMany({
      where: {
        status: ChannelStatus.CONNECTED,
        deletedAt: null,
      },
      select: { id: true, userId: true },
    });

    this.logger.log(`Fetching comments for ${channels.length} channels`);

    for (const channel of channels) {
      try {
        await this.queueService.addCommentJob({
          channelId: channel.id,
        });
      } catch (error) {
        this.logger.error(`Failed to queue comment fetch for channel ${channel.id}`, error);
      }
    }
  }

  async fetchAndProcessComments(channelId: string) {
    const channel = await this.prisma.channel.findUnique({
      where: { id: channelId },
      include: { user: true },
    });

    if (!channel || channel.status !== ChannelStatus.CONNECTED) {
      this.logger.warn(`Channel ${channelId} not found or not connected`);
      return { success: false, count: 0, error: 'Channel not connected' };
    }

    try {
      // Get valid access token (handles refresh automatically)
      const accessToken = await this.youtubeApiService.getValidAccessToken(channelId);
      if (!accessToken) {
        throw new Error('Unable to get valid access token');
      }

      // Fetch new comments
      const result = await this.youtubeApiService.getCommentThreads(
        channel.youtubeChannelId,
        accessToken,
        channel.refreshToken || undefined,
        { maxResults: 50 },
      );

      let newCommentsCount = 0;

      for (const thread of result.items) {
        const comment = thread.snippet.topLevelComment;
        const commentSnippet = comment.snippet;

        // Check if comment already exists
        const existingComment = await this.prisma.comment.findUnique({
          where: { youtubeCommentId: comment.id },
        });

        if (!existingComment) {
          // Store new comment
          await this.prisma.comment.create({
            data: {
              channelId: channel.id,
              youtubeCommentId: comment.id,
              videoId: commentSnippet.videoId,
              authorChannelId: commentSnippet.authorChannelId.value,
              authorName: commentSnippet.authorDisplayName,
              authorAvatar: commentSnippet.authorProfileImageUrl,
              text: commentSnippet.textOriginal,
              likeCount: commentSnippet.likeCount,
              replyCount: thread.snippet.totalReplyCount,
              isReply: false,
              publishedAt: new Date(commentSnippet.publishedAt),
              updatedAt: new Date(commentSnippet.updatedAt),
              metadata: {
                videoId: commentSnippet.videoId,
              },
            },
          });
          newCommentsCount++;

          // Check automation triggers
          await this.checkAutomationTriggers(channel, {
            commentId: comment.id,
            commentText: commentSnippet.textOriginal,
            authorChannelId: commentSnippet.authorChannelId.value,
            authorName: commentSnippet.authorDisplayName,
            authorAvatar: commentSnippet.authorProfileImageUrl,
            videoId: commentSnippet.videoId,
            videoTitle: '', // Would need to fetch video info
            publishedAt: new Date(commentSnippet.publishedAt),
          });
        } else if (!existingComment.processedAt) {
          // Comment exists but not processed - check triggers
          await this.checkAutomationTriggers(channel, {
            commentId: existingComment.id,
            commentText: existingComment.text,
            authorChannelId: existingComment.authorChannelId,
            authorName: existingComment.authorName,
            authorAvatar: existingComment.authorAvatar,
            videoId: existingComment.videoId,
            videoTitle: existingComment.videoTitle || '',
            publishedAt: existingComment.publishedAt,
          });
        }

        // Process replies if any
        if (thread.replies?.comments) {
          for (const reply of thread.replies.comments) {
            const replySnippet = reply.snippet;
            const existingReply = await this.prisma.comment.findUnique({
              where: { youtubeCommentId: reply.id },
            });

            if (!existingReply) {
              await this.prisma.comment.create({
                data: {
                  channelId: channel.id,
                  youtubeCommentId: reply.id,
                  videoId: replySnippet.videoId,
                  authorChannelId: replySnippet.authorChannelId.value,
                  authorName: replySnippet.authorDisplayName,
                  authorAvatar: replySnippet.authorProfileImageUrl,
                  text: replySnippet.textOriginal,
                  likeCount: replySnippet.likeCount,
                  replyCount: 0,
                  isReply: true,
                  parentCommentId: existingComment?.id,
                  publishedAt: new Date(replySnippet.publishedAt),
                  updatedAt: new Date(replySnippet.updatedAt),
                },
              });
            }
          }
        }
      }

      // Update last synced timestamp
      await this.prisma.channel.update({
        where: { id: channelId },
        data: { lastSyncedAt: new Date(), syncError: null },
      });

      this.logger.log(`Processed ${newCommentsCount} new comments for channel ${channelId}`);
      return { success: true, count: newCommentsCount };
    } catch (error) {
      this.logger.error(`Error fetching comments for channel ${channelId}`, error);
      
      await this.prisma.channel.update({
        where: { id: channelId },
        data: { syncError: error.message },
      });

      return { success: false, count: 0, error: error.message };
    }
  }

  // ============================================
  // AUTOMATION TRIGGER CHECKING
  // ============================================

  private async checkAutomationTriggers(channel: any, triggerData: CommentTriggerData) {
    const automations = await this.prisma.automation.findMany({
      where: {
        channelId: channel.id,
        userId: channel.userId,
        status: AutomationStatus.ACTIVE,
        deletedAt: null,
        triggerType: {
          in: [TriggerType.COMMENT_KEYWORD, TriggerType.COMMENT_REGEX],
        },
        // Check if automation applies to this video
        OR: [
          { videoIds: { equals: [] } }, // Empty array means all videos
          { videoIds: { has: triggerData.videoId } }, // Video ID is in the list
        ],
      },
      include: {
        actions: {
          orderBy: { order: 'asc' },
        },
      },
    });

    for (const automation of automations) {
      const shouldTrigger = await this.evaluateTrigger(automation, triggerData);
      
      if (shouldTrigger) {
        // Create automation execution
        const execution = await this.prisma.automationExecution.create({
          data: {
            automationId: automation.id,
            triggerData: triggerData as any,
            status: 'pending',
            startedAt: new Date(),
          },
        });

        // Queue automation execution
        await this.queueService.addAutomationJob({
          executionId: execution.id,
          automationId: automation.id,
          triggerData,
        });

        // Mark comment as processed
        if (triggerData.commentId) {
          await this.prisma.comment.update({
            where: { id: triggerData.commentId },
            data: { processedAt: new Date() },
          });
        }

        // Update automation stats
        await this.prisma.automation.update({
          where: { id: automation.id },
          data: {
            executionCount: { increment: 1 },
            lastExecutedAt: new Date(),
          },
        });

        this.logger.log(`Triggered automation ${automation.id} for comment ${triggerData.commentId} on video ${triggerData.videoId}`);
      }
    }
  }

  private async evaluateTrigger(automation: any, triggerData: CommentTriggerData): Promise<boolean> {
    const triggerConfig = automation.triggerConfig || {};

    switch (automation.triggerType) {
      case TriggerType.COMMENT_KEYWORD: {
        return this.evaluateKeywordMatch(triggerConfig, triggerData.commentText);
      }

      case TriggerType.COMMENT_REGEX: {
        const pattern = triggerConfig.pattern;
        if (!pattern) return false;
        try {
          const regex = new RegExp(pattern, triggerConfig.flags || 'i');
          return regex.test(triggerData.commentText);
        } catch {
          return false;
        }
      }

      default:
        return false;
    }
  }

  // ============================================
  // ADVANCED KEYWORD MATCHING ENGINE
  // Supports: any, exact, contains, starts_with
  // Logic:    AND / OR across multiple keywords
  // Case:     always case-insensitive
  // ============================================

  evaluateKeywordMatch(
    triggerConfig: {
      matchType?: 'any' | 'exact' | 'contains' | 'starts_with';
      logicOperator?: 'AND' | 'OR';
      keywords?: string[];
    },
    commentText: string,
  ): boolean {
    const {
      matchType = 'contains',
      logicOperator = 'OR',
      keywords = [],
    } = triggerConfig;

    // "any" — trigger on every comment regardless of keywords
    if (matchType === 'any') return true;

    if (!keywords.length) return false;

    const text = commentText.toLowerCase().trim();

    const results = keywords.map((kw: string) => {
      const keyword = kw.toLowerCase().trim();
      if (!keyword) return false;

      switch (matchType) {
        // Exact match: comment text must equal the keyword (trimmed)
        case 'exact':
          return text === keyword;

        // Starts with: comment must begin with the keyword
        case 'starts_with':
          return text.startsWith(keyword);

        // Contains (default): keyword appears anywhere in comment
        case 'contains':
        default:
          return text.includes(keyword);
      }
    });

    // AND: every keyword must match; OR: at least one must match
    return logicOperator === 'AND'
      ? results.every(Boolean)
      : results.some(Boolean);
  }

  // ============================================
  // MANUAL TRIGGER (for testing)
  // ============================================

  async triggerAutomationManually(automationId: string, triggerData: CommentTriggerData) {
    const automation = await this.prisma.automation.findUnique({
      where: { id: automationId },
      include: {
        actions: { orderBy: { order: 'asc' } },
        channel: true,
      },
    });

    if (!automation || automation.status !== AutomationStatus.ACTIVE) {
      throw new Error('Automation not found or not active');
    }

    const execution = await this.prisma.automationExecution.create({
      data: {
        automationId,
        triggerData: JSON.parse(JSON.stringify(triggerData)),
        status: 'pending',
        startedAt: new Date(),
      },
    });

    await this.queueService.addAutomationJob({
      executionId: execution.id,
      automationId,
      triggerData,
    });

    return execution;
  }
}