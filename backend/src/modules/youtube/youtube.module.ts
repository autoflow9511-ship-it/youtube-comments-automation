import { Module } from '@nestjs/common';
import { YouTubeController } from './youtube.controller';
import { YouTubeApiService } from './services/youtube-api.service';
import { VideoSyncService } from './services/video-sync.service';
import { PrismaModule } from '../../database/prisma.module';
import { CommonModule } from '../../common/common.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [PrismaModule, CommonModule, AuthModule],
  controllers: [YouTubeController],
  providers: [YouTubeApiService, VideoSyncService],
  exports: [YouTubeApiService, VideoSyncService],
})
export class YouTubeModule {}
