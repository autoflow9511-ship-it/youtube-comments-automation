import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { SchedulerService } from './scheduler.service';
import { QueueModule } from '@queue/queue.module';
import { ChannelsModule } from '@modules/channels/channels.module';
import { YouTubeModule } from '@modules/youtube/youtube.module';
import { EmailsModule } from '@modules/emails/emails.module';

@Module({
  imports: [ScheduleModule.forRoot(), QueueModule, ChannelsModule, YouTubeModule, EmailsModule],
  providers: [SchedulerService],
  exports: [SchedulerService],
})
export class SchedulerModule {}
