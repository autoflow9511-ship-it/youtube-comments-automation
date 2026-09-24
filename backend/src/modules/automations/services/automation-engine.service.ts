import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { YouTubeApiService } from '../../youtube/services/youtube-api.service';
import { EmailsService } from '../../emails/services/emails.service';
import { LandingPagesService } from '../../landing-pages/services/landing-pages.service';
import { QueueService } from '../../../queue/queue.service';
import { 
  AutomationStatus, 
  ActionType, 
  TriggerType,
  ChannelStatus,
  EmailStatus,
} from '@prisma/client';

export interface ExecutionContext {
  automationId: string;
  triggerData: Record<string, any>;
  channelId: string;
  userId: string;
  executionId: string;
}

export interface ActionResult {
  success: boolean;
  outputData?: Record<string, any>;
  error?: string;
}

@Injectable()
export class AutomationEngineService {
  private readonly logger = new Logger(AutomationEngineService.name);

  constructor(
    private prisma: PrismaService,
    private youtubeApiService: YouTubeApiService,
    private emailsService: EmailsService,
    private landingPagesService: LandingPagesService,
    private queueService: QueueService,
  ) {}

  // ============================================
  // MAIN EXECUTION ENTRY POINT
  // ============================================

  async executeAutomation(context: ExecutionContext): Promise<void> {
    const { automationId, triggerData } = context;
    let { channelId, userId, executionId } = context;

    try {
      // Get automation with actions
      const automation = await this.prisma.automation.findUnique({
        where: { id: automationId },
        include: {
          actions: { orderBy: { order: 'asc' } },
          channel: true,
        },
      });

      if (!automation) {
        throw new Error('Automation not found');
      }

      channelId = channelId || automation.channelId;
      userId = userId || automation.userId;

      if (!executionId) {
        const execution = await this.prisma.automationExecution.create({
          data: { automationId, triggerData, status: 'pending', startedAt: new Date() },
        });
        executionId = execution.id;
      }

      this.logger.log(`Executing automation ${automationId} (execution ${executionId})`);

      if (automation.status !== AutomationStatus.ACTIVE) {
        throw new Error('Automation is not active');
      }

      if (automation.channel.status !== ChannelStatus.CONNECTED) {
        throw new Error('Channel is not connected');
      }

      // Get valid access token
      const accessToken = await this.youtubeApiService.getValidAccessToken(channelId);
      if (!accessToken) {
        throw new Error('Unable to get valid access token for channel');
      }

      // Prepare execution context
      let executionContext: Record<string, any> = { 
        ...triggerData,
        automationId,
        channelId,
        userId,
        executionId,
      };

      // Execute each action in order
      for (const action of automation.actions) {
        const actionExecution = await this.prisma.actionExecution.create({
          data: {
            executionId,
            actionId: action.id,
            status: 'running',
            inputData: executionContext,
            startedAt: new Date(),
          },
        });

        try {
          this.logger.debug(`Executing action ${action.id} (${action.type}) for execution ${executionId}`);
          
          const result = await this.executeAction(
            action,
            executionContext,
            accessToken,
            automation.channel,
          );

          await this.prisma.actionExecution.update({
            where: { id: actionExecution.id },
            data: {
              status: 'completed',
              outputData: result.outputData || {},
              completedAt: new Date(),
            },
          });

          if (result.outputData) {
            executionContext = { ...executionContext, ...result.outputData };
          }

        } catch (error) {
          this.logger.error(`Action ${action.id} failed`, error);

          await this.prisma.actionExecution.update({
            where: { id: actionExecution.id },
            data: {
              status: 'failed',
              error: error.message,
              completedAt: new Date(),
            },
          });

          // Check if automation should continue on error
          const continueOnError = (action.conditions as any)?.continueOnError;
          if (!continueOnError) {
            throw error;
          }
        }
      }

      // Mark execution as completed
      await this.prisma.automationExecution.update({
        where: { id: executionId },
        data: { 
          status: 'completed', 
          completedAt: new Date(),
        },
      });

      // Update automation stats
      await this.prisma.automation.update({
        where: { id: automationId },
        data: {
          executionCount: { increment: 1 },
          lastExecutedAt: new Date(),
        },
      });

      this.logger.log(`Automation ${automationId} executed successfully`);
    } catch (error) {
      this.logger.error(`Automation ${automationId} execution failed`, error);

      await this.prisma.automationExecution.update({
        where: { id: executionId },
        data: { 
          status: 'failed', 
          error: error.message,
          completedAt: new Date(),
        },
      });

      throw error;
    }
  }

