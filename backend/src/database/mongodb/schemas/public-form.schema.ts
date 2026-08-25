import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type PublicFormDocument = PublicForm & Document;

@Schema({ 
  timestamps: true,
  collection: 'public_forms'
})
export class PublicForm {
  @Prop({ type: Types.ObjectId, required: true, index: true })
  userId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, required: true, index: true })
  automationId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, index: true })
  channelId?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, index: true })
  landingPageId?: Types.ObjectId;

  @Prop({ required: true, unique: true, index: true })
  publicFormId: string;

  @Prop({ required: true })
  name: string;

  @Prop()
  title?: string;

  @Prop()
  description?: string;

  @Prop()
  logoUrl?: string;

  @Prop()
  heading?: string;

  @Prop()
  formDescription?: string;

  @Prop()
  emailPlaceholder?: string;

  @Prop()
  submitButtonText?: string;

  @Prop()
  successMessage?: string;

  @Prop()
  errorMessage?: string;

  @Prop()
  privacyConsentText?: string;

  @Prop()
  privacyPolicyUrl?: string;

  @Prop({ default: true })
  requireConsent: boolean;

  @Prop({ default: 'email' })
  emailInputType: string;

  @Prop({ default: true })
  emailValidationEnabled: boolean;

  @Prop({ type: [String], default: [] })
  allowedEmailDomains?: string[];

  @Prop({ type: [String], default: [] })
  blockedEmailDomains?: string[];

  @Prop({ default: 'public' })
  status: 'draft' | 'published' | 'archived';

  @Prop()
  publishedAt?: Date;

  @Prop()
  customDomain?: string;

  @Prop()
  publicUrl?: string;

  @Prop({ type: Object, default: {} })
  settings: Record<string, any>;

  @Prop()
  deletedAt?: Date;

  createdAt: Date;
  updatedAt: Date;
}

export const PublicFormSchema = SchemaFactory.createForClass(PublicForm);

PublicFormSchema.index({ userId: 1, automationId: 1 });
PublicFormSchema.index({ publicFormId: 1 }, { unique: true });
PublicFormSchema.index({ status: 1 });