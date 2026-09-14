import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { google, youtube_v3, Auth } from 'googleapis';
import { PrismaService } from '../../../database/prisma.service';
import { EncryptionService } from '../../../common/services/encryption.service';
import { ChannelStatus } from '@prisma/client';

export interface YouTubeChannelInfo {
  id: string;
  snippet: {
    title: string;
    description: string;
    customUrl?: string;
    publishedAt: string;
    thumbnails: {
      default: { url: string; width: number; height: number };
      medium: { url: string; width: number; height: number };
      high: { url: string; width: number; height: number };
    };
  };
  statistics: {
    subscriberCount: string;
    videoCount: string;
    viewCount: string;
    hiddenSubscriberCount?: boolean;
  };
  contentDetails: {
    relatedPlaylists: {
      uploads: string;
      likes: string;
      favorites: string;
    };
  };
}

export interface CommentThread {
  id: string;
  snippet: {
    channelId: string;
    videoId: string;
    topLevelComment: {
      id: string;
      snippet: {
        channelId: string;
        videoId: string;
        authorChannelId: { value: string };
        authorDisplayName: string;
        authorProfileImageUrl: string;
        textDisplay: string;
        textOriginal: string;
        likeCount: number;
        publishedAt: string;
        updatedAt: string;
      };
    };
    totalReplyCount: number;
    isPublic: boolean;
  };
  replies?: {
    comments: Array<{
      id: string;
      snippet: {
        channelId: string;
        videoId: string;
        authorChannelId: { value: string };
        authorDisplayName: string;
        authorProfileImageUrl: string;
        textDisplay: string;
        textOriginal: string;
        likeCount: number;
        publishedAt: string;
        updatedAt: string;
        parentId: string;
      };
    }>;
  };
}

export interface VideoInfo {
  id: string;
  snippet: {
    title: string;
    description: string;
    publishedAt: string;
    channelId: string;
    channelTitle: string;
    thumbnails: {
      default: { url: string };
      medium: { url: string };
      high: { url: string };
    };
  };
  statistics: {
    viewCount: string;
    likeCount: string;
    commentCount: string;
  };
}

