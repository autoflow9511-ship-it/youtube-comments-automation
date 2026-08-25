import { IsString, IsOptional, IsArray, IsNumber, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ChannelThumbnailDto {
  @ApiProperty()
  @IsString()
  url: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  width?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  height?: number;
}

export class ChannelSnippetDto {
  @ApiProperty()
  @IsString()
  title: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  customUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  publishedAt?: string;

  @ApiProperty({ type: [ChannelThumbnailDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ChannelThumbnailDto)
  thumbnails: ChannelThumbnailDto[];
}

export class ChannelStatisticsDto {
  @ApiProperty()
  @IsString()
  viewCount: string;

  @ApiProperty()
  @IsString()
  subscriberCount: string;

  @ApiProperty()
  @IsString()
  videoCount: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  hiddenSubscriberCount?: string;
}

export class ChannelContentDetailsDto {
  @ApiProperty()
  @IsString()
  relatedPlaylists: {
    likes: string;
    favorites: string;
    uploads: string;
    watchHistory: string;
    watchLater: string;
  };
}

export class ChannelTopicDetailsDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  topicIds?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  topicCategories?: string[];
}

export class YouTubeChannelDto {
  @ApiProperty()
  @IsString()
  id: string;

  @ApiProperty()
  @IsString()
  kind: string;

  @ApiProperty()
  @ValidateNested()
  @Type(() => ChannelSnippetDto)
  snippet: ChannelSnippetDto;

  @ApiProperty()
  @ValidateNested()
  @Type(() => ChannelStatisticsDto)
  statistics: ChannelStatisticsDto;

  @ApiProperty()
  @ValidateNested()
  @Type(() => ChannelContentDetailsDto)
  contentDetails: ChannelContentDetailsDto;

  @ApiPropertyOptional()
  @IsOptional()
  @ValidateNested()
  @Type(() => ChannelTopicDetailsDto)
  topicDetails?: ChannelTopicDetailsDto;
}

export class ConnectChannelDto {
  @ApiProperty({ description: 'Google OAuth access token' })
  @IsString()
  accessToken: string;

  @ApiProperty({ description: 'Google OAuth refresh token' })
  @IsString()
  refreshToken: string;

  @ApiProperty({ description: 'Token expiry timestamp (ISO string)' })
  @IsString()
  tokenExpiresAt: string;

  @ApiProperty({ description: 'OAuth scopes granted', type: [String] })
  @IsArray()
  @IsString({ each: true })
  scope: string[];

  @ApiProperty({ description: 'YouTube channel information', type: YouTubeChannelDto })
  @ValidateNested()
  @Type(() => YouTubeChannelDto)
  channelInfo: YouTubeChannelDto;
}

export class ChannelResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  userId: string;

  @ApiProperty()
  youtubeChannelId: string;

  @ApiProperty()
  title: string;

  @ApiPropertyOptional()
  description?: string;

  @ApiPropertyOptional()
  customUrl?: string;

  @ApiPropertyOptional()
  thumbnailUrl?: string;

  @ApiProperty()
  subscriberCount: number;

  @ApiProperty()
  videoCount: number;

  @ApiProperty()
  viewCount: number;

  @ApiProperty({ enum: ['CONNECTED', 'DISCONNECTED', 'ERROR', 'PENDING_REVIEW'] })
  status: string;

  @ApiPropertyOptional()
  lastSyncedAt?: Date;

  @ApiPropertyOptional()
  syncError?: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}