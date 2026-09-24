import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { EmailsService } from '@modules/emails/services/emails.service';
import { QueueName, EmailJobData } from '@queue/queue.service';

@Processor(QueueName.EMAILS)
@Injectable()
export class EmailProcessor extends WorkerHost {
  private readonly logger = new Logger(EmailProcessor.name);

  constructor(private readonly emailsService: EmailsService) {
    super();
  }

  async process(job: Job<EmailJobData>) {
    const { emailLogId, toEmail, subject, htmlContent, textContent } = job.data;
    const log = emailLogId ? await this.emailsService.getEmailLogById(emailLogId) : null;
    if (!log) throw new Error('Email log not found');
    const result = await this.emailsService.sendEmail({
      userId: log.userId,
      toEmail: toEmail || log.toEmail,
      subject: subject || log.subject,
      htmlContent: htmlContent || log.htmlContent,
      textContent: textContent || log.textContent || undefined,
      emailCaptureId: log.emailCaptureId || undefined,
      enrollmentId: log.enrollmentId || undefined,
      sequenceStepId: log.sequenceStepId || undefined,
    });
    return { success: true, messageId: result.messageId };
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
