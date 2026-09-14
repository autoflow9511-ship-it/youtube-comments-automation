import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@database/prisma.service';
import { YouTubeService } from '../../youtube/youtube.service';
import { QueueService, AutomationJobData, QueueName } from '@queue/queue.service';
import { EmailsService } from '@modules/emails/emails.service';
import { LandingPagesService } from '@modules/landing-pages/landing-pages.service';
import { PublicFormsService } from '@modules/public-forms/public-forms.service';
import { ActionType, AutomationStatus, Prisma } from '@prisma/client';
import { EncryptionService } from '@common/services/encryption.service';
import { EmailProviderService } from '@common/email/email-provider.service';

@Processor(QueueName.AUTOMATIONS)
@Injectable()
export class AutomationProcessor extends WorkerHost {
  private readonly logger = new Logger(AutomationProcessor.name);

  constructor(
    private prisma: PrismaService,
    private youtubeService: YouTubeService,
    private queueService: QueueService,
    private emailsService: EmailsService,
    private landingPagesService: LandingPagesService,
    private publicFormsService: PublicFormsService,
    private encryptionService: EncryptionService,
    private emailProviderService: EmailProviderService,
  ) {
    super();
  }

  async process(job: Job<AutomationJobData>) {
    const { automationId, triggerData } = job.data;

    const execution = await this.prisma.automationExecution.create({
      data: {
        automationId,
        triggerData,
        status: 'running',
        startedAt: new Date(),
      },
    });

    await this.prisma.automation.update({
      where: { id: automationId },
      data: { executionCount: { increment: 1 }, lastExecutedAt: new Date() },
    });

    try {
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

      const accessToken = await this.youtubeService.getValidAccessToken(automation.channelId);
      if (!accessToken) {
        throw new Error('No valid access token for channel');
      }

      let context: Record<string, any> = { ...triggerData };

      for (const action of automation.actions) {
        const actionExecution = await this.prisma.actionExecution.create({
          data: {
            executionId: execution.id,
            actionId: action.id,
            status: 'running',
            inputData: context,
            startedAt: new Date(),
          },
        });

        try {
          const result = await this.executeAction(action, context, accessToken, automation.channel);
          
          await this.prisma.actionExecution.update({
            where: { id: actionExecution.id },
            data: {
              status: 'completed',
              outputData: result,
              completedAt: new Date(),
            },
          });

          context = { ...context, ...result };
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

          if (!(action.conditions as any)?.continueOnError) {
            throw error;
          }
        }
      }

      await this.prisma.automationExecution.update({
        where: { id: execution.id },
        data: { status: 'completed', completedAt: new Date() },
      });

      return { success: true, executionId: execution.id };
    } catch (error) {
      await this.prisma.automationExecution.update({
        where: { id: execution.id },
        data: { status: 'failed', error: error.message, completedAt: new Date() },
      });
      throw error;
    }
  }

  private async executeAction(
    action: any,
    context: Record<string, any>,
    accessToken: string,
    channel: any,
  ): Promise<Record<string, any>> {
    switch (action.type) {
      case ActionType.REPLY_COMMENT:
        return this.executeReplyComment(action, context, accessToken);

      case ActionType.REPLY_WITH_FORM_LINK:
        return this.executeReplyWithFormLink(action, context, accessToken);

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

      case ActionType.DELAY:
        return this.executeDelay(action, context);

      case ActionType.END:
        return this.executeEnd(action, context);

      default:
        throw new Error(`Unknown action type: ${action.type}`);
    }
  }

  private async executeReplyComment(
    action: any,
    context: Record<string, any>,
    accessToken: string,
  ) {
    const commentId = context.commentId;
    const message = this.interpolate(action.config.message, context);

    if (!commentId || !message) {
      throw new Error('Missing commentId or message for reply');
    }

    const reply = await this.youtubeService.replyToComment(commentId, message, accessToken);

    await this.prisma.commentReply.create({
      data: {
        commentId,
        automationId: action.automationId,
        youtubeReplyId: reply.id,
        text: message,
        status: 'sent',
        sentAt: new Date(),
      },
    });

    return { replyId: reply.id, replyMessage: message };
  }

  private async executeSendLandingPageLink(action: any, context: Record<string, any>) {
    const landingPageId = action.config.landingPageId;
    if (!landingPageId) {
      throw new Error('Landing page ID not configured');
    }

    const page = await this.prisma.landingPage.findUnique({
      where: { id: landingPageId },
      select: { publishUrl: true, slug: true },
    });

    if (!page?.publishUrl) {
      throw new Error('Landing page not published');
    }

    const message = this.interpolate(action.config.message, { ...context, landingPageUrl: page.publishUrl });

    return { landingPageUrl: page.publishUrl, message };
  }

  private async executeCollectEmail(action: any, context: Record<string, any>) {
    const landingPageId = action.config.landingPageId;
    if (!landingPageId) {
      throw new Error('Landing page ID not configured for email collection');
    }

    const page = await this.prisma.landingPage.findUnique({
      where: { id: landingPageId },
      select: { publishUrl: true, slug: true },
    });

    if (!page?.publishUrl) {
      throw new Error('Landing page not published');
    }

    return { landingPageUrl: page.publishUrl, landingPageId };
  }

