import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../../database/prisma.service';
import { QueueService } from '../../../queue/queue.service';
import * as nodemailer from 'nodemailer';
import { EmailStatus, EmailProvider } from '@prisma/client';
import { EncryptionService } from '../../../common/services/encryption.service';

@Injectable()
export class EmailsService {
  private readonly logger = new Logger(EmailsService.name);
  private transporter: nodemailer.Transporter;

  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
    private queueService: QueueService,
    private encryptionService: EncryptionService,
  ) {
    this.initializeTransporter();
  }

  private initializeTransporter() {
    this.transporter = nodemailer.createTransport({
      host: this.configService.get<string>('SMTP_HOST'),
      port: this.configService.get<number>('SMTP_PORT'),
      secure: this.configService.get<boolean>('SMTP_SECURE'),
      auth: {
        user: this.configService.get<string>('SMTP_USER'),
        pass: this.configService.get<string>('SMTP_PASS'),
      },
    });

    // Verify connection
    this.transporter.verify()
      .then(() => this.logger.log('SMTP connection verified'))
      .catch(err => this.logger.error('SMTP connection failed', err));
  }

  // ============================================
  // EMAIL SEQUENCE MANAGEMENT
  // ============================================

  async createEmailSequence(userId: string, data: {
    name: string;
    description?: string;
    triggerType: string;
    triggerConfig: Record<string, any>;
    steps: Array<{
      order: number;
      delayHours: number;
      delayDays: number;
      subject: string;
      htmlContent: string;
      textContent?: string;
      conditions?: Record<string, any>;
    }>;
  }) {
    return this.prisma.emailSequence.create({
      data: {
        userId,
        name: data.name,
        description: data.description,
        triggerType: data.triggerType,
        triggerConfig: data.triggerConfig,
        steps: {
          create: data.steps.map(step => ({
            order: step.order,
            delayHours: step.delayHours,
            delayDays: step.delayDays,
            subject: step.subject,
            htmlContent: step.htmlContent,
            textContent: step.textContent,
            conditions: step.conditions || {},
          })),
        },
      },
      include: { steps: { orderBy: { order: 'asc' } } },
    });
  }

  async updateEmailSequence(sequenceId: string, userId: string, data: any) {
    const sequence = await this.prisma.emailSequence.findFirst({
      where: { id: sequenceId, userId, deletedAt: null },
    });

    if (!sequence) {
      throw new Error('Email sequence not found');
    }

    if (data.steps) {
      await this.prisma.emailSequenceStep.deleteMany({ where: { sequenceId } });
      await this.prisma.emailSequenceStep.createMany({
        data: data.steps.map((step: any) => ({
          sequenceId,
          order: step.order,
          delayHours: step.delayHours,
          delayDays: step.delayDays,
          subject: step.subject,
          htmlContent: step.htmlContent,
          textContent: step.textContent,
          conditions: step.conditions || {},
        })),
      });
    }

    return this.prisma.emailSequence.update({
      where: { id: sequenceId },
      data: { name: data.name, description: data.description, isActive: data.isActive },
      include: { steps: { orderBy: { order: 'asc' } } },
    });
  }

  async deleteEmailSequence(sequenceId: string, userId: string) {
    const sequence = await this.prisma.emailSequence.findFirst({
      where: { id: sequenceId, userId, deletedAt: null },
    });

    if (!sequence) throw new Error('Email sequence not found');

    return this.prisma.emailSequence.update({
      where: { id: sequenceId },
      data: { deletedAt: new Date(), isActive: false },
    });
  }

  async getEmailSequences(userId: string, options?: { page?: number; limit?: number }) {
    const page = options?.page || 1;
    const limit = Math.min(options?.limit || 20, 100);
    const skip = (page - 1) * limit;

    const [sequences, total] = await Promise.all([
      this.prisma.emailSequence.findMany({
        where: { userId, deletedAt: null },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { steps: { orderBy: { order: 'asc' } }, _count: { select: { enrollments: true } } },
      }),
      this.prisma.emailSequence.count({ where: { userId, deletedAt: null } }),
    ]);

    return { data: sequences, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  // ============================================
  // EMAIL ENROLLMENT & SEQUENCE PROCESSING
  // ============================================

  async enrollInSequence(sequenceId: string, emailCaptureId: string) {
    const sequence = await this.prisma.emailSequence.findUnique({
      where: { id: sequenceId },
      include: { steps: { orderBy: { order: 'asc' } } },
    });

    if (!sequence || !sequence.isActive) {
      throw new Error('Sequence not found or inactive');
    }

    const enrollment = await this.prisma.emailEnrollment.create({
      data: {
        sequenceId,
        emailCaptureId,
        currentStep: 0,
        status: 'active',
        startedAt: new Date(),
      },
    });

    // Queue first email if sequence has steps
    if (sequence.steps.length > 0) {
      await this.queueService.addEmailJob({
        sequenceStepId: sequence.steps[0].id,
        delayMs: 0,
      } as any);
    }

    return enrollment;
  }

  async processSequenceStep(enrollmentId: string, sequenceStepId: string) {
    const enrollment = await this.prisma.emailEnrollment.findUnique({
      where: { id: enrollmentId },
      include: { 
        sequence: { include: { steps: { orderBy: { order: 'asc' } } } },
        emailCapture: true,
      },
    });

    if (!enrollment || enrollment.status !== 'active') {
      return;
    }

    const step = enrollment.sequence.steps.find(s => s.id === sequenceStepId);
    if (!step) return;

    const emailCapture = enrollment.emailCapture;
    if (!emailCapture) return;

    // Interpolate template variables
    const subject = this.interpolate(step.subject, emailCapture);
    const htmlContent = this.interpolate(step.htmlContent, emailCapture);
    const textContent = step.textContent ? this.interpolate(step.textContent, emailCapture) : undefined;

    // Send email
    await this.sendEmail({
      userId: enrollment.sequence.userId,
      toEmail: emailCapture.email,
      subject,
      htmlContent,
      textContent,
      sequenceStepId: step.id,
    } as any);

    // Calculate next send time
    const nextStepIndex = enrollment.sequence.steps.findIndex(s => s.id === sequenceStepId) + 1;
    
    if (nextStepIndex < enrollment.sequence.steps.length) {
      const nextStep = enrollment.sequence.steps[nextStepIndex];
      const delayMs = (nextStep.delayDays * 24 + nextStep.delayHours) * 60 * 60 * 1000;
      const nextSendAt = new Date(Date.now() + delayMs);

      await this.prisma.emailEnrollment.update({
        where: { id: enrollmentId },
        data: {
          currentStep: nextStepIndex,
        },
      });

      // Queue next email
      await this.queueService.addEmailJob({
        sequenceStepId: nextStep.id,
        delayMs,
      } as any);
    } else {
      // Sequence completed
      await this.prisma.emailEnrollment.update({
        where: { id: enrollmentId },
        data: {
          status: 'completed',
          completedAt: new Date(),
        },
      });
    }
  }

  // ============================================
  // EMAIL SENDING
  // ============================================

  async getEmailLogById(id: string) {
    return this.prisma.emailLog.findUnique({ where: { id } });
  }

  async sendEmail(data: {
    userId: string;
    toEmail: string;
    subject: string;
    htmlContent: string;
    textContent?: string;
    fromEmail?: string;
    emailCaptureId?: string;
    enrollmentId?: string;
    sequenceStepId?: string;
  }) {
    const { userId, toEmail, subject, htmlContent, textContent, fromEmail, emailCaptureId, enrollmentId, sequenceStepId } = data;

    // Create email log
    const emailLog = await this.prisma.emailLog.create({
      data: {
        userId,
        toEmail,
        fromEmail: fromEmail || this.configService.get<string>('SMTP_FROM'),
        subject,
        htmlContent,
        textContent,
        status: EmailStatus.PENDING,
        provider: EmailProvider.SMTP,
        emailCaptureId,
        enrollmentId,
        sequenceStepId,
      },
    });

    try {
      const result = await this.transporter.sendMail({
        from: `${this.configService.get<string>('SMTP_FROM_NAME')} <${fromEmail || this.configService.get<string>('SMTP_FROM')}>`,
        to: toEmail,
        subject,
        html: htmlContent,
        text: textContent,
      });

      await this.prisma.emailLog.update({
        where: { id: emailLog.id },
        data: {
          status: EmailStatus.SENT,
          providerMessageId: result.messageId,
          sentAt: new Date(),
        },
      });

      this.logger.log(`Email sent to ${toEmail}: ${subject}`);
      return { success: true, messageId: result.messageId };
    } catch (error) {
      this.logger.error(`Failed to send email to ${toEmail}`, error);

      await this.prisma.emailLog.update({
        where: { id: emailLog.id },
        data: {
          status: EmailStatus.FAILED,
          error: error.message,
        },
      });

      throw error;
    }
  }

  async sendBulkEmails(emails: Array<{
    userId: string;
    toEmail: string;
    subject: string;
    htmlContent: string;
    textContent?: string;
    fromEmail?: string;
  }>) {
    const results = await Promise.allSettled(
      emails.map(email => {
        const { userId, ...rest } = email;
        return this.sendEmail({ userId, ...rest });
      })
    );

    return results.map((result, index) => ({
      email: emails[index].toEmail,
      success: result.status === 'fulfilled',
      result: result.status === 'fulfilled' ? result.value : { error: result.reason?.message },
    }));
  }

  // ============================================
  // EMAIL LOGS & ANALYTICS
  // ============================================

  async getEmailLogs(userId: string, options?: {
    page?: number;
    limit?: number;
    status?: EmailStatus;
    emailCaptureId?: string;
    enrollmentId?: string;
  }) {
    const page = options?.page || 1;
    const limit = Math.min(options?.limit || 50, 100);
    const skip = (page - 1) * limit;

    const where: any = { userId };
    if (options?.status) where.status = options.status;
    if (options?.emailCaptureId) where.emailCaptureId = options.emailCaptureId;
    if (options?.enrollmentId) where.enrollmentId = options.enrollmentId;

    const [logs, total] = await Promise.all([
      this.prisma.emailLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.emailLog.count({ where }),
    ]);

    return { data: logs, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async getEmailStats(userId: string, days: number = 30) {
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const logs = await this.prisma.emailLog.findMany({
      where: { userId, createdAt: { gte: startDate } },
      select: { status: true, sentAt: true, openedAt: true, clickedAt: true },
    });

    const total = logs.length;
    const sent = logs.filter(l => l.status === EmailStatus.SENT || l.status === EmailStatus.DELIVERED).length;
    const delivered = logs.filter(l => l.status === EmailStatus.DELIVERED).length;
    const opened = logs.filter(l => l.openedAt).length;
    const clicked = logs.filter(l => l.clickedAt).length;
    const bounced = logs.filter(l => l.status === EmailStatus.BOUNCED).length;
    const unsubscribed = logs.filter(l => l.status === EmailStatus.UNSUBSCRIBED).length;

    return {
      total,
      sent,
      delivered,
      opened,
      clicked,
      bounced,
      unsubscribed,
      deliveryRate: sent > 0 ? (delivered / sent) * 100 : 0,
      openRate: delivered > 0 ? (opened / delivered) * 100 : 0,
      clickRate: delivered > 0 ? (clicked / delivered) * 100 : 0,
      bounceRate: sent > 0 ? (bounced / sent) * 100 : 0,
    };
  }

  // ============================================
  // EMAIL CAPTURES
  // ============================================

  async getEmailCaptures(userId: string, options?: {
    page?: number;
    limit?: number;
    channelId?: string;
    automationId?: string;
    landingPageId?: string;
    search?: string;
    fromDate?: string;
    toDate?: string;
  }) {
    const page = options?.page || 1;
    const limit = Math.min(options?.limit || 50, 100);
    const skip = (page - 1) * limit;

    const where: any = { userId };
    if (options?.channelId) where.channelId = options.channelId;
    if (options?.automationId) where.automationId = options.automationId;
    if (options?.landingPageId) where.landingPageId = options.landingPageId;
    if (options?.search) {
      where.OR = [
        { email: { contains: options.search, mode: 'insensitive' } },
        { firstName: { contains: options.search, mode: 'insensitive' } },
        { lastName: { contains: options.search, mode: 'insensitive' } },
      ];
    }
    if (options?.fromDate || options?.toDate) {
      where.createdAt = {};
      if (options.fromDate) where.createdAt.gte = new Date(options.fromDate);
      if (options.toDate) where.createdAt.lte = new Date(options.toDate);
    }

    const [captures, total] = await Promise.all([
      this.prisma.emailCapture.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          channel: { select: { id: true, title: true } },
          automation: { select: { id: true, name: true } },
          landingPage: { select: { id: true, name: true } },
        },
      }),
      this.prisma.emailCapture.count({ where }),
    ]);

    return { data: captures, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async captureEmail(data: {
    userId: string;
    channelId?: string;
    automationId?: string;
    landingPageId?: string;
    email: string;
    firstName?: string;
    lastName?: string;
    customFields?: Record<string, any>;
    source?: string;
    ipAddress?: string;
    userAgent?: string;
    referrer?: string;
    utmParams?: Record<string, any>;
  }) {
    const email = data.email.toLowerCase().trim();

    let emailCapture = await this.prisma.emailCapture.findFirst({
      where: { userId: data.userId, email },
    });

    if (!emailCapture) {
      emailCapture = await this.prisma.emailCapture.create({
        data: {
          userId: data.userId,
          channelId: data.channelId,
          automationId: data.automationId,
          landingPageId: data.landingPageId,
          email,
          firstName: data.firstName,
          lastName: data.lastName,
          customFields: data.customFields || {},
          source: data.source || 'manual',
          ipAddress: data.ipAddress,
          userAgent: data.userAgent,
          referrer: data.referrer,
          ...data.utmParams,
        },
      });
    }

    // Check if any sequences should be triggered
    const sequences = await this.prisma.emailSequence.findMany({
      where: { 
        userId: data.userId, 
        isActive: true,
        deletedAt: null,
        triggerType: { in: ['landing_page_submit', 'immediate'] },
      },
    });

    for (const sequence of sequences) {
      const shouldTrigger = this.shouldTriggerSequence(sequence, data);
      if (shouldTrigger) {
        await this.enrollInSequence(sequence.id, emailCapture.id);
      }
    }

    return emailCapture;
  }

  private shouldTriggerSequence(sequence: any, data: any): boolean {
    const triggerConfig = sequence.triggerConfig || {};
    
    switch (sequence.triggerType) {
      case 'landing_page_submit':
        return triggerConfig.landingPageId === data.landingPageId;
      case 'immediate':
        return true;
      case 'tag_added':
        return triggerConfig.tags?.some((tag: string) => data.customFields?.tags?.includes(tag));
      default:
        return false;
    }
  }

  // ============================================
  // UTILITY METHODS
  // ============================================

  private interpolate(template: string, capture: any): string {
    if (!template) return '';
    
    return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      const value = capture[key];
      if (value !== undefined) return String(value);
      if (capture.customFields?.[key] !== undefined) return String(capture.customFields[key]);
      return match;
    });
  }

  async unsubscribeEmail(email: string, userId: string) {
    return this.prisma.emailCapture.updateMany({
      where: { email: email.toLowerCase(), userId },
      data: { unsubscribedAt: new Date() },
    });
  }

  async verifyEmail(email: string, userId: string) {
    return this.prisma.emailCapture.updateMany({
      where: { email: email.toLowerCase(), userId },
      data: { isVerified: true, verifiedAt: new Date() },
    });
  }
}