import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';
import { YouTubeApiService } from './services/youtube-api.service';
import { VideoSyncService } from './services/video-sync.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { PrismaService } from '../../database/prisma.service';
import { ChannelStatus } from '@prisma/client';

@ApiTags('YouTube')
@Controller('youtube')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class YouTubeController {
  constructor(
    private youtubeApiService: YouTubeApiService,
    private videoSyncService: VideoSyncService,
    private prisma: PrismaService,
  ) {}

  // ============================================
  // CHANNEL ENDPOINTS
  // ============================================

  @Get('channels')
  @ApiOperation({ summary: 'Get all connected channels for current user' })
  @ApiResponse({ status: 200, description: 'List of connected channels' })
  async getUserChannels(@CurrentUser('id') userId: string) {
    const channels = await this.prisma.channel.findMany({
      where: { userId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        youtubeChannelId: true,
        title: true,
        description: true,
        customUrl: true,
        thumbnailUrl: true,
        subscriberCount: true,
        videoCount: true,
        viewCount: true,
        status: true,
        scope: true,
        lastSyncedAt: true,
        syncError: true,
        createdAt: true,
        updatedAt: true,
        // Never expose accessToken / refreshToken
      },
    });
    return { data: channels };
  }

  @Get('channels/:channelId')
  @ApiOperation({ summary: 'Get channel information' })
  @ApiParam({ name: 'channelId', description: 'Internal channel ID' })
  @ApiResponse({ status: 200, description: 'Channel information' })
  @ApiResponse({ status: 404, description: 'Channel not found' })
  async getChannel(
    @CurrentUser('id') userId: string,
    @Param('channelId') channelId: string,
  ) {
    const channel = await this.prisma.channel.findFirst({
      where: { id: channelId, userId, deletedAt: null },
      select: {
        id: true,
        youtubeChannelId: true,
        title: true,
        description: true,
        customUrl: true,
        thumbnailUrl: true,
        subscriberCount: true,
        videoCount: true,
        viewCount: true,
        status: true,
        scope: true,
        lastSyncedAt: true,
        syncError: true,
        createdAt: true,
        updatedAt: true,
        _count: { select: { automations: true, comments: true, videos: true } },
      },
    });

    if (!channel) {
      throw new NotFoundException('Channel not found');
    }

    return channel;
  }

  @Post('channels/:channelId/sync')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh channel info from YouTube' })
  @ApiParam({ name: 'channelId', description: 'Internal channel ID' })
  @ApiResponse({ status: 200, description: 'Channel refreshed successfully' })
  async refreshChannel(
    @CurrentUser('id') userId: string,
    @Param('channelId') channelId: string,
  ) {
    const channel = await this.prisma.channel.findFirst({
      where: { id: channelId, userId, deletedAt: null },
    });

    if (!channel) throw new NotFoundException('Channel not found');
    if (channel.status !== ChannelStatus.CONNECTED) {
      throw new ForbiddenException('Channel is not connected');
    }

    const accessToken = await this.youtubeApiService.getValidAccessToken(channelId);
    if (!accessToken) throw new ForbiddenException('Unable to get valid access token');

    const info = await this.youtubeApiService.getChannelInfo(
      channel.youtubeChannelId,
      accessToken,
    );

    const updated = await this.prisma.channel.update({
      where: { id: channelId },
      data: {
        title: info.snippet.title,
        description: info.snippet.description,
        customUrl: info.snippet.customUrl,
        thumbnailUrl:
          info.snippet.thumbnails?.high?.url ||
          info.snippet.thumbnails?.default?.url,
        subscriberCount: parseInt(info.statistics.subscriberCount || '0'),
        videoCount: parseInt(info.statistics.videoCount || '0'),
        viewCount: BigInt(info.statistics.viewCount || '0'),
        lastSyncedAt: new Date(),
        syncError: null,
      },
      select: {
        id: true,
        title: true,
        thumbnailUrl: true,
        subscriberCount: true,
        videoCount: true,
        viewCount: true,
        lastSyncedAt: true,
        status: true,
      },
    });

    return { success: true, channel: updated };
  }

  // ============================================
  // VIDEO ENDPOINTS
  // ============================================

  @Get('channels/:channelId/videos')
  @ApiOperation({ summary: 'Get channel videos (from DB, synced from YouTube)' })
  @ApiParam({ name: 'channelId', description: 'Internal channel ID' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiResponse({ status: 200, description: 'List of videos' })
  async getChannelVideos(
    @CurrentUser('id') userId: string,
    @Param('channelId') channelId: string,
    @Query('page') page = 1,
    @Query('limit') limit = 50,
    @Query('search') search?: string,
  ) {
    const channel = await this.prisma.channel.findFirst({
      where: { id: channelId, userId, deletedAt: null },
    });
    if (!channel) throw new NotFoundException('Channel not found');

    const where: any = { channelId };
    if (search) {
      where.title = { contains: search, mode: 'insensitive' };
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [videos, total] = await Promise.all([
      this.prisma.video.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { publishedAt: 'desc' },
        select: {
          id: true,
          youtubeVideoId: true,
          title: true,
          description: true,
          thumbnailUrl: true,
          publishedAt: true,
          viewCount: true,
          likeCount: true,
          commentCount: true,
          syncedAt: true,
        },
      }),
      this.prisma.video.count({ where }),
    ]);

    return {
      data: videos,
      meta: { total, page: Number(page), limit: Number(limit), totalPages: Math.ceil(total / Number(limit)) },
    };
  }

  @Post('channels/:channelId/videos/sync')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Sync videos from YouTube API into database' })
  @ApiParam({ name: 'channelId', description: 'Internal channel ID' })
  @ApiResponse({ status: 200, description: 'Videos synced' })
  async syncVideos(
    @CurrentUser('id') userId: string,
    @Param('channelId') channelId: string,
  ) {
    const channel = await this.prisma.channel.findFirst({
      where: { id: channelId, userId, deletedAt: null },
    });
    if (!channel) throw new NotFoundException('Channel not found');
    if (channel.status !== ChannelStatus.CONNECTED) {
      throw new ForbiddenException('Channel is not connected');
    }

    const result = await this.videoSyncService.syncVideosForChannel(channelId);
    return result;
  }

  @Get('videos/:videoId')
  @ApiOperation({ summary: 'Get a single video by internal ID' })
  @ApiParam({ name: 'videoId', description: 'Internal video DB ID' })
  @ApiResponse({ status: 200, description: 'Video information' })
  @ApiResponse({ status: 404, description: 'Video not found' })
  async getVideo(
    @CurrentUser('id') userId: string,
    @Param('videoId') videoId: string,
  ) {
    const video = await this.prisma.video.findFirst({
      where: { id: videoId, userId },
      select: {
        id: true,
        youtubeVideoId: true,
        title: true,
        description: true,
        thumbnailUrl: true,
        publishedAt: true,
        viewCount: true,
        likeCount: true,
        commentCount: true,
        syncedAt: true,
        channel: { select: { id: true, title: true, youtubeChannelId: true } },
      },
    });

    if (!video) throw new NotFoundException('Video not found');
    return video;
  }

  // ============================================
  // COMMENT ENDPOINTS
  // ============================================

  @Get('channels/:channelId/comments')
  @ApiOperation({ summary: 'Get stored comments for a channel' })
  @ApiParam({ name: 'channelId', description: 'Internal channel ID' })
  @ApiQuery({ name: 'videoId', required: false, type: String })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'processed', required: false, type: Boolean })
  @ApiResponse({ status: 200, description: 'List of comments' })
  async getChannelComments(
    @CurrentUser('id') userId: string,
    @Param('channelId') channelId: string,
    @Query('videoId') videoId?: string,
    @Query('page') page = 1,
    @Query('limit') limit = 50,
    @Query('processed') processed?: string,
  ) {
    const channel = await this.prisma.channel.findFirst({
      where: { id: channelId, userId, deletedAt: null },
    });
    if (!channel) throw new NotFoundException('Channel not found');

    const where: any = { channelId };
    if (videoId) where.videoId = videoId;
    if (processed === 'true') where.processedAt = { not: null };
    if (processed === 'false') where.processedAt = null;

    const skip = (Number(page) - 1) * Number(limit);

    const [comments, total] = await Promise.all([
      this.prisma.comment.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { publishedAt: 'desc' },
        include: {
          replies: { select: { id: true, text: true, status: true, sentAt: true } },
        },
      }),
      this.prisma.comment.count({ where }),
    ]);

    return {
      data: comments,
      meta: { total, page: Number(page), limit: Number(limit), totalPages: Math.ceil(total / Number(limit)) },
    };
  }

  @Post('channels/:channelId/comments/:youtubeCommentId/reply')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Reply to a comment via YouTube API' })
  @ApiParam({ name: 'channelId', description: 'Internal channel ID' })
  @ApiParam({ name: 'youtubeCommentId', description: 'YouTube comment ID' })
  @ApiBody({ schema: { properties: { text: { type: 'string' } } } })
  @ApiResponse({ status: 201, description: 'Reply posted successfully' })
  async replyToComment(
    @CurrentUser('id') userId: string,
    @Param('channelId') channelId: string,
    @Param('youtubeCommentId') youtubeCommentId: string,
    @Body() body: { text: string },
  ) {
    const channel = await this.prisma.channel.findFirst({
      where: { id: channelId, userId, deletedAt: null },
    });
    if (!channel) throw new NotFoundException('Channel not found');

    const accessToken = await this.youtubeApiService.getValidAccessToken(channelId);
    if (!accessToken) throw new ForbiddenException('Unable to get valid access token');

    const replyId = await this.youtubeApiService.replyToComment(
      youtubeCommentId,
      body.text,
      accessToken,
    );

    return { success: true, replyId };
  }

  @Delete('channels/:channelId/comments/:youtubeCommentId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a comment via YouTube API' })
  @ApiParam({ name: 'channelId', description: 'Internal channel ID' })
  @ApiParam({ name: 'youtubeCommentId', description: 'YouTube comment ID' })
  @ApiResponse({ status: 200, description: 'Comment deleted' })
  async deleteComment(
    @CurrentUser('id') userId: string,
    @Param('channelId') channelId: string,
    @Param('youtubeCommentId') youtubeCommentId: string,
  ) {
    const channel = await this.prisma.channel.findFirst({
      where: { id: channelId, userId, deletedAt: null },
    });
    if (!channel) throw new NotFoundException('Channel not found');

    const accessToken = await this.youtubeApiService.getValidAccessToken(channelId);
    if (!accessToken) throw new ForbiddenException('Unable to get valid access token');

    await this.youtubeApiService.deleteComment(youtubeCommentId, accessToken);
    return { success: true };
  }

  @Post('channels/:channelId/comments/:youtubeCommentId/moderate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Set comment moderation status' })
  @ApiParam({ name: 'channelId', description: 'Internal channel ID' })
  @ApiParam({ name: 'youtubeCommentId', description: 'YouTube comment ID' })
  @ApiBody({
    schema: {
      properties: {
        status: { type: 'string', enum: ['heldForReview', 'published', 'rejected'] },
      },
    },
  })
  async moderateComment(
    @CurrentUser('id') userId: string,
    @Param('channelId') channelId: string,
    @Param('youtubeCommentId') youtubeCommentId: string,
    @Body() body: { status: 'heldForReview' | 'published' | 'rejected' },
  ) {
    const channel = await this.prisma.channel.findFirst({
      where: { id: channelId, userId, deletedAt: null },
    });
    if (!channel) throw new NotFoundException('Channel not found');

    const accessToken = await this.youtubeApiService.getValidAccessToken(channelId);
    if (!accessToken) throw new ForbiddenException('Unable to get valid access token');

    await this.youtubeApiService.setCommentModerationStatus(
      youtubeCommentId,
      body.status,
      accessToken,
    );

    return { success: true };
  }

  // ============================================
  // QUOTA ENDPOINT
  // ============================================

  @Get('channels/:channelId/quota')
  @ApiOperation({ summary: 'Get API quota usage for channel' })
  @ApiParam({ name: 'channelId', description: 'Internal channel ID' })
  @ApiResponse({ status: 200, description: 'Quota usage information' })
  async getQuotaUsage(
    @CurrentUser('id') userId: string,
    @Param('channelId') channelId: string,
  ) {
    const channel = await this.prisma.channel.findFirst({
      where: { id: channelId, userId, deletedAt: null },
    });
    if (!channel) throw new NotFoundException('Channel not found');

    // Reset time — YouTube quota resets at midnight Pacific Time
    const now = new Date();
    const resetAt = new Date(now);
    resetAt.setUTCHours(7, 0, 0, 0); // midnight PT = 07:00 UTC
    if (resetAt <= now) resetAt.setUTCDate(resetAt.getUTCDate() + 1);

    return {
      used: 0,
      limit: 10000,
      remaining: 10000,
      resetAt: resetAt.toISOString(),
    };
  }
}
