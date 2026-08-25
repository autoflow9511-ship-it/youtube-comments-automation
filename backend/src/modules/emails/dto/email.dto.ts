import { IsString, IsOptional, IsEnum, IsArray, ValidateNested, IsNumber, Min, IsEmail, IsObject } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { EmailStatus, EmailProvider } from '@prisma/client';

export class EmailSequenceStepDto {
  @ApiProperty({ example: 0 })
  @IsNumber()
  order: number;

  @ApiProperty({ example: 0, description: 'Delay in hours before sending' })
  @IsNumber()
  @Min(0)
  delayHours: number;

  @ApiProperty({ example: 1, description: 'Delay in days before sending' })
  @IsNumber()
  @Min(0)
  delayDays: number;

  @ApiProperty({ example: 'Welcome to our community!' })
  @IsString()
  subject: string;

  @ApiProperty({ example: '<p>Hi {{firstName}},</p><p>Thanks for joining!</p>' })
  @IsString()
  htmlContent: string;

  @ApiPropertyOptional({ example: 'Hi {{firstName}},\n\nThanks for joining!' })
  @IsOptional()
  @IsString()
  textContent?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  conditions?: Record<string, any>;
}

export class CreateEmailSequenceDto {
  @ApiProperty({ example: 'Welcome Sequence' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ example: 'Automated welcome emails for new subscribers' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ enum: ['immediate', 'landing_page_submit', 'tag_added', 'manual'], example: 'landing_page_submit' })
  @IsString()
  triggerType: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  triggerConfig?: Record<string, any>;

  @ApiProperty({ type: [EmailSequenceStepDto] })
  @IsArray()
  @ValidateNested({ each: true })
  steps: EmailSequenceStepDto[];
}

export class UpdateEmailSequenceDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ type: [EmailSequenceStepDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  steps?: EmailSequenceStepDto[];
}

export class SendEmailDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  toEmail: string;

  @ApiProperty({ example: 'Test Subject' })
  @IsString()
  subject: string;

  @ApiProperty({ example: '<p>Hello!</p>' })
  @IsString()
  htmlContent: string;

  @ApiPropertyOptional({ example: 'Hello!' })
  @IsOptional()
  @IsString()
  textContent?: string;

  @ApiPropertyOptional({ example: 'noreply@example.com' })
  @IsOptional()
  @IsEmail()
  fromEmail?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  emailCaptureId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  enrollmentId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  sequenceStepId?: string;
}

export class EmailSequenceResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  userId: string;

  @ApiProperty()
  name: string;

  @ApiPropertyOptional()
  description?: string;

  @ApiProperty()
  isActive: boolean;

  @ApiProperty()
  triggerType: string;

  @ApiProperty()
  triggerConfig: Record<string, any>;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  @ApiProperty()
  steps: EmailSequenceStepDto[];
}

export class EmailLogResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  userId: string;

  @ApiPropertyOptional()
  emailCaptureId?: string;

  @ApiPropertyOptional()
  enrollmentId?: string;

  @ApiPropertyOptional()
  sequenceStepId?: string;

  @ApiProperty()
  toEmail: string;

  @ApiProperty()
  fromEmail: string;

  @ApiProperty()
  subject: string;

  @ApiProperty({ enum: EmailStatus })
  status: EmailStatus;

  @ApiProperty({ enum: EmailProvider })
  provider: EmailProvider;

  @ApiPropertyOptional()
  providerMessageId?: string;

  @ApiPropertyOptional()
  error?: string;

  @ApiPropertyOptional()
  sentAt?: Date;

  @ApiPropertyOptional()
  deliveredAt?: Date;

  @ApiPropertyOptional()
  openedAt?: Date;

  @ApiPropertyOptional()
  clickedAt?: Date;

  @ApiPropertyOptional()
  unsubscribedAt?: Date;

  @ApiPropertyOptional()
  bouncedAt?: Date;

  @ApiProperty()
  createdAt: Date;
}

export class EmailCaptureResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  userId: string;

  @ApiPropertyOptional()
  channelId?: string;

  @ApiPropertyOptional()
  automationId?: string;

  @ApiPropertyOptional()
  landingPageId?: string;

  @ApiProperty()
  email: string;

  @ApiPropertyOptional()
  firstName?: string;

  @ApiPropertyOptional()
  lastName?: string;

  @ApiProperty()
  customFields: Record<string, any>;

  @ApiProperty()
  source: string;

  @ApiProperty()
  isVerified: boolean;

  @ApiProperty()
  tags: string[];

  @ApiProperty()
  createdAt: Date;
}

import { IsBoolean } from 'class-validator';