  // ============================================
  // ACTION EXECUTION
  // ============================================

  private async executeAction(
    action: any,
    context: Record<string, any>,
    accessToken: string,
    channel: any,
  ): Promise<ActionResult> {
    switch (action.type) {
      case ActionType.REPLY_COMMENT:
        return this.executeReplyComment(action, context, accessToken);

      case ActionType.SEND_LANDING_PAGE_LINK:
        return this.executeSendLandingPageLink(action, context);

      case ActionType.COLLECT_EMAIL:
        return this.executeCollectEmail(action, context);

      case ActionType.SEND_EMAIL:
        return this.executeSendEmail(action, context);

      case ActionType.ADD_TAG:
        return this.executeAddTag(action, context);

      case ActionType.CALL_WEBHOOK:
        return this.executeCallWebhook(action, context);

      default:
        throw new Error(`Unknown action type: ${action.type}`);
    }
  }

  // ============================================
  // INDIVIDUAL ACTION IMPLEMENTATIONS
  // ============================================

  private async executeReplyComment(
    action: any,
    context: Record<string, any>,
    accessToken: string,
  ): Promise<ActionResult> {
    const commentId = context.commentId;
    const messageTemplate = action.config.message;

    if (!commentId || !messageTemplate) {
      throw new Error('Missing commentId or message template for reply action');
    }

    // Interpolate variables in message
    const message = this.interpolate(messageTemplate, context);

    try {
      const replyId = await this.youtubeApiService.replyToComment(commentId, message, accessToken);

      // Store reply record
      await this.prisma.commentReply.create({
        data: {
          commentId,
          automationId: context.automationId,
          youtubeReplyId: replyId,
          text: message,
          status: 'sent',
          sentAt: new Date(),
        },
      });

      return { 
        success: true, 
        outputData: { replyId, replyMessage: message } 
      };
    } catch (error) {
      // Store failed reply
      await this.prisma.commentReply.create({
        data: {
          commentId,
          automationId: context.automationId,
          text: messageTemplate,
          status: 'failed',
          error: error.message,
        },
      });
      throw error;
    }
  }

  private async executeReplyWithFormLink(
    action: any,
    context: Record<string, any>,
    accessToken: string,
  ): Promise<ActionResult> {
    const commentId = context.commentId;
    const landingPageId = action.config.landingPageId;
    if (!commentId || !landingPageId) throw new Error('Missing commentId or landing page ID');

    const page = await this.prisma.landingPage.findFirst({
      where: { id: landingPageId, userId: context.userId, deletedAt: null, status: 'PUBLISHED' },
      select: { publishUrl: true },
    });
    if (!page?.publishUrl) throw new Error('Landing page not found or not published');

    const template = action.config.message || '{{formUrl}}';
    const message = this.interpolate(template, { ...context, formUrl: page.publishUrl, landingPageUrl: page.publishUrl });
    const replyId = await this.youtubeApiService.replyToComment(commentId, message, accessToken);

    await this.prisma.commentReply.create({
      data: {
        commentId,
        automationId: context.automationId,
        youtubeReplyId: replyId,
        text: message,
        status: 'sent',
        sentAt: new Date(),
      },
    });

    return { success: true, outputData: { replyId, formUrl: page.publishUrl, replyMessage: message } };
  }

  private async executeSendLandingPageLink(
    action: any,
    context: Record<string, any>,
  ): Promise<ActionResult> {
    const landingPageId = action.config.landingPageId;
    const messageTemplate = action.config.message;

    if (!landingPageId) {
      throw new Error('Landing page ID not configured');
    }

    const landingPage = await this.prisma.landingPage.findUnique({
      where: { id: landingPageId },
    });

    if (!landingPage || !landingPage.publishUrl) {
      throw new Error('Landing page not found or not published');
    }

    const message = this.interpolate(messageTemplate, {
      ...context,
      landingPageUrl: landingPage.publishUrl,
    });

    return { 
      success: true, 
      outputData: { landingPageUrl: landingPage.publishUrl, message } 
    };
  }

