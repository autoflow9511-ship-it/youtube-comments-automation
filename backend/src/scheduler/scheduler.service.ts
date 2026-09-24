import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '@database/prisma.service';
import { QueueService } from '@queue/queue.service';
import { YouTubeApiService } from '@modules/youtube/services/youtube-api.service';
import { EmailsService } from '@modules/emails/services/emails.service';
import { ChannelStatus, EmailStatus } from '@prisma/client';

@Injectable()
export class SchedulerService implements OnModuleInit {
  private readonly logger = new Logger(SchedulerService.name);

  constructor(
    private prisma: PrismaService,
    private queueService: QueueService,
    private youtubeService: YouTubeApiService,
    private emailsService: EmailsService,
  ) {}

  @Cron(CronExpression.EVERY_HOUR)
  async processEmailSequences() {
    this.logger.log('Processing email sequences');

    const enrollments = await this.prisma.emailEnrollment.findMany({
      where: {
        status: 'active',
      },
      include: {
        sequence: { include: { steps: { orderBy: { order: 'asc' } } } },
        emailCapture: true,
      },
    });

    for (const enrollment of enrollments) {
      await this.processEnrollmentStep(enrollment);
    }
  }

  private async processEnrollmentStep(enrollment: any) {
    const { sequence, emailCapture, currentStep } = enrollment;
    const steps = sequence.steps;

    if (currentStep >= steps.length) {
      await this.prisma.emailEnrollment.update({
        where: { id: enrollment.id },
        data: { status: 'completed', completedAt: new Date() },
      });
      return;
    }

    const step = steps[currentStep];
    const delayMs = (step.delayDays * 24 + step.delayHours) * 60 * 60 * 1000;
    const nextSendAt = new Date(enrollment.startedAt.getTime() + currentStep * delayMs);

    if (new Date() < nextSendAt) {
      return;
    }

    const subject = this.interpolate(step.subject, emailCapture);
    const htmlContent = this.interpolate(step.htmlContent, emailCapture);
    const textContent = step.textContent ? this.interpolate(step.textContent, emailCapture) : undefined;

    try {
      await this.emailsService.sendEmail({
        userId: sequence.userId,
        toEmail: emailCapture.email,
        subject,
        htmlContent,
        textContent,
        enrollmentId: enrollment.id,
        sequenceStepId: step.id,
      });

      await this.prisma.emailEnrollment.update({
        where: { id: enrollment.id },
        data: {
          currentStep: currentStep + 1,
        },
      });
    } catch (error) {
      this.logger.error(`Failed to send sequence email for enrollment ${enrollment.id}`, error);
    }
  }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async cleanupOldData() {
    this.logger.log('Running daily cleanup');

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    await this.prisma.webhookEvent.deleteMany({
      where: {
        processed: true,
        processedAt: { lt: thirtyDaysAgo },
      },
    });

    await this.prisma.automationExecution.deleteMany({
      where: {
        startedAt: { lt: thirtyDaysAgo },
        status: { in: ['completed', 'failed'] },
      },
    });

    await this.prisma.analyticsEvent.deleteMany({
      where: {
        createdAt: { lt: thirtyDaysAgo },
      },
    });

    this.logger.log('Daily cleanup completed');
  }

  @Cron(CronExpression.EVERY_6_HOURS)
  async refreshExpiringTokens() {
    this.logger.log('Checking for expiring tokens');

    const soon = new Date(Date.now() + 60 * 60 * 1000);

    const channels = await this.prisma.channel.findMany({
      where: {
        status: ChannelStatus.CONNECTED,
        tokenExpiresAt: { lte: soon, gt: new Date() },
        deletedAt: null,
      },
      select: { id: true },
    });

    for (const channel of channels) {
      await this.youtubeService.refreshAccessToken(channel.id);
    }

    this.logger.log(`Refreshed tokens for ${channels.length} channels`);
  }

  private interpolate(template: string, capture: any): string {
    if (!template) return '';
    
    return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      if (capture[key] !== undefined) return String(capture[key]);
      if (capture.customFields?.[key] !== undefined) return String(capture.customFields[key]);
      return match;
    });
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async retryFailedEmails() {
    const failedEmails = await this.prisma.emailLog.findMany({
      where: {
        status: EmailStatus.FAILED,
        createdAt: { gte: new Date(Date.now() - 60 * 60 * 1000) },
      },
      take: 50,
    });

    for (const email of failedEmails) {
      try {
        await this.emailsService.sendEmail({
          userId: email.userId,
          toEmail: email.toEmail,
          subject: email.subject,
          htmlContent: email.htmlContent,
          textContent: email.textContent,
        });
      } catch (error) {
        this.logger.error(`Retry failed for email ${email.id}`, error);
      }
    }
  }
}