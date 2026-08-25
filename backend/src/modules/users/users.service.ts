import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '@database/prisma.service';
import { UserRole, SubscriptionTier } from '@prisma/client';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findAll(params: {
    page?: number;
    limit?: number;
    search?: string;
    role?: UserRole;
    subscriptionTier?: SubscriptionTier;
  }) {
    const { page = 1, limit = 20, search, role, subscriptionTier } = params;
    const skip = (page - 1) * limit;

    const where: any = {
      deletedAt: null,
    };

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
        orderBy: { createdAt: 'desc' },
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

    return {
      data: users,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findById(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
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
        twoFactorEnabled: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            channels: true,
            automations: true,
            emailCaptures: true,
            landingPages: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async updateRole(id: string, role: UserRole, currentUserId: string) {
    if (id === currentUserId) {
      throw new ForbiddenException('Cannot change your own role');
    }

    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    return this.prisma.user.update({
      where: { id },
      data: { role },
      select: {
        id: true,
        email: true,
        role: true,
      },
    });
  }

  async updateSubscription(id: string, tier: SubscriptionTier, expiresAt?: Date) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    return this.prisma.user.update({
      where: { id },
      data: {
        subscriptionTier: tier,
        subscriptionExpiresAt: expiresAt,
      },
      select: {
        id: true,
        email: true,
        subscriptionTier: true,
        subscriptionExpiresAt: true,
      },
    });
  }

  async deactivate(id: string, currentUserId: string) {
    if (id === currentUserId) {
      throw new ForbiddenException('Cannot deactivate your own account');
    }

    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    return this.prisma.user.update({
      where: { id },
      data: { deletedAt: new Date() },
      select: {
        id: true,
        email: true,
        deletedAt: true,
      },
    });
  }

  async getStats(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        _count: {
          select: {
            channels: true,
            automations: true,
            emailCaptures: true,
            landingPages: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const channels = await this.prisma.channel.count({
      where: { userId, deletedAt: null },
    });

    const activeAutomations = await this.prisma.automation.count({
      where: { userId, status: 'ACTIVE', deletedAt: null },
    });

    const totalEmails = await this.prisma.emailCapture.count({
      where: { userId },
    });

    const emailsThisMonth = await this.prisma.emailCapture.count({
      where: {
        userId,
        createdAt: {
          gte: new Date(new Date().setDate(1)),
        },
      },
    });

    return {
      channels,
      activeAutomations,
      totalEmails,
      emailsThisMonth,
    };
  }
}