  private async executeCollectEmail(
    action: any,
    context: Record<string, any>,
  ): Promise<ActionResult> {
    const landingPageId = action.config.landingPageId;

    if (!landingPageId) {
      throw new Error('Landing page ID not configured for email collection');
    }

    const landingPage = await this.prisma.landingPage.findUnique({
      where: { id: landingPageId },
    });

    if (!landingPage || !landingPage.publishUrl) {
      throw new Error('Landing page not found or not published');
    }

    // The actual email collection happens when user submits the landing page form
    // This action just provides the landing page URL in the context
    return { 
      success: true, 
      outputData: { 
        landingPageUrl: landingPage.publishUrl,
        landingPageId,
        collectEmail: true,
      } 
    };
  }

  private async executeSendEmail(
    action: any,
    context: Record<string, any>,
  ): Promise<ActionResult> {
    const toEmail = this.extractEmail(context);
    const subjectTemplate = action.config.subject;
    const htmlTemplate = action.config.htmlContent;
    const textTemplate = action.config.textContent;

    if (!toEmail || !subjectTemplate || !htmlTemplate) {
      throw new Error('Missing email configuration (toEmail, subject, or htmlContent)');
    }

    const subject = this.interpolate(subjectTemplate, context);
    const htmlContent = this.interpolate(htmlTemplate, context);
    const textContent = textTemplate ? this.interpolate(textTemplate, context) : undefined;

    try {
      const result = await this.emailsService.sendEmail({
        userId: context.userId,
        toEmail,
        subject,
        htmlContent,
        textContent,
        emailCaptureId: context.emailCaptureId,
      } as any);

      return { 
        success: true, 
        outputData: { emailSent: true, messageId: result.messageId } 
      };
    } catch (error) {
      this.logger.error(`Failed to send email: ${error.message}`);
      throw error;
    }
  }

  private async executeAddTag(
    action: any,
    context: Record<string, any>,
  ): Promise<ActionResult> {
    const emailCaptureId = context.emailCaptureId;
    const tags = action.config.tags || [];

    if (!emailCaptureId || !tags.length) {
      return { success: true, outputData: { tagsAdded: 0 } };
    }

    await this.prisma.emailCapture.update({
      where: { id: emailCaptureId },
      data: {
        tags: {
          push: tags,
        },
      },
    });

    return { 
      success: true, 
      outputData: { tagsAdded: tags.length, tags } 
    };
  }

