import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type AutomationVideoDocument = AutomationVideo & Document;

@Schema({ 
  timestamps: true,
  collection: 'automation_videos'
})
export class AutomationVideo {
  @Prop({ type: Types.ObjectId, required: true, index: true })
  automationId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, required: true, index: true })
  videoId: Types.ObjectId;

  @Prop()
  videoTitle?: string;

  @Prop()
  videoThumbnailUrl?: string;

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ type: Types.ObjectId, required: true, index: true })
  channelId: Types.ObjectId;

  createdAt: Date;
  updatedAt: Date;
}

export const AutomationVideoSchema = SchemaFactory.createForClass(AutomationVideo);

AutomationVideoSchema.index({ automationId: 1, videoId: 1 }, { unique: true });
AutomationVideoSchema.index({ channelId: 1, isActive: 1 });
AutomationVideoSchema.index({ videoId: 1, isActive: 1 });