import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@database/prisma.service';
import { AutomationStatus, TriggerType, ActionType } from '@prisma/client';
import { StringUtils } from '@common/utils/string.utils';

@Injectable()
export class AutomationsService {
  constructor(private prisma: PrismaService) {}

  async findAll(userId: string, params: {
    page?: number;
    limit?: number;
    status?: AutomationStatus;
    channelId?: string;
  }) {
    const { page = 1, limit = 20, status, channelId } = params;
    const skip = (page - 1) * limit;

    const where: any = { userId, deletedAt: null };
    if (status) where.status = status;
    if (channelId) where.channelId = channelId;

    const [automations, total] = await Promise.all([
      this.prisma.automation.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          actions: { orderBy: { order: 'asc' } },
          channel: { select: { id: true, title: true, thumbnailUrl: true } },
          _count: { select: { executions: true } },
        },
      }),
      this.prisma.automation.count({ where }),
    ]);

    return {
      data: automations,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async findById(userId: string, id: string) {
    const automation = await this.prisma.automation.findFirst({
      where: { id, userId, deletedAt: null },
      include: {
        actions: { orderBy: { order: 'asc' } },
        channel: { select: { id: true, title: true, thumbnailUrl: true } },
        executions: {
          orderBy: { startedAt: 'desc' },
          take: 10,
          include: { actions: true },
        },
      },
    });

    if (!automation) {
      throw new NotFoundException('Automation not found');
    }

    return automation;
  }

  async create(userId: string, data: {
    channelId: string;
    name: string;
    description?: string;
    triggerType: TriggerType;
    triggerConfig: any;
    videoIds?: string[];
    actions: Array<{ type: ActionType; config: any; order: number; conditions?: any }>;
  }) {
    // Verify channel ownership
    const channel = await this.prisma.channel.findFirst({
      where: { id: data.channelId, userId, deletedAt: null },
    });

    if (!channel) {
      throw new NotFoundException('Channel not found');
    }

    return this.prisma.automation.create({
      data: {
        userId,
        channelId: data.channelId,
        name: data.name,
        description: data.description,
        triggerType: data.triggerType,
        triggerConfig: data.triggerConfig,
        videoIds: data.videoIds || [],
        actions: {
          create: data.actions.map(action => ({
            type: action.type,
            config: action.config,
            order: action.order,
            conditions: action.conditions || {},
          })),
        },
      },
      include: { actions: true },
    });
  }

  async update(userId: string, id: string, data: any) {
    const automation = await this.prisma.automation.findFirst({
      where: { id, userId, deletedAt: null },
    });

    if (!automation) {
      throw new NotFoundException('Automation not found');
    }

    // Update automation
    const updated = await this.prisma.automation.update({
      where: { id },
      data: {
        name: data.name,
        description: data.description,
        triggerType: data.triggerType,
        triggerConfig: data.triggerConfig,
        videoIds: data.videoIds,
        status: data.status,
        settings: data.settings,
      },
    });

    // Update actions if provided
    if (data.actions) {
      // Delete existing actions
      await this.prisma.automationAction.deleteMany({ where: { automationId: id } });

      // Create new actions
      await this.prisma.automationAction.createMany({
        data: data.actions.map((action: any, index: number) => ({
          automationId: id,
          type: action.type,
          config: action.config,
          order: action.order ?? index,
          conditions: action.conditions || {},
        })),
      });
    }

    return this.findById(userId, id);
  }

  async delete(userId: string, id: string) {
    const automation = await this.prisma.automation.findFirst({
      where: { id, userId, deletedAt: null },
    });

    if (!automation) {
      throw new NotFoundException('Automation not found');
    }

    return this.prisma.automation.update({
      where: { id },
      data: { deletedAt: new Date(), status: AutomationStatus.ARCHIVED },
    });
  }

  async toggleStatus(userId: string, id: string, status: AutomationStatus) {
    const automation = await this.prisma.automation.findFirst({
      where: { id, userId, deletedAt: null },
    });

    if (!automation) {
      throw new NotFoundException('Automation not found');
    }

    return this.prisma.automation.update({
      where: { id },
      data: { status },
    });
  }

  async duplicate(userId: string, id: string) {
    const automation = await this.prisma.automation.findFirst({
      where: { id, userId, deletedAt: null },
      include: { actions: { orderBy: { order: 'asc' } } },
    });

    if (!automation) {
      throw new NotFoundException('Automation not found');
    }

    const newName = StringUtils.generateSlug(`${automation.name} Copy`);

    return this.prisma.automation.create({
      data: {
        userId,
        channelId: automation.channelId,
        name: newName,
        description: automation.description,
        triggerType: automation.triggerType,
        triggerConfig: automation.triggerConfig,
        status: AutomationStatus.DRAFT,
        settings: automation.settings,
        actions: {
          create: automation.actions.map(action => ({
            type: action.type,
            config: action.config,
            order: action.order,
            conditions: action.conditions,
          })),
        },
      },
      include: { actions: true },
    });
  }

  async getExecutions(userId: string, automationId: string, params: {
    page?: number;
    limit?: number;
    status?: string;
  }) {
    const { page = 1, limit = 20, status } = params;
    const skip = (page - 1) * limit;

    const automation = await this.prisma.automation.findFirst({
      where: { id: automationId, userId, deletedAt: null },
    });

    if (!automation) {
      throw new NotFoundException('Automation not found');
    }

    const where: any = { automationId };
    if (status) where.status = status;

    const [executions, total] = await Promise.all([
      this.prisma.automationExecution.findMany({
        where,
        skip,
        take: limit,
        orderBy: { startedAt: 'desc' },
        include: { actions: true },
      }),
      this.prisma.automationExecution.count({ where }),
    ]);

    return {
      data: executions,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }
}