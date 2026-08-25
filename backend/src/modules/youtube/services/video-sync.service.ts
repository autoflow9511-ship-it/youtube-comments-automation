import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../../database/prisma.service';
import { YouTubeApiService } from './youtube-api.service';
import { ChannelStatus } from '@prisma/client';

export interface VideoSyncResult {
  success: boolean;
  synced: number;
  updated: number;
  errors: number;
  channelId: string;
}

@Injectable()
export class VideoSyncService {
  private readonly logger = new Logger(VideoSyncService.name);

  constructor(
    private prisma: PrismaService,
    private youtubeApiService: YouTubeApiService,
  ) {}

  // ============================================
  // SCHEDULED SYNC — runs every hour for all channels
  // ============================================

  @Cron(CronExpression.EVERY_HOUR)
  async syncAllChannels(): Promise<void> {
    this.logger.log('Starting scheduled video sync for all channels');

    const channels = await this.prisma.channel.findMany({
      where: { status: ChannelStatus.CONNECTED, deletedAt: null },
      select: { id: true },
    });

    this.logger.log(`Syncing videos for ${channels.length} channels`);

    for (const channel of channels) {
      try {
        await this.syncVideosForChannel(channel.id);
      } catch (error) {
        this.logger.error(`Video sync failed for channel ${channel.id}: ${error.message}`);
      }
    }
  }

  // ============================================
  // SYNC VIDEOS FOR A SINGLE CHANNEL
  // ============================================

  async syncVideosForChannel(channelId: string): Promise<VideoSyncResult> {
    const result: VideoSyncResult = {
      success: false,
      synced: 0,
      updated: 0,
      errors: 0,
      channelId,
    };

    const channel = await this.prisma.channel.findUnique({
      where: { id: channelId },
    });

    if (!channel || channel.status !== ChannelStatus.CONNECTED) {
      this.logger.warn(`Channel ${channelId} not found or not connected`);
      return result;
    }

    const accessToken = await this.youtubeApiService.getValidAccessToken(channelId);
    if (!accessToken) {
      this.logger.error(`Could not get valid access token for channel ${channelId}`);
      return result;
    }

    try {
      let pageToken: string | undefined;
      let totalSynced = 0;
      let totalUpdated = 0;
      const MAX_PAGES = 10; // Prevent infinite loop — max 500 videos per sync
      let page = 0;

      do {
        const response = await this.youtubeApiService.getChannelVideos(
          channel.youtubeChannelId,
          accessToken,
          undefined,
          { maxResults: 50, pageToken },
        );

        for (const video of response.items) {
          try {
            const existing = await this.prisma.video.findUnique({
              where: { youtubeVideoId: video.id },
            });

            const videoData = {
              userId: channel.userId,
              channelId: channel.id,
              youtubeVideoId: video.id,
              title: video.snippet.title,
              description: video.snippet.description || null,
              thumbnailUrl:
                (video.snippet.thumbnails as any)?.high?.url ||
                (video.snippet.thumbnails as any)?.medium?.url ||
                (video.snippet.thumbnails as any)?.default?.url ||
                null,
              publishedAt: new Date(video.snippet.publishedAt),
              viewCount: parseInt(video.statistics?.viewCount || '0'),
              likeCount: parseInt(video.statistics?.likeCount || '0'),
              commentCount: parseInt(video.statistics?.commentCount || '0'),
              syncedAt: new Date(),
            };

            if (existing) {
              // Update stats only — title/description rarely changes
              await this.prisma.video.update({
                where: { youtubeVideoId: video.id },
                data: {
                  title: videoData.title,
                  description: videoData.description,
                  thumbnailUrl: videoData.thumbnailUrl,
                  viewCount: videoData.viewCount,
                  likeCount: videoData.likeCount,
                  commentCount: videoData.commentCount,
                  syncedAt: videoData.syncedAt,
                },
              });
              totalUpdated++;
            } else {
              await this.prisma.video.create({ data: videoData });
              totalSynced++;
            }
          } catch (videoError) {
            this.logger.error(`Failed to upsert video ${video.id}: ${videoError.message}`);
            result.errors++;
          }
        }

        pageToken = response.nextPageToken as string | undefined;
        page++;
      } while (pageToken && page < MAX_PAGES);

      // Update channel videoCount to match DB
      await this.prisma.channel.update({
        where: { id: channelId },
        data: {
          videoCount: await this.prisma.video.count({ where: { channelId } }),
          lastSyncedAt: new Date(),
          syncError: null,
        },
      });

      result.success = true;
      result.synced = totalSynced;
      result.updated = totalUpdated;

      this.logger.log(
        `Video sync done for channel ${channelId}: ${totalSynced} new, ${totalUpdated} updated, ${result.errors} errors`,
      );
    } catch (error) {
      this.logger.error(`Video sync error for channel ${channelId}: ${error.message}`);

      await this.prisma.channel.update({
        where: { id: channelId },
        data: { syncError: `Video sync failed: ${error.message}` },
      });
    }

    return result;
  }

  // ============================================
  // GET VIDEOS FOR AUTOMATION BUILDER (video selector)
  // ============================================

  async getVideosForSelector(
    channelId: string,
    userId: string,
    options?: { search?: string; limit?: number },
  ) {
    const where: any = { channelId, userId };

    if (options?.search) {
      where.title = { contains: options.search, mode: 'insensitive' };
    }

    return this.prisma.video.findMany({
      where,
      take: options?.limit || 100,
      orderBy: { publishedAt: 'desc' },
      select: {
        id: true,
        youtubeVideoId: true,
        title: true,
        thumbnailUrl: true,
        publishedAt: true,
        viewCount: true,
        commentCount: true,
      },
    });
  }
}
