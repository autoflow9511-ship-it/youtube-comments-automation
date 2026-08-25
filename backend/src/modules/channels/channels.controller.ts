import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { ChannelsService } from './channels.service';
import { AuthGuard } from '@guards/auth.guard';
import { CurrentUser } from '@decorators/current-user.decorator';
import { ChannelStatus } from '@prisma/client';

@ApiTags('Channels')
@Controller('channels')
@UseGuards(AuthGuard)
@ApiBearerAuth()
export class ChannelsController {
  constructor(private channelsService: ChannelsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all connected channels' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false, enum: ChannelStatus })
  @ApiResponse({ status: 200, description: 'Channels retrieved successfully' })
  async findAll(
    @CurrentUser('id') userId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('status') status?: ChannelStatus,
  ) {
    return this.channelsService.findAll(userId, {
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 20,
      status,
    });
  }

  @Post('connect')
  @ApiOperation({ summary: 'Connect a YouTube channel' })
  @ApiResponse({ status: 201, description: 'Channel connected successfully' })
  @ApiResponse({ status: 403, description: 'Channel already connected to another account' })
  async connect(
    @CurrentUser('id') userId: string,
    @Body() data: {
      youtubeChannelId: string;
      accessToken: string;
      refreshToken: string;
      tokenExpiresAt: string;
      scope: string[];
      channelInfo: any;
    },
  ) {
    return this.channelsService.connect(userId, {
      ...data,
      tokenExpiresAt: new Date(data.tokenExpiresAt),
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get channel by ID' })
  @ApiResponse({ status: 200, description: 'Channel found' })
  @ApiResponse({ status: 404, description: 'Channel not found' })
  async findById(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.channelsService.findById(userId, id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update channel settings' })
  @ApiResponse({ status: 200, description: 'Channel updated successfully' })
  @ApiResponse({ status: 404, description: 'Channel not found' })
  async update(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() data: any,
  ) {
    return this.channelsService.update(id, userId, data);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Disconnect a YouTube channel' })
  @ApiResponse({ status: 200, description: 'Channel disconnected successfully' })
  @ApiResponse({ status: 404, description: 'Channel not found' })
  async disconnect(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.channelsService.disconnect(userId, id);
  }
}