import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type EmailDeliveryStatusDocument = EmailDeliveryStatus & Document;

export enum EmailDeliveryStatusEnum {
  QUEUED = 'queued',
  PROCESSING = 'processing',
  SENT = 'sent',
  FAILED = 'failed',
  RETRYING = 'retrying',
  BOUNCED = 'bounced',
  DELIVERED = 'delivered',
  OPENED = 'opened',
  CLICKED = 'clicked',
  UNSUBSCRIBED = 'unsubscribed',
}

@Schema({ 
  timestamps: true,
  collection: 'email_delivery_statuses'
})
export class EmailDeliveryStatus {
  @Prop({ type: Types.ObjectId, required: true, index: true })
  userId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, required: true, index: true })
  automationId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, index: true })
  formSubmissionId?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, index: true })
  emailLogId?: Types.ObjectId;

  @Prop({ required: true, lowercase: true, trim: true, index: true })
  toEmail: string;

  @Prop({ required: true })
  subject: string;

  @Prop({ 
    type: String, 
    enum: Object.values(EmailDeliveryStatusEnum), 
    default: EmailDeliveryStatusEnum.QUEUED,
    index: true 
  })
  status: EmailDeliveryStatusEnum;

  @Prop({ type: Types.ObjectId, index: true })
  automationActionId?: Types.ObjectId;

  @Prop({ default: 0 })
  retryCount: number;

  @Prop({ default: 3 })
  maxRetries: number;

  @Prop()
  errorMessage?: string;

  @Prop()
  errorCode?: string;

  @Prop()
  providerMessageId?: string;

  @Prop()
  providerResponse?: Record<string, any>;

  @Prop()
  sentAt?: Date;

  @Prop()
  deliveredAt?: Date;

  @Prop()
  openedAt?: Date;

  @Prop()
  clickedAt?: Date;

  @Prop()
  unsubscribedAt?: Date;

  @Prop()
  bouncedAt?: Date;

  @Prop()
  nextRetryAt?: Date;

  @Prop({ default: 'smtp' })
  provider: string;

  @Prop()
  providerConfig?: Record<string, any>;

  createdAt: Date;
  updatedAt: Date;
}

export const EmailDeliveryStatusSchema = SchemaFactory.createForClass(EmailDeliveryStatus);

EmailDeliveryStatusSchema.index({ userId: 1, automationId: 1, status: 1 });
EmailDeliveryStatusSchema.index({ automationId: 1, status: 1, createdAt: -1 });
EmailDeliveryStatusSchema.index({ toEmail: 1, automationId: 1 });
EmailDeliveryStatusSchema.index({ status: 1, nextRetryAt: 1 });
EmailDeliveryStatusSchema.index({ providerMessageId: 1 }, { sparse: true });