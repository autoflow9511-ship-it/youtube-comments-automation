import { Module, Global } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { QueueService } from './queue.service';
import { CommentProcessor } from './processors/comment-processor';
import { AutomationProcessor } from './processors/automation-processor';
import { EmailProcessor } from './processors/email-processor';
import { WebhookProcessor } from './processors/webhook-processor';

@Global()
@Module({
  imports: [
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        connection: {
          host: configService.get<string>('redis.host') || 'localhost',
          port: configService.get<number>('redis.port') || 6379,
          password: configService.get<string>('redis.password') || undefined,
          db: configService.get<number>('redis.db') || 0,
        },
        defaultJobOptions: {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 2000,
          },
          removeOnComplete: 100,
          removeOnFail: 50,
        },
      }),
    }),
    BullModule.registerQueue(
      { name: 'comments' },
      { name: 'automations' },
      { name: 'emails' },
      { name: 'webhooks' },
    ),
  ],
  providers: [
    QueueService,
    CommentProcessor,
    AutomationProcessor,
    EmailProcessor,
    WebhookProcessor,
  ],
  exports: [QueueService, BullModule],
})
export class QueueModule {}