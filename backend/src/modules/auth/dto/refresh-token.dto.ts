import { IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RefreshTokenDto {
  @ApiProperty({ description: 'Refresh token from login/register response' })
  @IsString()
  @MinLength(1, { message: 'Refresh token is required' })
  refreshToken: string;
}