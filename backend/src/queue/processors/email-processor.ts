import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@database/prisma.service';
import { EmailsService } from '@modules/emails/emails.service';
import { QueueService, EmailJobData } from '@queue/queue.service';
import { EmailStatus } from '@prisma/client';

@Processor(QueueService.EMAILS)
@Injectable()
export class EmailProcessor extends WorkerHost {
  private readonly logger = new Logger(EmailProcessor.name);

  constructor(
    private prisma: PrismaService,
    private emailsService: EmailsService,
    private queueService: QueueService,
  ) {
    super();
  }

  async process(job: Job<EmailJobData>) {
    const { emailLogId, toEmail, subject, htmlContent, textContent } = job.data;

    try {
      this.logger.log(`Sending email to ${toEmail}`);

      const result = await this.emailsService.sendEmail({
        userId: '', 
        toEmail,
        subject,
        htmlContent,
        textContent,
      });

      return { success: true, messageId: result.messageId };
    } catch (error) {
      this.logger.error(`Failed to send email to ${toEmail}`, error);
      throw error;
    }
  }

  @OnWorkerEvent('completed')
  onCompleted(job: Job) {
    this.logger.debug(`Email job ${job.id} completed`);
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job, error: Error) {
    this.logger.error(`Email job ${job.id} failed: ${error.message}`);
  }
}