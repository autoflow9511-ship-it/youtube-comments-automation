import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@database/prisma.service';
import { EmailStatus, EmailProvider } from '@prisma/client';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailsService {
  private transporter: nodemailer.Transporter;

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {
    this.transporter = nodemailer.createTransport({
      host: configService.get<string>('email.host'),
      port: configService.get<number>('email.port'),
      secure: configService.get<boolean>('email.secure'),
      auth: {
        user: configService.get<string>('email.user'),
        pass: configService.get<string>('email.pass'),
      },
    });
  }

  async findCaptures(userId: string, params: {
    page?: number;
    limit?: number;
    channelId?: string;
    automationId?: string;
    search?: string;
  }) {
    const { page = 1, limit = 50, channelId, automationId, search } = params;
    const skip = (page - 1) * limit;

    const where: any = { userId };
    if (channelId) where.channelId = channelId;
    if (automationId) where.automationId = automationId;
    if (search) {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
      ];
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

  async findSequences(userId: string, params: { page?: number; limit?: number }) {
    const { page = 1, limit = 20 } = params;
    const skip = (page - 1) * limit;

    const [sequences, total] = await Promise.all([
      this.prisma.emailSequence.findMany({
        where: { userId, deletedAt: null },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          steps: { orderBy: { order: 'asc' } },
          _count: { select: { enrollments: true } },
        },
      }),
      this.prisma.emailSequence.count({ where: { userId, deletedAt: null } }),
    ]);

    return { data: sequences, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async createSequence(userId: string, data: {
    name: string;
    description?: string;
    triggerType: string;
    triggerConfig: any;
    steps: Array<{
      order: number;
      delayHours: number;
      delayDays: number;
      subject: string;
      htmlContent: string;
      textContent?: string;
      conditions?: any;
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
      include: { steps: true },
    });
  }

  async updateSequence(userId: string, id: string, data: any) {
    const sequence = await this.prisma.emailSequence.findFirst({
      where: { id, userId, deletedAt: null },
    });

    if (!sequence) throw new NotFoundException('Email sequence not found');

    if (data.steps) {
      await this.prisma.emailSequenceStep.deleteMany({ where: { sequenceId: id } });
      await this.prisma.emailSequenceStep.createMany({
        data: data.steps.map((step: any) => ({
          sequenceId: id,
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
      where: { id },
      data: { name: data.name, description: data.description, isActive: data.isActive },
      include: { steps: { orderBy: { order: 'asc' } } },
    });
  }

  async deleteSequence(userId: string, id: string) {
    const sequence = await this.prisma.emailSequence.findFirst({
      where: { id, userId, deletedAt: null },
    });
    if (!sequence) throw new NotFoundException('Email sequence not found');

    return this.prisma.emailSequence.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false },
    });
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
    const emailLog = await this.prisma.emailLog.create({
      data: {
        userId: data.userId,
        toEmail: data.toEmail,
        fromEmail: data.fromEmail || this.configService.get<string>('email.from'),
        subject: data.subject,
        htmlContent: data.htmlContent,
        textContent: data.textContent,
        status: EmailStatus.PENDING,
        provider: EmailProvider.SMTP,
        emailCaptureId: data.emailCaptureId,
        enrollmentId: data.enrollmentId,
        sequenceStepId: data.sequenceStepId,
      },
    });

    try {
      const result = await this.transporter.sendMail({
        from: `${this.configService.get<string>('email.fromName')} <${data.fromEmail || this.configService.get<string>('email.from')}>`,
        to: data.toEmail,
        subject: data.subject,
        html: data.htmlContent,
        text: data.textContent,
      });

      await this.prisma.emailLog.update({
        where: { id: emailLog.id },
        data: {
          status: EmailStatus.SENT,
          providerMessageId: result.messageId,
          sentAt: new Date(),
        },
      });

      return { success: true, messageId: result.messageId };
    } catch (error) {
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

  async getLogs(userId: string, params: {
    page?: number;
    limit?: number;
    status?: EmailStatus;
    emailCaptureId?: string;
  }) {
    const { page = 1, limit = 50, status, emailCaptureId } = params;
    const skip = (page - 1) * limit;

    const where: any = { userId };
    if (status) where.status = status;
    if (emailCaptureId) where.emailCaptureId = emailCaptureId;

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
}