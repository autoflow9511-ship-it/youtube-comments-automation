import { Schema, Document, Types } from 'mongoose';
import { ChannelStatus } from '../schemas/enums';

export interface IChannel extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  youtubeChannelId: string;
  title: string;
  description?: string;
  customUrl?: string;
  thumbnailUrl?: string;
  subscriberCount: number;
  videoCount: number;
  viewCount: number;
  status: ChannelStatus;
  accessToken: string;
  refreshToken: string;
  tokenExpiresAt: Date;
  scope: string[];
  lastSyncedAt?: Date;
  syncError?: string;
  settings: Record<string, any>;
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const ChannelSchema = new Schema<IChannel>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  youtubeChannelId: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  title: {
    type: String,
    required: true,
    trim: true,
  },
  description: {
    type: String,
  },
  customUrl: {
    type: String,
    sparse: true,
  },
  thumbnailUrl: {
    type: String,
  },
  subscriberCount: {
    type: Number,
    default: 0,
  },
  videoCount: {
    type: Number,
    default: 0,
  },
  viewCount: {
    type: Number,
    default: 0,
  },
  status: {
    type: String,
    enum: Object.values(ChannelStatus),
    default: ChannelStatus.PENDING_REVIEW,
    index: true,
  },
  accessToken: {
    type: String,
    required: true,
    select: false,
  },
  refreshToken: {
    type: String,
    required: true,
    select: false,
  },
  tokenExpiresAt: {
    type: Date,
    required: true,
    select: false,
  },
  scope: {
    type: [String],
    default: [],
  },
  lastSyncedAt: {
    type: Date,
  },
  syncError: {
    type: String,
  },
  settings: {
    type: Schema.Types.Mixed,
    default: {},
  },
  deletedAt: {
    type: Date,
    index: true,
    default: null,
  },
}, {
  timestamps: true,
  collection: 'channels',
});

ChannelSchema.index({ userId: 1, status: 1 });
ChannelSchema.index({ youtubeChannelId: 1 }, { unique: true });

ChannelSchema.virtual('automations', {
  ref: 'Automation',
  localField: '_id',
  foreignField: 'channelId',
});

ChannelSchema.virtual('comments', {
  ref: 'Comment',
  localField: '_id',
  foreignField: 'channelId',
});

ChannelSchema.virtual('webhookEvents', {
  ref: 'WebhookEvent',
  localField: '_id',
  foreignField: 'channelId',
});

export default ChannelSchema;