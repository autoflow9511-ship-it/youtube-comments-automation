import { Injectable } from '@nestjs/common';
import { PrismaService } from '@database/prisma.service';

@Injectable()
export class NotificationsService {
  constructor(private prisma: PrismaService) {}

  async findAll(userId: string, params: {
    page?: number;
    limit?: number;
    unreadOnly?: boolean;
  }) {
    const { page = 1, limit = 20, unreadOnly } = params;
    const skip = (page - 1) * limit;

    const where: any = { userId };
    if (unreadOnly) where.isRead = false;

    const [notifications, total, unreadCount] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.notification.count({ where }),
      this.prisma.notification.count({ where: { userId, isRead: false } }),
    ]);

    return { data: notifications, meta: { total, page, limit, totalPages: Math.ceil(total / limit), unreadCount } };
  }

  async markAsRead(userId: string, id: string) {
    const notification = await this.prisma.notification.findFirst({
      where: { id, userId },
    });
    if (!notification) return null;

    return this.prisma.notification.update({
      where: { id },
      data: { isRead: true, readAt: new Date() },
    });
  }

  async markAllAsRead(userId: string) {
    return this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true, readAt: new Date() },
    });
  }

  async delete(userId: string, id: string) {
    const notification = await this.prisma.notification.findFirst({
      where: { id, userId },
    });
    if (!notification) return null;

    return this.prisma.notification.delete({ where: { id } });
  }

  async create(userId: string, data: {
    type: string;
    title: string;
    message: string;
    data?: any;
  }) {
    return this.prisma.notification.create({
      data: {
        userId,
        type: data.type,
        title: data.title,
        message: data.message,
        data: data.data || {},
      },
    });
  }

  async createBulk(userIds: string[], data: {
    type: string;
    title: string;
    message: string;
    data?: any;
  }) {
    return this.prisma.notification.createMany({
      data: userIds.map(userId => ({
        userId,
        type: data.type,
        title: data.title,
        message: data.message,
        data: data.data || {},
      })),
    });
  }

  async getUnreadCount(userId: string) {
    return this.prisma.notification.count({
      where: { userId, isRead: false },
    });
  }
}