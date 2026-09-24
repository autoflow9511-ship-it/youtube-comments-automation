import { IsString, IsOptional, IsEnum, IsArray, ValidateNested, IsNumber, Min, IsObject, MinLength } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TriggerType, ActionType, AutomationStatus } from '@prisma/client';

export class AutomationActionConfigDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  config?: Record<string, any>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  conditions?: Record<string, any>;
}

export class CreateAutomationActionDto {
  @ApiProperty({ enum: ActionType })
  @IsEnum(ActionType)
  type: ActionType;

  @ApiProperty({ type: AutomationActionConfigDto })
  @ValidateNested()
  @Type(() => AutomationActionConfigDto)
  config: AutomationActionConfigDto;

  @ApiProperty({ example: 0 })
  @IsNumber()
  @Min(0)
  order: number;
}

export class CreateAutomationDto {
  @ApiProperty({ description: 'YouTube channel ID to monitor' })
  @IsString()
  channelId: string;

  @ApiProperty({ example: 'Welcome new subscribers' })
  @IsString()
  @MinLength(1)
  name: string;

  @ApiPropertyOptional({ example: 'Replies to comments with welcome message' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ enum: TriggerType })
  @IsEnum(TriggerType)
  triggerType: TriggerType;

  @ApiProperty({ 
    description: 'Trigger configuration varies by trigger type',
    example: { keywords: ['subscribe', 'subscribed', 'new here'] }
  })
  @IsObject()
  triggerConfig: Record<string, any>;

  @ApiPropertyOptional({ type: [String], example: ['video_id_1', 'video_id_2'], description: 'Video IDs to apply this automation to. Empty means all videos.' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  videoIds?: string[];

  @ApiProperty({ type: [CreateAutomationActionDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateAutomationActionDto)
  actions: CreateAutomationActionDto[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  settings?: Record<string, any>;
}

export class UpdateAutomationDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ enum: TriggerType })
  @IsOptional()
  @IsEnum(TriggerType)
  triggerType?: TriggerType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  triggerConfig?: Record<string, any>;

  @ApiPropertyOptional({ type: [String], example: ['video_id_1', 'video_id_2'], description: 'Video IDs to apply this automation to. Empty means all videos.' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  videoIds?: string[];

  @ApiPropertyOptional({ enum: AutomationStatus })
  @IsOptional()
  @IsEnum(AutomationStatus)
  status?: AutomationStatus;

  @ApiPropertyOptional({ type: [CreateAutomationActionDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateAutomationActionDto)
  actions?: CreateAutomationActionDto[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  settings?: Record<string, any>;
}

export class TriggerAutomationDto {
  @ApiProperty({ 
    description: 'Trigger data matching the automation trigger type',
    example: { commentId: 'comment_id', commentText: 'Thanks for the video!', authorChannelId: 'author_id', authorName: 'John', videoId: 'video_id' }
  })
  @IsObject()
  triggerData: Record<string, any>;
}

export class AutomationActionConfigResponseDto {
  @ApiProperty({ enum: ActionType })
  type: ActionType;

  @ApiProperty()
  config: Record<string, any>;

  @ApiProperty()
  conditions: Record<string, any>;

  @ApiProperty()
  order: number;
}

export class AutomationResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  userId: string;

  @ApiProperty()
  channelId: string;

  @ApiProperty()
  name: string;

  @ApiPropertyOptional()
  description?: string;

  @ApiProperty({ enum: AutomationStatus })
  status: AutomationStatus;

  @ApiProperty({ enum: TriggerType })
  triggerType: TriggerType;

  @ApiProperty()
  triggerConfig: Record<string, any>;

  @ApiProperty({ type: [String] })
  videoIds: string[];

  @ApiProperty()
  executionCount: number;

  @ApiPropertyOptional()
  lastExecutedAt?: Date;

  @ApiProperty()
  settings: Record<string, any>;

  @ApiProperty({ type: [AutomationActionConfigResponseDto] })
  actions: AutomationActionConfigResponseDto[];

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

export class AutomationExecutionResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  automationId: string;

  @ApiProperty()
  triggerData: Record<string, any>;

  @ApiProperty({ enum: ['pending', 'running', 'completed', 'failed'] })
  status: string;

  @ApiProperty()
  startedAt: Date;

  @ApiPropertyOptional()
  completedAt?: Date;

  @ApiPropertyOptional()
  error?: string;

  @ApiProperty()
  metadata: Record<string, any>;
}

export class ActionExecutionResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  executionId: string;

  @ApiProperty()
  actionId: string;

  @ApiProperty({ enum: ['pending', 'running', 'completed', 'failed'] })
  status: string;

  @ApiProperty()
  inputData: Record<string, any>;

  @ApiProperty()
  outputData: Record<string, any>;

  @ApiPropertyOptional()
  error?: string;

  @ApiProperty()
  retryCount: number;

  @ApiProperty()
  startedAt: Date;

  @ApiPropertyOptional()
  completedAt?: Date;
}

// MinLength imported at top of file