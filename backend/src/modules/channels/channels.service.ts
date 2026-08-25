import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '@database/prisma.service';
import { ChannelStatus } from '@prisma/client';
import { google } from 'googleapis';
import { EncryptionService } from '@common/services/encryption.service';

@Injectable()
export class ChannelsService {
  constructor(
    private prisma: PrismaService,
    private encryptionService: EncryptionService,
  ) {}

  async findAll(userId: string, params: { page?: number; limit?: number; status?: ChannelStatus }) {
    const { page = 1, limit = 20, status } = params;
    const skip = (page - 1) * limit;

    const where: any = { userId, deletedAt: null };
    if (status) where.status = status;

    const [channels, total] = await Promise.all([
      this.prisma.channel.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          _count: {
            select: {
              automations: true,
              comments: true,
            },
          },
        },
      }),
      this.prisma.channel.count({ where }),
    ]);

    // Decrypt tokens for each channel
    const decryptedChannels = channels.map(channel => ({
      ...channel,
      accessToken: this.encryptionService.decrypt(channel.accessToken),
      refreshToken: this.encryptionService.decrypt(channel.refreshToken),
    }));

    return {
      data: decryptedChannels,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async findById(userId: string, id: string) {
    const channel = await this.prisma.channel.findFirst({
      where: { id, userId, deletedAt: null },
    });

    if (!channel) {
      throw new NotFoundException('Channel not found');
    }

    return {
      ...channel,
      accessToken: this.encryptionService.decrypt(channel.accessToken),
      refreshToken: this.encryptionService.decrypt(channel.refreshToken),
    };
  }

  async connect(userId: string, data: {
    youtubeChannelId: string;
    accessToken: string;
    refreshToken: string;
    tokenExpiresAt: Date;
    scope: string[];
    channelInfo: any;
  }) {
    // Check if channel already connected
    const existing = await this.prisma.channel.findFirst({
      where: { youtubeChannelId: data.youtubeChannelId, deletedAt: null },
    });

    if (existing) {
      if (existing.userId !== userId) {
        throw new ForbiddenException('Channel already connected to another account');
      }
      // Update existing
      return this.update(existing.id, userId, {
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
        tokenExpiresAt: data.tokenExpiresAt,
        scope: data.scope,
        status: ChannelStatus.CONNECTED,
        ...data.channelInfo,
      });
    }

    return this.prisma.channel.create({
      data: {
        userId,
        youtubeChannelId: data.youtubeChannelId,
        accessToken: this.encryptionService.encrypt(data.accessToken),
        refreshToken: this.encryptionService.encrypt(data.refreshToken),
        tokenExpiresAt: data.tokenExpiresAt,
        scope: data.scope,
        status: ChannelStatus.CONNECTED,
        title: data.channelInfo.title,
        description: data.channelInfo.description,
        customUrl: data.channelInfo.customUrl,
        thumbnailUrl: data.channelInfo.thumbnailUrl,
        subscriberCount: data.channelInfo.subscriberCount,
        videoCount: data.channelInfo.videoCount,
        viewCount: data.channelInfo.viewCount,
      },
    });
  }

  async update(id: string, userId: string, data: any) {
    const channel = await this.prisma.channel.findFirst({
      where: { id, userId, deletedAt: null },
    });

    if (!channel) {
      throw new NotFoundException('Channel not found');
    }

    const updateData: any = { ...data };
    if (data.accessToken) {
      updateData.accessToken = this.encryptionService.encrypt(data.accessToken);
    }
    if (data.refreshToken) {
      updateData.refreshToken = this.encryptionService.encrypt(data.refreshToken);
    }

    return this.prisma.channel.update({
      where: { id },
      data: updateData,
    });
  }

  async disconnect(userId: string, id: string) {
    const channel = await this.prisma.channel.findFirst({
      where: { id, userId, deletedAt: null },
    });

    if (!channel) {
      throw new NotFoundException('Channel not found');
    }

    return this.prisma.channel.update({
      where: { id },
      data: {
        status: ChannelStatus.DISCONNECTED,
        deletedAt: new Date(),
      },
    });
  }

  async getYouTubeClient(accessToken: string) {
    const oauth2Client = new google.auth.OAuth2();
    oauth2Client.setCredentials({ access_token: accessToken });
    return google.youtube({ version: 'v3', auth: oauth2Client });
  }

  async refreshChannelToken(channelId: string) {
    // Implementation for refreshing YouTube OAuth tokens
    // This would use the refresh token to get a new access token
    throw new Error('Not implemented');
  }
}