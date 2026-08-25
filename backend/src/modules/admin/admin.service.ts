import { Injectable } from '@nestjs/common';
import { PrismaService } from '@database/prisma.service';
import { UserRole, SubscriptionTier } from '@prisma/client';

@Injectable()
export class AdminService {
  constructor(private prisma: PrismaService) {}

  async getSystemStats() {
    const [
      totalUsers,
      activeUsers,
      totalChannels,
      connectedChannels,
      totalAutomations,
      activeAutomations,
      totalComments,
      totalEmails,
      totalLandingPages,
      revenue,
    ] = await Promise.all([
      this.prisma.user.count({ where: { deletedAt: null } }),
      this.prisma.user.count({
        where: { deletedAt: null, lastLoginAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } },
      }),
      this.prisma.channel.count({ where: { deletedAt: null } }),
      this.prisma.channel.count({ where: { status: 'CONNECTED', deletedAt: null } }),
      this.prisma.automation.count({ where: { deletedAt: null } }),
      this.prisma.automation.count({ where: { status: 'ACTIVE', deletedAt: null } }),
      this.prisma.comment.count(),
      this.prisma.emailCapture.count(),
      this.prisma.landingPage.count({ where: { deletedAt: null } }),
      this.calculateRevenue(),
    ]);

    // User growth
    const userGrowth = await this.getUserGrowth(30);

    // Subscription distribution
    const subscriptionDistribution = await this.prisma.user.groupBy({
      by: ['subscriptionTier'],
      where: { deletedAt: null },
      _count: { subscriptionTier: true },
    });

    return {
      users: { total: totalUsers, active: activeUsers },
      channels: { total: totalChannels, connected: connectedChannels },
      automations: { total: totalAutomations, active: activeAutomations },
      comments: totalComments,
      emails: totalEmails,
      landingPages: totalLandingPages,
      revenue,
      userGrowth,
      subscriptionDistribution: subscriptionDistribution.map(s => ({
        tier: s.subscriptionTier,
        count: s._count.subscriptionTier,
      })),
    };
  }

  private async calculateRevenue() {
    // This would integrate with Stripe
    // For now, return mock data
    return { monthly: 0, yearly: 0, currency: 'USD' };
  }

  private async getUserGrowth(days: number) {
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const users = await this.prisma.user.findMany({
      where: { createdAt: { gte: startDate }, deletedAt: null },
      select: { createdAt: true },
    });

    const byDay: Record<string, number> = {};
    users.forEach(u => {
      const day = u.createdAt.toISOString().split('T')[0];
      byDay[day] = (byDay[day] || 0) + 1;
    });

    return Object.entries(byDay).map(([date, count]) => ({ date, count }));
  }

  async getAllUsers(params: {
    page?: number;
    limit?: number;
    search?: string;
    role?: UserRole;
    subscriptionTier?: SubscriptionTier;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }) {
    const { page = 1, limit = 20, search, role, subscriptionTier, sortBy = 'createdAt', sortOrder = 'desc' } = params;
    const skip = (page - 1) * limit;

    const where: any = { deletedAt: null };
    if (search) {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (role) where.role = role;
    if (subscriptionTier) where.subscriptionTier = subscriptionTier;

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          avatar: true,
          role: true,
          subscriptionTier: true,
          subscriptionExpiresAt: true,
          isEmailVerified: true,
          lastLoginAt: true,
          createdAt: true,
          _count: {
            select: {
              channels: true,
              automations: true,
              emailCaptures: true,
            },
          },
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    return { data: users, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async getUserDetails(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        channels: { where: { deletedAt: null } },
        automations: { where: { deletedAt: null } },
        emailCaptures: { take: 10, orderBy: { createdAt: 'desc' } },
        landingPages: { where: { deletedAt: null } },
        auditLogs: { take: 20, orderBy: { createdAt: 'desc' } },
      },
    });

    if (!user) return null;

    const { passwordHash, ...safeUser } = user;
    return safeUser;
  }

  async updateUser(userId: string, data: {
    role?: UserRole;
    subscriptionTier?: SubscriptionTier;
    subscriptionExpiresAt?: Date | null;
    isEmailVerified?: boolean;
  }, adminId: string) {
    const oldData = await this.prisma.user.findUnique({ where: { id: userId } });
    const user = await this.prisma.user.update({
      where: { id: userId },
      data,
    });

    await this.prisma.auditLog.create({
      data: {
        userId,
        adminId,
        action: 'UPDATE_USER',
        resource: 'user',
        resourceId: userId,
        oldData: { role: oldData?.role, subscriptionTier: oldData?.subscriptionTier },
        newData: data,
      },
    });

    return user;
  }

  async deleteUser(userId: string, adminId: string) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { deletedAt: new Date() },
    });

    await this.prisma.auditLog.create({
      data: {
        userId,
        adminId,
        action: 'DELETE_USER',
        resource: 'user',
        resourceId: userId,
      },
    });

    return { success: true };
  }

  async getAuditLogs(params: {
    page?: number;
    limit?: number;
    userId?: string;
    adminId?: string;
    action?: string;
    resource?: string;
  }) {
    const { page = 1, limit = 50, userId, adminId, action, resource } = params;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (userId) where.userId = userId;
    if (adminId) where.adminId = adminId;
    if (action) where.action = action;
    if (resource) where.resource = resource;

    const [logs, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { id: true, email: true, firstName: true, lastName: true } },
          admin: { select: { id: true, email: true, firstName: true, lastName: true } },
        },
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return { data: logs, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async getSystemConfig() {
    return this.prisma.systemConfig.findMany({
      where: { isPublic: true },
    });
  }

  async updateSystemConfig(key: string, value: any, adminId: string) {
    const oldConfig = await this.prisma.systemConfig.findUnique({ where: { key } });
    
    const config = await this.prisma.systemConfig.upsert({
      where: { key },
      update: { value },
      create: { key, value },
    });

    await this.prisma.auditLog.create({
      data: {
        userId: 'system',
        adminId,
        action: 'UPDATE_CONFIG',
        resource: 'system_config',
        resourceId: key,
        oldData: oldConfig?.value,
        newData: value,
      },
    });

    return config;
  }
}