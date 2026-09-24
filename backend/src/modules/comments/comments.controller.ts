import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  NotFoundException,
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
import { CommentMonitorService } from './services/comment-monitor.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Comment } from '@prisma/client';

@ApiTags('Comments')
@Controller('comments')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class CommentsController {
  constructor(private commentMonitorService: CommentMonitorService) {}

  @Get()
  @ApiOperation({ 
    summary: 'Get comments for user\'s channels',
    description: 'Retrieves comments with pagination and filtering options.'
  })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number (default 1)' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page (default 50, max 100)' })
  @ApiQuery({ name: 'channelId', required: false, type: String, description: 'Filter by channel ID' })
  @ApiQuery({ name: 'videoId', required: false, type: String, description: 'Filter by video ID' })
  @ApiQuery({ name: 'processed', required: false, type: Boolean, description: 'Filter by processed status' })
  @ApiQuery({ name: 'search', required: false, type: String, description: 'Search in comment text' })
  @ApiQuery({ name: 'fromDate', required: false, type: String, description: 'Filter from date (ISO string)' })
  @ApiQuery({ name: 'toDate', required: false, type: String, description: 'Filter to date (ISO string)' })
  @ApiResponse({ status: 200, description: 'List of comments' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getComments(
    @CurrentUser('id') userId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('channelId') channelId?: string,
    @Query('videoId') videoId?: string,
    @Query('processed') processed?: boolean,
    @Query('search') search?: string,
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
  ) {
    const take = Math.min(limit || 50, 100);
    const skip = ((page || 1) - 1) * take;

    const where: any = {
      channel: { userId },
    };

    if (channelId) where.channelId = channelId;
    if (videoId) where.videoId = videoId;
    if (processed !== undefined) {
      where.processedAt = processed ? { not: null } : null;
    }
    if (search) {
      where.text = { contains: search, mode: 'insensitive' };
    }
    if (fromDate || toDate) {
      where.publishedAt = {};
      if (fromDate) where.publishedAt.gte = new Date(fromDate);
      if (toDate) where.publishedAt.lte = new Date(toDate);
    }

    const [comments, total] = await this.prisma.comment.findManyAndCount({
      where,
      skip,
      take,
      orderBy: { publishedAt: 'desc' },
      include: {
        channel: { select: { id: true, title: true, thumbnailUrl: true } },
        replies: true,
      },
    });

    return {
      data: comments,
      meta: {
        total,
        page: page || 1,
        limit: take,
        totalPages: Math.ceil(total / take),
      },
    };
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get comment statistics' })
  @ApiQuery({ name: 'channelId', required: false, type: String })
  @ApiQuery({ name: 'fromDate', required: false, type: String })
  @ApiQuery({ name: 'toDate', required: false, type: String })
  @ApiResponse({ status: 200, description: 'Comment statistics' })
  async getCommentStats(
    @CurrentUser('id') userId: string,
    @Query('channelId') channelId?: string,
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
  ) {
    const where: any = {
      channel: { userId },
    };

    if (channelId) where.channelId = channelId;
    if (fromDate || toDate) {
      where.publishedAt = {};
      if (fromDate) where.publishedAt.gte = new Date(fromDate);
      if (toDate) where.publishedAt.lte = new Date(toDate);
    }

    const [total, processed, pending, thisWeek] = await Promise.all([
      this.prisma.comment.count({ where }),
      this.prisma.comment.count({ where: { ...where, processedAt: { not: null } } }),
      this.prisma.comment.count({ where: { ...where, processedAt: null } }),
      this.prisma.comment.count({
        where: {
          ...where,
          publishedAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
        },
      }),
    ]);

    return { total, processed, pending, thisWeek };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get comment by ID' })
  @ApiParam({ name: 'id', description: 'Comment ID' })
  @ApiResponse({ status: 200, description: 'Comment details' })
  @ApiResponse({ status: 404, description: 'Comment not found' })
  async getComment(@CurrentUser('id') userId: string, @Param('id') id: string) {
    const userChannels = await this.prisma.channel.findMany({
      where: { userId, deletedAt: null },
      select: { id: true },
    });
    const channelIds = userChannels.map(c => c.id);

    const comment = await this.prisma.comment.findFirst({
      where: { id, channelId: { in: channelIds } },
      include: {
        channel: { select: { id: true, title: true, thumbnailUrl: true } },
        replies: { orderBy: { publishedAt: 'asc' } },
        automationExecution: true,
      },
    });

    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    return comment;
  }

  @Post(':id/reply')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Reply to a comment' })
  @ApiParam({ name: 'id', description: 'Comment ID' })
  @ApiBody({ schema: { properties: { text: { type: 'string' } } } })
  @ApiResponse({ status: 201, description: 'Reply created successfully' })
  @ApiResponse({ status: 404, description: 'Comment not found' })
  async replyToComment(
    @CurrentUser('id') userId: string,
    @Param('id') commentId: string,
    @Body() body: { text: string; automationId?: string },
  ) {
    const comment = await this.prisma.comment.findUnique({ where: { id: commentId } });
    if (!comment) throw new NotFoundException('Comment not found');

    const channel = await this.prisma.channel.findFirst({
      where: { id: comment.channelId, userId },
    });
    if (!channel) throw new NotFoundException('Comment not found');

    const reply = await this.prisma.commentReply.create({
      data: {
        commentId,
        automationId: body.automationId,
        text: body.text,
        status: 'pending',
      },
    });

    return reply;
  }

  @Post(':id/mark-processed')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark comment as processed' })
  @ApiParam({ name: 'id', description: 'Comment ID' })
  @ApiResponse({ status: 200, description: 'Comment marked as processed' })
  @ApiResponse({ status: 404, description: 'Comment not found' })
  async markProcessed(@CurrentUser('id') userId: string, @Param('id') id: string) {
    const comment = await this.prisma.comment.findUnique({ where: { id } });
    if (!comment) throw new NotFoundException('Comment not found');

    const channel = await this.prisma.channel.findFirst({
      where: { id: comment.channelId, userId },
    });
    if (!channel) throw new NotFoundException('Comment not found');

    return this.prisma.comment.update({
      where: { id },
      data: { processedAt: new Date() },
    });
  }

  @Post('trigger-check')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Manually trigger comment check for all channels' })
  @ApiResponse({ status: 200, description: 'Comment check triggered' })
  async triggerCommentCheck(@CurrentUser('id') userId: string) {
    await this.commentMonitorService.fetchCommentsForAllChannels();
    return { message: 'Comment check triggered for all channels' };
  }
}