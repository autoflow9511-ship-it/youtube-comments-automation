import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { QueueName, AutomationJobData } from '@queue/queue.service';
import { AutomationEngineService } from '@modules/automations/services/automation-engine.service';

@Processor(QueueName.AUTOMATIONS)
@Injectable()
export class AutomationProcessor extends WorkerHost {
  private readonly logger = new Logger(AutomationProcessor.name);

  constructor(private readonly automationEngine: AutomationEngineService) {
    super();
  }

  async process(job: Job<AutomationJobData>) {
    const { automationId, triggerData } = job.data;
    const executionId = job.data.executionId;

    await this.automationEngine.executeAutomation({
      automationId,
      triggerData,
      channelId: triggerData.channelId,
      userId: triggerData.userId,
      executionId,
    });

    return { success: true, executionId };
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