  private async executeSendEmail(action: any, context: Record<string, any>) {
    const toEmail = this.extractEmail(context);
    if (!toEmail) {
      throw new Error('No email found in context for sending email');
    }

    const subject = this.interpolate(action.config.subject, context);
    const htmlContent = this.interpolate(action.config.htmlContent, context);
    const textContent = action.config.textContent ? this.interpolate(action.config.textContent, context) : undefined;

    // Create email delivery status record in MongoDB
    const emailDeliveryStatus = await this.prisma.$executeRaw`
      INSERT INTO "email_delivery_statuses" (
        "userId", "automationId", "formSubmissionId", "toEmail", "subject", 
        "status", "provider", "automationActionId", "providerConfig", "createdAt", "updatedAt"
      ) VALUES (
        ${action.automation?.userId}::uuid, ${action.automationId}::uuid, 
        ${context.formSubmissionId ? `'${context.formSubmissionId}'::uuid` : 'NULL'}, 
        ${toEmail}, ${subject}, 'queued', 'smtp', ${action.id}::uuid, 
        ${JSON.stringify(action.config)}, NOW(), NOW()
      )
    `;

    try {
      const result = await this.emailProviderService.send({
        to: toEmail,
        subject,
        html: htmlContent,
        text: textContent,
        from: action.config.fromEmail,
        fromName: action.config.fromName,
      } as any, action.config.emailProvider);

      // Update delivery status
      if (result.success) {
        await this.prisma.$executeRaw`
          UPDATE "email_delivery_statuses" 
          SET status = 'sent', "sentAt" = NOW(), "providerMessageId" = ${result.messageId}, "providerResponse" = ${JSON.stringify(result.providerResponse)}, "updatedAt" = NOW()
          WHERE "automationActionId" = ${action.id}::uuid AND "toEmail" = ${toEmail}
          AND "createdAt" = (SELECT MAX("createdAt") FROM "email_delivery_statuses" WHERE "automationActionId" = ${action.id}::uuid AND "toEmail" = ${toEmail})
        `;
      } else {
        await this.prisma.$executeRaw`
          UPDATE "email_delivery_statuses" 
          SET status = 'failed', "errorMessage" = ${result.error}, "errorCode" = ${result.errorCode}, "providerResponse" = ${JSON.stringify(result.providerResponse)}, "updatedAt" = NOW()
          WHERE "automationActionId" = ${action.id}::uuid AND "toEmail" = ${toEmail}
          AND "createdAt" = (SELECT MAX("createdAt") FROM "email_delivery_statuses" WHERE "automationActionId" = ${action.id}::uuid AND "toEmail" = ${toEmail})
        `;
      }

      return { emailSent: true, messageId: result.messageId };
    } catch (error) {
      this.logger.error(`Failed to send email: ${error.message}`);
      
      // Update delivery status to failed
      await this.prisma.$executeRaw`
        UPDATE "email_delivery_statuses" 
        SET status = 'failed', "errorMessage" = ${error.message}, "updatedAt" = NOW()
        WHERE "automationActionId" = ${action.id}::uuid AND "toEmail" = ${toEmail}
        AND "createdAt" = (SELECT MAX("createdAt") FROM "email_delivery_statuses" WHERE "automationActionId" = ${action.id}::uuid AND "toEmail" = ${toEmail})
      `;
      
      throw error;
    }
  }

  private async executeAddTag(action: any, context: Record<string, any>) {
    const emailCaptureId = context.emailCaptureId;
    const tags = action.config.tags || [];

    if (!emailCaptureId || !tags.length) {
      return { tagsAdded: 0 };
    }

    await this.prisma.emailCapture.update({
      where: { id: emailCaptureId },
      data: {
        tags: {
          push: tags,
        },
      },
    });

    return { tagsAdded: tags.length };
  }

  private async executeCallWebhook(action: any, context: Record<string, any>) {
    const url = action.config.url;
    const method = action.config.method || 'POST';
    const headers = action.config.headers || {};

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
    return { webhookResponse: data };
  }

  private async executeReplyWithFormLink(
    action: any,
    context: Record<string, any>,
    accessToken: string,
  ) {
    const commentId = context.commentId;
    const message = this.interpolate(action.config.message, context);

    if (!commentId || !message) {
      throw new Error('Missing commentId or message for reply with form link');
    }

    // Get the form URL from the context (set by COLLECT_EMAIL action)
    const formUrl = context.formUrl || context.landingPageUrl;
    if (!formUrl) {
      throw new Error('Form URL not available in context');
    }

    // Replace the form URL placeholder in the message
    const finalMessage = message.replace(/\{\{formUrl\}\}/g, formUrl);

    const reply = await this.youtubeService.replyToComment(commentId, finalMessage, accessToken);

    await this.prisma.commentReply.create({
      data: {
        commentId,
        automationId: action.automationId,
        youtubeReplyId: reply.id,
        text: finalMessage,
        status: 'sent',
        sentAt: new Date(),
      },
    });

    return { replyId: reply.id, replyMessage: finalMessage, formUrl };
  }

  private async executeDelay(action: any, context: Record<string, any>) {
    const delayMs = action.config.delayMs || 
      (action.config.delayMinutes || 0) * 60 * 1000 ||
      (action.config.delayHours || 0) * 60 * 60 * 1000 ||
      (action.config.delayDays || 0) * 24 * 60 * 60 * 1000;

    if (delayMs > 0) {
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }

    return { delayed: true, delayMs };
  }

  private async executeEnd(action: any, context: Record<string, any>) {
    // End action simply completes the automation
    return { ended: true };
  }

  private interpolate(template: string, context: Record<string, any>): string {
    if (!template) return '';
    
    return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      return context[key] !== undefined ? String(context[key]) : match;
    });
  }

  private extractEmail(context: Record<string, any>): string | null {
    if (context.email) return context.email;
    if (context.emailCapture?.email) return context.emailCapture.email;
    if (context.formData?.email) return context.formData.email;
    return null;
  }

  @OnWorkerEvent('completed')
  onCompleted(job: Job) {
    this.logger.debug(`Automation job ${job.id} completed`);
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job, error: Error) {
    this.logger.error(`Automation job ${job.id} failed: ${error.message}`);
  }
}