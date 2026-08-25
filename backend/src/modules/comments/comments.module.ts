import { Module } from '@nestjs/common';
import { CommentsController } from './comments.controller';
import { CommentMonitorService } from './services/comment-monitor.service';
import { PrismaModule } from '../../database/prisma.module';
import { QueueModule } from '../../queue/queue.module';
import { YouTubeModule } from '../youtube/youtube.module';
import { AutomationsModule } from '../automations/automations.module';

@Module({
  imports: [PrismaModule, QueueModule, YouTubeModule, AutomationsModule],
  controllers: [CommentsController],
  providers: [CommentMonitorService],
  exports: [CommentMonitorService],
})
export class CommentsModule {}