@Injectable()
export class YouTubeApiService {
  private readonly logger = new Logger(YouTubeApiService.name);
  private readonly youtubeApiKey: string;

  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
    private encryptionService: EncryptionService,
  ) {
    this.youtubeApiKey = configService.get<string>('YOUTUBE_API_KEY') || '';
  }

  // ============================================
  // OAUTH2 CLIENT MANAGEMENT
  // ============================================

  createOAuth2Client(accessToken: string, refreshToken?: string): Auth.OAuth2Client {
    const oauth2Client = new google.auth.OAuth2(
      this.configService.get<string>('GOOGLE_CLIENT_ID'),
      this.configService.get<string>('GOOGLE_CLIENT_SECRET'),
      this.configService.get<string>('GOOGLE_CALLBACK_URL'),
    );

    oauth2Client.setCredentials({
      access_token: accessToken,
      refresh_token: refreshToken,
    });

    return oauth2Client;
  }

  async getOAuth2ClientForChannel(channelId: string): Promise<Auth.OAuth2Client> {
    const channel = await this.prisma.channel.findUnique({
      where: { id: channelId },
    });

    if (!channel) {
      throw new BadRequestException('Channel not found');
    }

    const accessToken = this.encryptionService.decrypt(channel.accessToken);
    const refreshToken = this.encryptionService.decrypt(channel.refreshToken);

    const oauth2Client = this.createOAuth2Client(accessToken, refreshToken);

    // Check if token needs refresh
    const now = new Date();
    const expiryBuffer = 5 * 60 * 1000; // 5 minutes
    if (channel.tokenExpiresAt && new Date(channel.tokenExpiresAt).getTime() - now.getTime() < expiryBuffer) {
      this.logger.log(`Refreshing access token for channel ${channelId}`);
      await this.refreshChannelToken(channelId, oauth2Client);
    }

    return oauth2Client;
  }

  // ============================================
  // TOKEN MANAGEMENT
  // ============================================

  async refreshChannelToken(channelId: string, oauth2Client?: Auth.OAuth2Client): Promise<string> {
    const channel = await this.prisma.channel.findUnique({
      where: { id: channelId },
    });

    if (!channel || !channel.refreshToken) {
      throw new BadRequestException('No refresh token available');
    }

    try {
      const client = oauth2Client || this.createOAuth2Client(
        this.encryptionService.decrypt(channel.accessToken),
        this.encryptionService.decrypt(channel.refreshToken),
      );

      const { credentials } = await client.refreshAccessToken();

      if (credentials.access_token && credentials.expiry_date) {
        const encryptedAccessToken = this.encryptionService.encrypt(credentials.access_token);
        const expiresAt = new Date(credentials.expiry_date);

        await this.prisma.channel.update({
          where: { id: channelId },
          data: {
            accessToken: encryptedAccessToken,
            tokenExpiresAt: expiresAt,
            status: ChannelStatus.CONNECTED,
            syncError: null,
          },
        });

        this.logger.log(`Successfully refreshed token for channel ${channelId}`);
        return credentials.access_token;
      }

      throw new Error('No access token in refresh response');
    } catch (error) {
      this.logger.error(`Failed to refresh token for channel ${channelId}`, error);
      
      await this.prisma.channel.update({
        where: { id: channelId },
        data: {
          status: ChannelStatus.ERROR,
          syncError: error.message,
        },
      });

      throw new BadRequestException('Failed to refresh access token');
    }
  }

  // ============================================
  // CHANNEL MANAGEMENT
  // ============================================

  async getChannelInfo(channelId: string, accessToken: string, refreshToken?: string): Promise<YouTubeChannelInfo> {
    const oauth2Client = this.createOAuth2Client(accessToken, refreshToken);
    const youtube = google.youtube({ version: 'v3', auth: oauth2Client });

    const response = await youtube.channels.list({
      part: ['snippet', 'statistics', 'contentDetails', 'topicDetails'],
      id: [channelId],
    });

    const channel = response.data.items?.[0];
    if (!channel) {
      throw new BadRequestException('Channel not found');
    }

    return {
      id: channel.id!,
      snippet: {
        title: channel.snippet?.title || '',
        description: channel.snippet?.description || '',
        customUrl: channel.snippet?.customUrl,
        publishedAt: channel.snippet?.publishedAt || '',
        thumbnails: (channel.snippet?.thumbnails || {}) as any,
      },
      statistics: {
        subscriberCount: channel.statistics?.subscriberCount || '0',
        videoCount: channel.statistics?.videoCount || '0',
        viewCount: channel.statistics?.viewCount || '0',
        hiddenSubscriberCount: channel.statistics?.hiddenSubscriberCount,
      },
      contentDetails: {
        relatedPlaylists: {
          uploads: channel.contentDetails?.relatedPlaylists?.uploads || '',
          likes: channel.contentDetails?.relatedPlaylists?.likes || '',
          favorites: channel.contentDetails?.relatedPlaylists?.favorites || '',
        },
      },
    };
  }

  async getUserChannels(accessToken: string, refreshToken?: string): Promise<YouTubeChannelInfo[]> {
    const oauth2Client = this.createOAuth2Client(accessToken, refreshToken);
    const youtube = google.youtube({ version: 'v3', auth: oauth2Client });

    const response = await youtube.channels.list({
      part: ['snippet', 'statistics', 'contentDetails'],
      mine: true,
    });

    return (response.data.items || []).map(channel => ({
      id: channel.id!,
      snippet: {
        title: channel.snippet?.title || '',
        description: channel.snippet?.description || '',
        customUrl: channel.snippet?.customUrl,
        publishedAt: channel.snippet?.publishedAt || '',
        thumbnails: (channel.snippet?.thumbnails || {}) as any,
      },
      statistics: {
        subscriberCount: channel.statistics?.subscriberCount || '0',
        videoCount: channel.statistics?.videoCount || '0',
        viewCount: channel.statistics?.viewCount || '0',
      },
      contentDetails: {
        relatedPlaylists: {
          uploads: channel.contentDetails?.relatedPlaylists?.uploads || '',
          likes: channel.contentDetails?.relatedPlaylists?.likes || '',
          favorites: channel.contentDetails?.relatedPlaylists?.favorites || '',
        },
      },
    }));
  }

  // ============================================
  // COMMENT FETCHING
  // ============================================

  async getCommentThreads(
    channelId: string,
    accessToken: string,
    refreshToken?: string,
    options?: {
      videoId?: string;
      pageToken?: string;
      maxResults?: number;
      order?: 'time' | 'relevance';
      searchTerms?: string;
    },
  ): Promise<{ items: CommentThread[]; nextPageToken?: string }> {
    const oauth2Client = this.createOAuth2Client(accessToken, refreshToken);
    const youtube = google.youtube({ version: 'v3', auth: oauth2Client });

    const params: youtube_v3.Params$Resource$Commentthreads$List = {
      part: ['snippet', 'replies'],
      allThreadsRelatedToChannelId: channelId,
      maxResults: options?.maxResults || 50,
      pageToken: options?.pageToken,
      order: options?.order || 'time',
      textFormat: 'plainText',
    };

    if (options?.videoId) {
      params.videoId = options.videoId;
    }

    if (options?.searchTerms) {
      params.searchTerms = options.searchTerms;
    }

    const response = await youtube.commentThreads.list(params);

    return {
      items: (response.data.items || []).map(item => ({
        id: item.id!,
        snippet: {
          channelId: item.snippet?.channelId || '',
          videoId: item.snippet?.videoId || '',
          topLevelComment: {
            id: item.snippet?.topLevelComment?.id || '',
            snippet: {
              channelId: item.snippet?.topLevelComment?.snippet?.channelId || '',
              videoId: item.snippet?.topLevelComment?.snippet?.videoId || '',
              authorChannelId: { value: item.snippet?.topLevelComment?.snippet?.authorChannelId?.value || '' },
              authorDisplayName: item.snippet?.topLevelComment?.snippet?.authorDisplayName || '',
              authorProfileImageUrl: item.snippet?.topLevelComment?.snippet?.authorProfileImageUrl || '',
              textDisplay: item.snippet?.topLevelComment?.snippet?.textDisplay || '',
              textOriginal: item.snippet?.topLevelComment?.snippet?.textOriginal || '',
              likeCount: item.snippet?.topLevelComment?.snippet?.likeCount || 0,
              publishedAt: item.snippet?.topLevelComment?.snippet?.publishedAt || '',
              updatedAt: item.snippet?.topLevelComment?.snippet?.updatedAt || '',
            },
          },
          totalReplyCount: item.snippet?.totalReplyCount || 0,
          isPublic: item.snippet?.isPublic || false,
        },
        replies: item.replies ? {
          comments: item.replies.comments.map(reply => ({
            id: reply.id!,
            snippet: {
              channelId: reply.snippet?.channelId || '',
              videoId: reply.snippet?.videoId || '',
              authorChannelId: { value: reply.snippet?.authorChannelId?.value || '' },
              authorDisplayName: reply.snippet?.authorDisplayName || '',
              authorProfileImageUrl: reply.snippet?.authorProfileImageUrl || '',
              textDisplay: reply.snippet?.textDisplay || '',
              textOriginal: reply.snippet?.textOriginal || '',
              likeCount: reply.snippet?.likeCount || 0,
              publishedAt: reply.snippet?.publishedAt || '',
              updatedAt: reply.snippet?.updatedAt || '',
              parentId: reply.snippet?.parentId || '',
            },
          })),
        } : undefined,
      }),
      nextPageToken: response.data.nextPageToken,
    };
  }

  async getCommentReplies(
    commentId: string,
    accessToken: string,
    refreshToken?: string,
    options?: { pageToken?: string; maxResults?: number },
  ) {
    const oauth2Client = this.createOAuth2Client(accessToken, refreshToken);
    const youtube = google.youtube({ version: 'v3', auth: oauth2Client });

    const response = await youtube.comments.list({
      part: ['snippet'],
      parentId: commentId,
      maxResults: options?.maxResults || 50,
      pageToken: options?.pageToken,
      textFormat: 'plainText',
    });

    return {
      items: (response.data.items || []).map(item => ({
        id: item.id!,
        snippet: {
          channelId: item.snippet?.channelId || '',
          videoId: item.snippet?.videoId || '',
          authorChannelId: { value: item.snippet?.authorChannelId?.value || '' },
          authorDisplayName: item.snippet?.authorDisplayName || '',
          authorProfileImageUrl: item.snippet?.authorProfileImageUrl || '',
          textDisplay: item.snippet?.textDisplay || '',
          textOriginal: item.snippet?.textOriginal || '',
          likeCount: item.snippet?.likeCount || 0,
          publishedAt: item.snippet?.publishedAt || '',
          updatedAt: item.snippet?.updatedAt || '',
          parentId: item.snippet?.parentId || '',
        },
      })),
      nextPageToken: response.data.nextPageToken,
    };
  }

  // ============================================
  // COMMENT REPLY
  // ============================================

  async replyToComment(
    commentId: string,
    text: string,
    accessToken: string,
    refreshToken?: string,
  ): Promise<string> {
    const oauth2Client = this.createOAuth2Client(accessToken, refreshToken);
    const youtube = google.youtube({ version: 'v3', auth: oauth2Client });

    const response = await youtube.comments.insert({
      part: ['snippet'],
      requestBody: {
        snippet: {
          parentId: commentId,
          textOriginal: text,
        },
      },
    });

    return response.data.id!;
  }

  async deleteComment(commentId: string, accessToken: string, refreshToken?: string): Promise<void> {
    const oauth2Client = this.createOAuth2Client(accessToken, refreshToken);
    const youtube = google.youtube({ version: 'v3', auth: oauth2Client });

    await youtube.comments.delete({
      id: commentId,
    });
  }

  async setCommentModerationStatus(
    commentId: string,
    status: 'heldForReview' | 'published' | 'rejected',
    accessToken: string,
    refreshToken?: string,
  ): Promise<void> {
    const oauth2Client = this.createOAuth2Client(accessToken, refreshToken);
    const youtube = google.youtube({ version: 'v3', auth: oauth2Client });

    await youtube.comments.setModerationStatus({
      id: [commentId],
      moderationStatus: status,
    });
  }

  // ============================================
  // VIDEO MANAGEMENT
  // ============================================

  async getVideoInfo(videoId: string, accessToken: string, refreshToken?: string): Promise<VideoInfo> {
    const oauth2Client = this.createOAuth2Client(accessToken, refreshToken);
    const youtube = google.youtube({ version: 'v3', auth: oauth2Client });

    const response = await youtube.videos.list({
      part: ['snippet', 'statistics', 'contentDetails'],
      id: [videoId],
    });

    const video = response.data.items?.[0];
    if (!video) {
      throw new Error('Video not found');
    }

    return {
      id: video.id!,
      snippet: {
        title: video.snippet?.title || '',
        description: video.snippet?.description || '',
        publishedAt: video.snippet?.publishedAt || '',
        channelId: video.snippet?.channelId || '',
        channelTitle: video.snippet?.channelTitle || '',
        thumbnails: video.snippet?.thumbnails || {},
      },
      statistics: {
        viewCount: video.statistics?.viewCount || '0',
        likeCount: video.statistics?.likeCount || '0',
        commentCount: video.statistics?.commentCount || '0',
      },
    };
  }

  async getChannelVideos(
    channelId: string,
    accessToken: string,
    refreshToken?: string,
    options?: { maxResults?: number; pageToken?: string; order?: string },
  ): Promise<{ items: VideoInfo[]; nextPageToken?: string }> {
    const oauth2Client = this.createOAuth2Client(accessToken, refreshToken);
    const youtube = google.youtube({ version: 'v3', auth: oauth2Client });

    // First get the uploads playlist
    const channelResponse = await youtube.channels.list({
      part: ['contentDetails'],
      id: [channelId],
    });

    const uploadsPlaylistId = channelResponse.data.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;
    if (!uploadsPlaylistId) {
      return { items: [] };
    }

    const playlistResponse = await youtube.playlistItems.list({
      part: ['snippet', 'contentDetails'],
      playlistId: uploadsPlaylistId,
      maxResults: options?.maxResults || 50,
      pageToken: options?.pageToken,
    });

    const videoIds = (playlistResponse.data.items || []).map(item => item.contentDetails?.videoId).filter(Boolean);
    
    if (videoIds.length === 0) {
      return { items: [], nextPageToken: playlistResponse.data.nextPageToken };
    }

    const videosResponse = await youtube.videos.list({
      part: ['snippet', 'statistics'],
      id: videoIds,
    });

    return {
      items: (videosResponse.data.items || []).map(video => ({
        id: video.id!,
        snippet: {
          title: video.snippet?.title || '',
          description: video.snippet?.description || '',
          publishedAt: video.snippet?.publishedAt || '',
          channelId: video.snippet?.channelId || '',
          channelTitle: video.snippet?.channelTitle || '',
          thumbnails: video.snippet?.thumbnails || {},
        },
        statistics: {
          viewCount: video.statistics?.viewCount || '0',
          likeCount: video.statistics?.likeCount || '0',
          commentCount: video.statistics?.commentCount || '0',
        },
      })),
      nextPageToken: playlistResponse.data.nextPageToken,
    };
  }

  // ============================================
  // PUBSUBHUBBUB WEBHOOK SUBSCRIPTION
  // ============================================

  async subscribeToChannel(channelId: string, callbackUrl: string, accessToken: string): Promise<void> {
    const oauth2Client = this.createOAuth2Client(accessToken);
    const youtube = google.youtube({ version: 'v3', auth: oauth2Client });

    try {
      await youtube.subscriptions.insert({
        part: ['snippet'],
        requestBody: {
          snippet: {
            resourceId: {
              kind: 'youtube#channel',
              channelId: channelId,
            },
          },
        },
      });
    } catch (error) {
      // Subscription might already exist
      this.logger.warn(`Subscription for channel ${channelId} might already exist: ${error.message}`);
    }
  }

  async unsubscribeFromChannel(subscriptionId: string, accessToken: string): Promise<void> {
    const oauth2Client = this.createOAuth2Client(accessToken);
    const youtube = google.youtube({ version: 'v3', auth: oauth2Client });

    await youtube.subscriptions.delete({
      id: subscriptionId,
    });
  }

  async getSubscriptions(accessToken: string, refreshToken?: string) {
    const oauth2Client = this.createOAuth2Client(accessToken, refreshToken);
    const youtube = google.youtube({ version: 'v3', auth: oauth2Client });

    const response = await youtube.subscriptions.list({
      part: ['snippet'],
      mine: true,
      maxResults: 50,
    });

    return response.data.items || [];
  }

  // ============================================
  // QUOTA MANAGEMENT
  // ============================================

  private readonly quotaCosts = {
    'channels.list': 1,
    'commentThreads.list': 1,
    'comments.list': 1,
    'comments.insert': 50,
    'comments.delete': 50,
    'videos.list': 1,
    'playlistItems.list': 1,
    'subscriptions.insert': 50,
    'subscriptions.delete': 50,
  };

  getQuotaCost(method: string): number {
    return this.quotaCosts[method] || 1;
  }

  async checkQuotaAvailable(channelId: string, estimatedCost: number): Promise<boolean> {
    // In production, you would track daily quota usage per channel/user
    // This is a placeholder implementation
    return true;
  }

  // ============================================
  // VALID ACCESS TOKEN (used by automation engine & comment monitor)
  // ============================================

  async getValidAccessToken(channelId: string): Promise<string | null> {
    const channel = await this.prisma.channel.findUnique({
      where: { id: channelId },
    });

    if (!channel) {
      this.logger.warn(`getValidAccessToken: channel ${channelId} not found`);
      return null;
    }

    const now = new Date();
    const expiryBuffer = 5 * 60 * 1000; // 5 minutes
    const isExpired =
      !channel.tokenExpiresAt ||
      new Date(channel.tokenExpiresAt).getTime() - now.getTime() < expiryBuffer;

    if (!isExpired) {
      // Token is still valid — decrypt and return
      try {
        return this.encryptionService.decrypt(channel.accessToken);
      } catch {
        this.logger.error(`Failed to decrypt access token for channel ${channelId}`);
        return null;
      }
    }

    // Token expired — try to refresh
    try {
      const newAccessToken = await this.refreshChannelToken(channelId);
      return newAccessToken;
    } catch (error) {
      this.logger.error(`Failed to refresh token for channel ${channelId}: ${error.message}`);
      return null;
    }
  }
}