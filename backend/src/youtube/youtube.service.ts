import { Injectable, Logger } from '@nestjs/common';
import { google, youtube_v3 } from 'googleapis';
import { PrismaService } from '@database/prisma.service';
import { EncryptionService } from '@common/services/encryption.service';
import { ChannelStatus } from '@prisma/client';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class YouTubeService {
  private readonly logger = new Logger(YouTubeService.name);

  constructor(
    private prisma: PrismaService,
    private encryptionService: EncryptionService,
    private configService: ConfigService,
  ) {}

  private getOAuth2Client(accessToken: string, refreshToken?: string) {
    const oauth2Client = new google.auth.OAuth2(
      this.configService.get<string>('googleOAuth.clientId'),
      this.configService.get<string>('googleOAuth.clientSecret'),
      this.configService.get<string>('googleOAuth.callbackUrl'),
    );

    oauth2Client.setCredentials({
      access_token: accessToken,
      refresh_token: refreshToken,
    });

    return oauth2Client;
  }

  async getChannelInfo(channelId: string, accessToken: string, refreshToken?: string) {
    const youtube = google.youtube({
      version: 'v3',
      auth: this.getOAuth2Client(accessToken, refreshToken),
    });

    const response = await youtube.channels.list({
      part: ['snippet', 'statistics', 'contentDetails'],
      id: [channelId],
    });

    return response.data.items?.[0];
  }

  async getChannelByHandle(handle: string, accessToken: string, refreshToken?: string) {
    const youtube = google.youtube({
      version: 'v3',
      auth: this.getOAuth2Client(accessToken, refreshToken),
    });

    const response = await youtube.channels.list({
      part: ['snippet', 'statistics', 'contentDetails'],
      forHandle: handle,
    });

    return response.data.items?.[0];
  }

  async getComments(
    channelId: string,
    accessToken: string,
    refreshToken?: string,
    options?: {
      videoId?: string;
      pageToken?: string;
      maxResults?: number;
      parentId?: string;
    },
  ) {
    const youtube = google.youtube({
      version: 'v3',
      auth: this.getOAuth2Client(accessToken, refreshToken),
    });

    const params: youtube_v3.Params$Resource$Commentthreads$List = {
      part: ['snippet', 'replies'],
      allThreadsRelatedToChannelId: channelId,
      maxResults: options?.maxResults || 50,
      pageToken: options?.pageToken,
      order: 'time',
      textFormat: 'plainText',
    };

    if (options?.videoId) {
      params.videoId = options.videoId;
    }

    if (options?.parentId) {
      params.parentId = options.parentId;
    }

    const response = await youtube.commentThreads.list(params);

    return {
      items: response.data.items || [],
      nextPageToken: response.data.nextPageToken,
      pageInfo: response.data.pageInfo,
    };
  }

  async getCommentReplies(
    commentId: string,
    accessToken: string,
    refreshToken?: string,
    options?: { pageToken?: string; maxResults?: number },
  ) {
    const youtube = google.youtube({
      version: 'v3',
      auth: this.getOAuth2Client(accessToken, refreshToken),
    });

    const response = await youtube.comments.list({
      part: ['snippet'],
      parentId: commentId,
      maxResults: options?.maxResults || 50,
      pageToken: options?.pageToken,
      textFormat: 'plainText',
    });

    return {
      items: response.data.items || [],
      nextPageToken: response.data.nextPageToken,
    };
  }

  async replyToComment(
    commentId: string,
    text: string,
    accessToken: string,
    refreshToken?: string,
  ) {
    const youtube = google.youtube({
      version: 'v3',
      auth: this.getOAuth2Client(accessToken, refreshToken),
    });

    const response = await youtube.comments.insert({
      part: ['snippet'],
      requestBody: {
        snippet: {
          parentId: commentId,
          textOriginal: text,
        },
      },
    });

    return response.data;
  }

  async subscribeToWebhook(
    channelId: string,
    accessToken: string,
    refreshToken?: string,
    callbackUrl: string = '',
  ) {
    const youtube = google.youtube({
      version: 'v3',
      auth: this.getOAuth2Client(accessToken, refreshToken),
    });

    const hubCallback = callbackUrl || this.configService.get<string>('youtube.pubsubHubCallback');

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

      return { success: true };
    } catch (error) {
      this.logger.error(`Failed to subscribe to webhook for channel ${channelId}`, error);
      return { success: false, error: error.message };
    }
  }

  async unsubscribeFromWebhook(
    channelId: string,
    accessToken: string,
    refreshToken?: string,
  ) {
    const youtube = google.youtube({
      version: 'v3',
      auth: this.getOAuth2Client(accessToken, refreshToken),
    });

    try {
      const subscriptions = await youtube.subscriptions.list({
        part: ['snippet'],
        forChannelId: channelId,
        mine: true,
      });

      const subscription = subscriptions.data.items?.find(
        (sub) => sub.snippet?.resourceId?.channelId === channelId,
      );

      if (subscription?.id) {
        await youtube.subscriptions.delete({ id: subscription.id });
      }

      return { success: true };
    } catch (error) {
      this.logger.error(`Failed to unsubscribe from webhook for channel ${channelId}`, error);
      return { success: false, error: error.message };
    }
  }

  async refreshAccessToken(channelId: string): Promise<{ accessToken: string; expiresAt: Date } | null> {
    const channel = await this.prisma.channel.findUnique({
      where: { id: channelId },
      select: { refreshToken: true, accessToken: true, tokenExpiresAt: true },
    });

    if (!channel || !channel.refreshToken) {
      return null;
    }

    const oauth2Client = this.getOAuth2Client('', channel.refreshToken);

    try {
      const { credentials } = await oauth2Client.refreshAccessToken();

      if (credentials.access_token && credentials.expiry_date) {
        const encryptedAccessToken = this.encryptionService.encrypt(credentials.access_token);
        const expiresAt = new Date(credentials.expiry_date);

        await this.prisma.channel.update({
          where: { id: channelId },
          data: {
            accessToken: encryptedAccessToken,
            tokenExpiresAt: expiresAt,
          },
        });

        return { accessToken: credentials.access_token, expiresAt };
      }
    } catch (error) {
      this.logger.error(`Failed to refresh token for channel ${channelId}`, error);
      await this.prisma.channel.update({
        where: { id: channelId },
        data: { status: ChannelStatus.ERROR, syncError: error.message },
      });
    }

    return null;
  }

  async getValidAccessToken(channelId: string): Promise<string | null> {
    const channel = await this.prisma.channel.findUnique({
      where: { id: channelId },
      select: { accessToken: true, tokenExpiresAt: true, refreshToken: true },
    });

    if (!channel) return null;

    const accessToken = this.encryptionService.decrypt(channel.accessToken);
    const expiresAt = new Date(channel.tokenExpiresAt);
    const now = new Date();

    if (expiresAt > new Date(now.getTime() + 5 * 60 * 1000)) {
      return accessToken;
    }

    const refreshed = await this.refreshAccessToken(channelId);
    return refreshed?.accessToken || null;
  }

  async fetchAndStoreComments(channelId: string): Promise<number> {
    const accessToken = await this.getValidAccessToken(channelId);
    if (!accessToken) {
      throw new Error('No valid access token for channel');
    }

    const channel = await this.prisma.channel.findUnique({
      where: { id: channelId },
      select: { youtubeChannelId: true },
    });

    if (!channel) {
      throw new Error('Channel not found');
    }

    let totalStored = 0;
    let pageToken: string | undefined;

    do {
      const result = await this.getComments(channel.youtubeChannelId, accessToken, undefined, {
        pageToken,
        maxResults: 50,
      });

      for (const item of result.items) {
        const snippet = item.snippet?.topLevelComment?.snippet;
        if (!snippet) continue;

        await this.prisma.comment.upsert({
          where: { youtubeCommentId: item.id },
          update: {
            text: snippet.textDisplay,
            likeCount: snippet.likeCount || 0,
            replyCount: item.snippet?.totalReplyCount || 0,
            updatedAt: new Date(snippet.updatedAt),
          },
          create: {
            channelId,
            youtubeCommentId: item.id,
            videoId: snippet.videoId,
            authorChannelId: snippet.authorChannelId?.value || '',
            authorName: snippet.authorDisplayName,
            authorAvatar: snippet.authorProfileImageUrl,
            text: snippet.textDisplay,
            likeCount: snippet.likeCount || 0,
            replyCount: item.snippet?.totalReplyCount || 0,
            isReply: false,
            publishedAt: new Date(snippet.publishedAt),
            updatedAt: new Date(snippet.updatedAt),
          },
        });

        totalStored++;

        if (item.replies?.comments) {
          for (const reply of item.replies.comments) {
            const replySnippet = reply.snippet;
            if (!replySnippet) continue;

            await this.prisma.comment.upsert({
              where: { youtubeCommentId: reply.id },
              update: {
                text: replySnippet.textDisplay,
                likeCount: replySnippet.likeCount || 0,
                updatedAt: new Date(replySnippet.updatedAt),
              },
              create: {
                channelId,
                youtubeCommentId: reply.id,
                videoId: replySnippet.videoId,
                authorChannelId: replySnippet.authorChannelId?.value || '',
                authorName: replySnippet.authorDisplayName,
                authorAvatar: replySnippet.authorProfileImageUrl,
                text: replySnippet.textDisplay,
                likeCount: replySnippet.likeCount || 0,
                isReply: true,
                parentCommentId: item.id,
                publishedAt: new Date(replySnippet.publishedAt),
                updatedAt: new Date(replySnippet.updatedAt),
              },
            });

            totalStored++;
          }
        }
      }

      pageToken = result.nextPageToken;
    } while (pageToken);

    await this.prisma.channel.update({
      where: { id: channelId },
      data: { lastSyncedAt: new Date(), syncError: null },
    });

    return totalStored;
  }
}