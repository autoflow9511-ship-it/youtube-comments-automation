import { IsString, IsOptional, IsArray } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class GoogleAuthDto {
  @ApiProperty({ description: 'Google OAuth authorization code' })
  @IsString()
  code: string;

  @ApiPropertyOptional({ description: 'State parameter for CSRF protection' })
  @IsOptional()
  @IsString()
  state?: string;

  @ApiPropertyOptional({ description: 'Redirect URI used in OAuth flow' })
  @IsOptional()
  @IsString()
  redirectUri?: string;
}

export class ConnectYouTubeChannelDto {
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

  @ApiProperty({ description: 'YouTube channel information from Google API' })
  channelInfo: {
    id: string;
    snippet: {
      title: string;
      description: string;
      customUrl?: string;
      thumbnails: {
        default: { url: string };
        medium: { url: string };
        high: { url: string };
      };
    };
    statistics: {
      subscriberCount: string;
      videoCount: string;
      viewCount: string;
    };
    contentDetails: {
      relatedPlaylists: {
        uploads: string;
      };
    };
  };
}