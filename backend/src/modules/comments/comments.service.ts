import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@database/prisma.service';

@Injectable()
export class CommentsService {
  constructor(private prisma: PrismaService) {}

  async findAll(userId: string, params: {
    page?: number;
    limit?: number;
    channelId?: string;
    videoId?: string;
    processed?: boolean;
    search?: string;
  }) {
    const { page = 1, limit = 50, channelId, videoId, processed, search } = params;
    const skip = (page - 1) * limit;

    // Get user's channel IDs
    const userChannels = await this.prisma.channel.findMany({
      where: { userId, deletedAt: null },
      select: { id: true },
    });
    const channelIds = userChannels.map(c => c.id);

    const where: any = { channelId: { in: channelIds } };
    if (channelId) where.channelId = channelId;
    if (videoId) where.videoId = videoId;
    if (processed !== undefined) where.processedAt = processed ? { not: null } : null;
    if (search) {
      where.OR = [
        { text: { contains: search, mode: 'insensitive' } },
        { authorName: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [comments, total] = await Promise.all([
      this.prisma.comment.findMany({
        where,
        skip,
        take: limit,
        orderBy: { publishedAt: 'desc' },
        include: {
          channel: { select: { id: true, title: true, thumbnailUrl: true } },
          replies: true,
        },
      }),
      this.prisma.comment.count({ where }),
    ]);

    return {
      data: comments,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async findById(userId: string, id: string) {
    const userChannels = await this.prisma.channel.findMany({
      where: { userId, deletedAt: null },
      select: { id: true },
    });
    const channelIds = userChannels.map(c => c.id);

    const comment = await this.prisma.comment.findFirst({
      where: { id, channelId: { in: channelIds } },
      include: {
        channel: { select: { id: true, title: true, thumbnailUrl: true } },
        replies: true,
      },
    });

    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    return comment;
  }

  async getStats(userId: string, channelId?: string) {
    const userChannels = await this.prisma.channel.findMany({
      where: { userId, deletedAt: null },
      select: { id: true },
    });
    const channelIds = channelId ? [channelId] : userChannels.map(c => c.id);

    const [total, processed, pending, thisWeek] = await Promise.all([
      this.prisma.comment.count({ where: { channelId: { in: channelIds } } }),
      this.prisma.comment.count({ where: { channelId: { in: channelIds }, processedAt: { not: null } } }),
      this.prisma.comment.count({ where: { channelId: { in: channelIds }, processedAt: null } }),
      this.prisma.comment.count({
        where: {
          channelId: { in: channelIds },
          publishedAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
        },
      }),
    ]);

    return { total, processed, pending, thisWeek };
  }

  async replyToComment(userId: string, commentId: string, text: string, automationId?: string) {
    // This would use YouTube API to post a reply
    // For now, just create a record
    const comment = await this.prisma.comment.findUnique({ where: { id: commentId } });
    if (!comment) throw new NotFoundException('Comment not found');

    return this.prisma.commentReply.create({
      data: {
        commentId,
        automationId,
        text,
        status: 'pending',
      },
    });
  }
}