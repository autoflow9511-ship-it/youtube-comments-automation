import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { SchedulerService } from './scheduler.service';
import { QueueModule } from '@queue/queue.module';
import { YouTubeService } from '@youtube/youtube.service';
import { EmailsService } from '@modules/emails/emails.service';
import { ChannelsModule } from '@modules/channels/channels.module';
import { AutomationsModule } from '@modules/automations/automations.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    QueueModule,
    ChannelsModule,
    AutomationsModule,
  ],
  providers: [SchedulerService, YouTubeService, EmailsService],
  exports: [SchedulerService, YouTubeService],
})
export class SchedulerModule {}