  private async executeCallWebhook(
    action: any,
    context: Record<string, any>,
  ): Promise<ActionResult> {
    const url = action.config.url;
    const method = action.config.method || 'POST';
    const headers = action.config.headers || {};

    if (!url) {
      throw new Error('Webhook URL not configured');
    }

    try {
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...headers,
        },
        body: JSON.stringify(context),
      });

      if (!response.ok) {
        throw new Error(`Webhook failed with status ${response.status}`);
      }

      const data = await response.json().catch(() => ({}));

      return { 
        success: true, 
        outputData: { webhookResponse: data } 
      };
    } catch (error) {
      this.logger.error(`Webhook call failed: ${error.message}`);
      throw error;
    }
  }

  // ============================================
  // HELPER METHODS
  // ============================================

  private interpolate(template: string, context: Record<string, any>): string {
    if (!template) return '';
    
    return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      const value = context[key];
      if (value !== undefined) return String(value);
      if (context.customFields?.[key] !== undefined) return String(context.customFields[key]);
      return match;
    });
  }

  private extractEmail(context: Record<string, any>): string | null {
    if (context.email) return context.email;
    if (context.emailCapture?.email) return context.emailCapture.email;
    if (context.formData?.email) return context.formData.email;
    if (context.authorEmail) return context.authorEmail;
    return null;
  }

  // ============================================
  // AUTOMATION MANAGEMENT
  // ============================================

  async createAutomation(data: {
    userId: string;
    channelId: string;
    name: string;
    description?: string;
    triggerType: any;
    triggerConfig: Record<string, any>;
    actions: Array<{
      type: any;
      config: Record<string, any>;
      order: number;
      conditions?: Record<string, any>;
    }>;
    settings?: Record<string, any>;
    videoIds?: string[];
  }) {
    const channel = await this.prisma.channel.findUnique({
      where: { id: data.channelId },
    });

    if (!channel) {
      throw new Error('Channel not found');
    }

    if (channel.userId !== data.userId) {
      throw new Error('Channel does not belong to user');
    }

    return this.prisma.automation.create({
      data: {
        userId: data.userId,
        channelId: data.channelId,
        name: data.name,
        description: data.description,
        triggerType: data.triggerType,
        triggerConfig: data.triggerConfig,
        videoIds: data.videoIds || [],
        settings: data.settings || {},
        actions: {
          create: data.actions.map(action => ({
            type: action.type,
            config: action.config,
            order: action.order,
            conditions: action.conditions || {},
          })),
        },
      },
      include: { actions: true },
    });
  }

  async updateAutomation(automationId: string, userId: string, data: any) {
    const automation = await this.prisma.automation.findFirst({
      where: { id: automationId, userId, deletedAt: null },
    });

    if (!automation) {
      throw new Error('Automation not found');
    }

    if (data.actions) {
      // Delete existing actions
      await this.prisma.automationAction.deleteMany({
        where: { automationId },
      });

      // Create new actions
      await this.prisma.automationAction.createMany({
        data: data.actions.map((action: any, index: number) => ({
          automationId,
          type: action.type,
          config: action.config,
          order: action.order ?? index,
          conditions: action.conditions || {},
        })),
      });
    }

    return this.prisma.automation.update({
      where: { id: automationId },
      data: {
        name: data.name,
        description: data.description,
        triggerType: data.triggerType,
        triggerConfig: data.triggerConfig,
        videoIds: data.videoIds || [],
        status: data.status,
        settings: data.settings,
      },
      include: { actions: { orderBy: { order: 'asc' } } },
    });
  }

  async deleteAutomation(automationId: string, userId: string) {
    const automation = await this.prisma.automation.findFirst({
      where: { id: automationId, userId, deletedAt: null },
    });

    if (!automation) {
      throw new Error('Automation not found');
    }

    return this.prisma.automation.update({
      where: { id: automationId },
      data: { 
        deletedAt: new Date(),
        status: AutomationStatus.ARCHIVED,
      },
    });
  }

  async duplicateAutomation(automationId: string, userId: string) {
    const automation = await this.prisma.automation.findFirst({
      where: { id: automationId, userId, deletedAt: null },
      include: { actions: { orderBy: { order: 'asc' } } },
    });

    if (!automation) {
      throw new Error('Automation not found');
    }

    return this.prisma.automation.create({
      data: {
        userId,
        channelId: automation.channelId,
        name: `${automation.name} (Copy)`,
        description: automation.description,
        triggerType: automation.triggerType,
        triggerConfig: automation.triggerConfig,
        videoIds: automation.videoIds,
        status: AutomationStatus.DRAFT,
        settings: automation.settings,
        actions: {
          create: automation.actions.map(action => ({
            type: action.type,
            config: action.config,
            order: action.order,
            conditions: action.conditions,
          })),
        },
      },
      include: { actions: true },
    });
  }

  async getAutomationExecutions(automationId: string, userId: string, options?: {
    page?: number;
    limit?: number;
    status?: string;
  }) {
    const automation = await this.prisma.automation.findFirst({
      where: { id: automationId, userId, deletedAt: null },
    });

    if (!automation) {
      throw new Error('Automation not found');
    }

    const page = options?.page || 1;
    const limit = Math.min(options?.limit || 20, 100);
    const skip = (page - 1) * limit;

    const where: any = { automationId };
    if (options?.status) where.status = options.status;

    const [executions, total] = await Promise.all([
      this.prisma.automationExecution.findMany({
        where,
        skip,
        take: limit,
        orderBy: { startedAt: 'desc' },
        include: { actions: true },
      }),
      this.prisma.automationExecution.count({ where }),
    ]);

    return {
      data: executions,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }
}