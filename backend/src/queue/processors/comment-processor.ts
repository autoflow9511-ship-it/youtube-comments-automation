import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { QueueName, CommentJobData } from '@queue/queue.service';
import { CommentMonitorService } from '@modules/comments/services/comment-monitor.service';

@Processor(QueueName.COMMENTS)
@Injectable()
export class CommentProcessor extends WorkerHost {
  private readonly logger = new Logger(CommentProcessor.name);

  constructor(private readonly commentMonitor: CommentMonitorService) {
    super();
  }

  async process(job: Job<CommentJobData>) {
    const result = await this.commentMonitor.fetchAndProcessComments(job.data.channelId);
    if (!result.success) {
      throw new Error(result.error || 'Comment fetch failed');
    }
    return result;
  }

  @OnWorkerEvent('completed')
  onCompleted(job: Job) {
    this.logger.debug(`Comment job ${job.id} completed`);
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job, error: Error) {
    this.logger.error(`Comment job ${job.id} failed: ${error.message}`);
  }
}
