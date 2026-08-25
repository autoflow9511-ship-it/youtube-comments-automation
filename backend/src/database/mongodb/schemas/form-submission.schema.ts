import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type FormSubmissionDocument = FormSubmission & Document;

@Schema({ 
  timestamps: true,
  collection: 'form_submissions'
})
export class FormSubmission {
  @Prop({ type: Types.ObjectId, required: true, index: true })
  userId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, required: true, index: true })
  automationId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, required: true, index: true })
  formId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, index: true })
  channelId?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, index: true })
  videoId?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, index: true })
  commentId?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, index: true })
  emailCaptureId?: Types.ObjectId;

  @Prop({ required: true, lowercase: true, trim: true, index: true })
  email: string;

  @Prop()
  firstName?: string;

  @Prop()
  lastName?: string;

  @Prop({ type: Object, default: {} })
  customFields: Record<string, any>;

  @Prop()
  ipAddress?: string;

  @Prop()
  userAgent?: string;

  @Prop()
  referrer?: string;

  @Prop()
  utmSource?: string;

  @Prop()
  utmMedium?: string;

  @Prop()
  utmCampaign?: string;

  @Prop()
  utmContent?: string;

  @Prop()
  utmTerm?: string;

  @Prop({ default: 'pending' })
  deliveryStatus: 'pending' | 'queued' | 'processing' | 'sent' | 'failed' | 'retrying';

  @Prop()
  errorMessage?: string;

  @Prop()
  emailLogId?: Types.ObjectId;

  @Prop({ default: Date.now })
  submittedAt: Date;

  createdAt: Date;
  updatedAt: Date;
}

export const FormSubmissionSchema = SchemaFactory.createForClass(FormSubmission);

FormSubmissionSchema.index({ userId: 1, automationId: 1 });
FormSubmissionSchema.index({ automationId: 1, email: 1, videoId: 1 }, { unique: true });
FormSubmissionSchema.index({ formId: 1, createdAt: -1 });
FormSubmissionSchema.index({ channelId: 1, createdAt: -1 });
FormSubmissionSchema.index({ videoId: 1, createdAt: -1 });
FormSubmissionSchema.index({ deliveryStatus: 1 });
FormSubmissionSchema.index({ submittedAt: -1 });
FormSubmissionSchema.index({ 
  automationId: 1, 
  email: 1, 
  videoId: 1 
}, { unique: true, partialFilterExpression: { email: { $exists: true } } });