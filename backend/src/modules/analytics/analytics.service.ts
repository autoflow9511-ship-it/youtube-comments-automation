import { Injectable } from '@nestjs/common';
import { PrismaService } from '@database/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class AnalyticsService {
  constructor(private prisma: PrismaService) {}

  async getDashboardStats(userId: string) {
    const [
      totalChannels,
      connectedChannels,
      totalAutomations,
      activeAutomations,
      totalComments,
      processedComments,
      totalEmails,
      emailsThisMonth,
      totalLandingPages,
      publishedLandingPages,
      totalSubmissions,
    ] = await Promise.all([
      this.prisma.channel.count({ where: { userId, deletedAt: null } }),
      this.prisma.channel.count({ where: { userId, status: 'CONNECTED', deletedAt: null } }),
      this.prisma.automation.count({ where: { userId, deletedAt: null } }),
      this.prisma.automation.count({ where: { userId, status: 'ACTIVE', deletedAt: null } }),
      this.prisma.comment.count({
        where: { channel: { userId } },
      }),
      this.prisma.comment.count({
        where: { channel: { userId }, processedAt: { not: null } },
      }),
      this.prisma.emailCapture.count({ where: { userId } }),
      this.prisma.emailCapture.count({
        where: {
          userId,
          createdAt: { gte: new Date(new Date().setDate(1)) },
        },
      }),
      this.prisma.landingPage.count({ where: { userId, deletedAt: null } }),
      this.prisma.landingPage.count({ where: { userId, status: 'PUBLISHED', deletedAt: null } }),
      this.prisma.landingPageSubmission.count({
        where: { landingPage: { userId } },
      }),
    ]);

    return {
      channels: { total: totalChannels, connected: connectedChannels },
      automations: { total: totalAutomations, active: activeAutomations },
      comments: { total: totalComments, processed: processedComments },
      emails: { total: totalEmails, thisMonth: emailsThisMonth },
      landingPages: { total: totalLandingPages, published: publishedLandingPages },
      submissions: totalSubmissions,
    };
  }

  async getAutomationStats(userId: string, automationId?: string, days: number = 30) {
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const where: any = {
      automation: { userId },
      startedAt: { gte: startDate },
    };
    if (automationId) where.automationId = automationId;

    const executions = await this.prisma.automationExecution.findMany({
      where,
      select: { status: true, startedAt: true, automationId: true },
    });

    const total = executions.length;
    const successful = executions.filter(e => e.status === 'completed').length;
    const failed = executions.filter(e => e.status === 'failed').length;
    const pending = executions.filter(e => e.status === 'pending').length;

    // Group by day
    const byDay: Record<string, { total: number; successful: number; failed: number }> = {};
    executions.forEach(e => {
      const day = e.startedAt.toISOString().split('T')[0];
      if (!byDay[day]) byDay[day] = { total: 0, successful: 0, failed: 0 };
      byDay[day].total++;
      if (e.status === 'completed') byDay[day].successful++;
      if (e.status === 'failed') byDay[day].failed++;
    });

    return {
      total,
      successful,
      failed,
      pending,
      successRate: total > 0 ? (successful / total) * 100 : 0,
      byDay: Object.entries(byDay).map(([date, stats]) => ({ date, ...stats })),
    };
  }

  async getEmailStats(userId: string, days: number = 30) {
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const logs = await this.prisma.emailLog.findMany({
      where: { userId, createdAt: { gte: startDate } },
      select: { status: true, createdAt: true, sentAt: true, openedAt: true, clickedAt: true },
    });

    const total = logs.length;
    const sent = logs.filter(l => l.status === 'SENT' || l.status === 'DELIVERED').length;
    const delivered = logs.filter(l => l.status === 'DELIVERED').length;
    const opened = logs.filter(l => l.openedAt).length;
    const clicked = logs.filter(l => l.clickedAt).length;
    const bounced = logs.filter(l => l.status === 'BOUNCED').length;
    const unsubscribed = logs.filter(l => l.status === 'UNSUBSCRIBED').length;

    return {
      total,
      sent,
      delivered,
      opened,
      clicked,
      bounced,
      unsubscribed,
      deliveryRate: sent > 0 ? (delivered / sent) * 100 : 0,
      openRate: delivered > 0 ? (opened / delivered) * 100 : 0,
      clickRate: delivered > 0 ? (clicked / delivered) * 100 : 0,
      bounceRate: sent > 0 ? (bounced / sent) * 100 : 0,
    };
  }

  async getChannelAnalytics(userId: string, channelId: string, days: number = 30) {
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const [
      commentCount,
      replyCount,
      automationExecutions,
      emailCaptures,
    ] = await Promise.all([
      this.prisma.comment.count({
        where: { channelId, publishedAt: { gte: startDate } },
      }),
      this.prisma.commentReply.count({
        where: { comment: { channelId }, sentAt: { gte: startDate } },
      }),
      this.prisma.automationExecution.count({
        where: { automation: { channelId }, startedAt: { gte: startDate } },
      }),
      this.prisma.emailCapture.count({
        where: { channelId, createdAt: { gte: startDate } },
      }),
    ]);

    // Get top videos by comments
    const topVideos = await this.prisma.comment.groupBy({
      by: ['videoId', 'videoTitle'],
      where: { channelId, publishedAt: { gte: startDate } },
      _count: { videoId: true },
      orderBy: { _count: { videoId: 'desc' } },
      take: 10,
    });

    return {
      comments: commentCount,
      replies: replyCount,
      automationExecutions,
      emailCaptures,
      topVideos: topVideos.map(v => ({
        videoId: v.videoId,
        title: v.videoTitle,
        commentCount: v._count.videoId,
      })),
    };
  }

  async trackEvent(userId: string, data: {
    channelId?: string;
    automationId?: string;
    eventType: string;
    eventData?: any;
    metadata?: any;
    sessionId?: string;
  }) {
    return this.prisma.analyticsEvent.create({
      data: {
        userId,
        channelId: data.channelId,
        automationId: data.automationId,
        eventType: data.eventType,
        eventData: data.eventData || {},
        metadata: data.metadata || {},
        sessionId: data.sessionId,
      },
    });
  }

  async getEvents(userId: string, params: {
    page?: number;
    limit?: number;
    eventType?: string;
    channelId?: string;
    automationId?: string;
    startDate?: string;
    endDate?: string;
  }) {
    const { page = 1, limit = 50, eventType, channelId, automationId, startDate, endDate } = params;
    const skip = (page - 1) * limit;

    const where: any = { userId };
    if (eventType) where.eventType = eventType;
    if (channelId) where.channelId = channelId;
    if (automationId) where.automationId = automationId;
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    const [events, total] = await Promise.all([
      this.prisma.analyticsEvent.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.analyticsEvent.count({ where }),
    ]);

    return { data: events, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }
}