import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserRole, SubscriptionTier } from '@prisma/client';

export class UserResponseDto {
  @ApiProperty({ example: 'clx1234567890' })
  id: string;

  @ApiProperty({ example: 'user@example.com' })
  email: string;

  @ApiPropertyOptional({ example: 'John' })
  firstName?: string;

  @ApiPropertyOptional({ example: 'Doe' })
  lastName?: string;

  @ApiPropertyOptional({ example: 'https://example.com/avatar.jpg' })
  avatar?: string;

  @ApiProperty({ enum: UserRole, example: UserRole.USER })
  role: UserRole;

  @ApiProperty({ enum: SubscriptionTier, example: SubscriptionTier.FREE })
  subscriptionTier: SubscriptionTier;

  @ApiPropertyOptional({ example: '2024-12-31T23:59:59.000Z' })
  subscriptionExpiresAt?: Date;

  @ApiProperty({ example: true })
  isEmailVerified: boolean;

  @ApiProperty({ example: false })
  twoFactorEnabled: boolean;

  @ApiPropertyOptional({ example: '2024-01-15T10:30:00.000Z' })
  lastLoginAt?: Date;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  createdAt: Date;
}

export class TokenResponseDto {
  @ApiProperty({ example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' })
  accessToken: string;

  @ApiProperty({ example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' })
  refreshToken: string;

  @ApiProperty({ example: 'Bearer' })
  tokenType: string;

  @ApiProperty({ example: 900, description: 'Access token expiry in seconds' })
  expiresIn: number;
}

export class AuthResponseDto {
  @ApiProperty({ type: UserResponseDto })
  user: UserResponseDto;

  @ApiProperty({ type: TokenResponseDto })
  tokens: TokenResponseDto;
}

export class GoogleOAuthUrlResponseDto {
  @ApiProperty({ example: 'https://accounts.google.com/o/oauth2/v2/auth?...' })
  url: string;

  @ApiProperty({ example: 'random-state-string' })
  state: string;
}

export class MessageResponseDto {
  @ApiProperty({ example: 'Operation completed successfully' })
  message: string;
}