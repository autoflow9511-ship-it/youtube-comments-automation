import { Schema, Document, Types } from 'mongoose';
import { WebhookEventType } from '../schemas/enums';

export interface IWebhookEvent extends Document {
  _id: Types.ObjectId;
  channelId: Types.ObjectId;
  eventType: WebhookEventType;
  resourceId: string;
  payload: Record<string, any>;
  processed: boolean;
  processedAt?: Date;
  error?: string;
  retryCount: number;
  receivedAt: Date;
}

const WebhookEventSchema = new Schema<IWebhookEvent>({
  channelId: {
    type: Schema.Types.ObjectId,
    ref: 'Channel',
    required: true,
    index: true,
  },
  eventType: {
    type: String,
    enum: Object.values(WebhookEventType),
    required: true,
    index: true,
  },
  resourceId: {
    type: String,
    required: true,
  },
  payload: {
    type: Schema.Types.Mixed,
    required: true,
    default: {},
  },
  processed: {
    type: Boolean,
    default: false,
    index: true,
  },
  processedAt: {
    type: Date,
  },
  error: {
    type: String,
  },
  retryCount: {
    type: Number,
    default: 0,
  },
  receivedAt: {
    type: Date,
    default: Date.now,
    index: true,
  },
}, {
  timestamps: false,
  collection: 'webhook_events',
});

WebhookEventSchema.index({ channelId: 1, receivedAt: -1 });
WebhookEventSchema.index({ eventType: 1, processed: 1 });
WebhookEventSchema.index({ processed: 1, receivedAt: 1 });

export interface IAnalyticsEvent extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  channelId?: Types.ObjectId;
  automationId?: Types.ObjectId;
  eventType: string;
  eventData: Record<string, any>;
  metadata: Record<string, any>;
  sessionId?: string;
  createdAt: Date;
}

const AnalyticsEventSchema = new Schema<IAnalyticsEvent>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  channelId: {
    type: Schema.Types.ObjectId,
    ref: 'Channel',
    index: true,
    default: null,
  },
  automationId: {
    type: Schema.Types.ObjectId,
    ref: 'Automation',
    index: true,
    default: null,
  },
  eventType: {
    type: String,
    required: true,
    index: true,
  },
  eventData: {
    type: Schema.Types.Mixed,
    default: {},
  },
  metadata: {
    type: Schema.Types.Mixed,
    default: {},
  },
  sessionId: {
    type: String,
    index: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true,
  },
}, {
  timestamps: false,
  collection: 'analytics_events',
});

AnalyticsEventSchema.index({ userId: 1, createdAt: -1 });
AnalyticsEventSchema.index({ channelId: 1, createdAt: -1 });
AnalyticsEventSchema.index({ automationId: 1, createdAt: -1 });
AnalyticsEventSchema.index({ eventType: 1, createdAt: -1 });

export interface INotification extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  type: string;
  title: string;
  message: string;
  data: Record<string, any>;
  isRead: boolean;
  readAt?: Date;
  createdAt: Date;
}

const NotificationSchema = new Schema<INotification>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  type: {
    type: String,
    required: true,
    index: true,
  },
  title: {
    type: String,
    required: true,
  },
  message: {
    type: String,
    required: true,
  },
  data: {
    type: Schema.Types.Mixed,
    default: {},
  },
  isRead: {
    type: Boolean,
    default: false,
    index: true,
  },
  readAt: {
    type: Date,
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true,
  },
}, {
  timestamps: false,
  collection: 'notifications',
});

NotificationSchema.index({ userId: 1, isRead: 1, createdAt: -1 });
NotificationSchema.index({ userId: 1, createdAt: -1 });

export interface IAuditLog extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  adminId?: Types.ObjectId;
  action: string;
  resource: string;
  resourceId?: string;
  oldData?: Record<string, any>;
  newData?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
}

const AuditLogSchema = new Schema<IAuditLog>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  adminId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    index: true,
    default: null,
  },
  action: {
    type: String,
    required: true,
    index: true,
  },
  resource: {
    type: String,
    required: true,
    index: true,
  },
  resourceId: {
    type: String,
    index: true,
  },
  oldData: {
    type: Schema.Types.Mixed,
  },
  newData: {
    type: Schema.Types.Mixed,
  },
  ipAddress: {
    type: String,
  },
  userAgent: {
    type: String,
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true,
  },
}, {
  timestamps: false,
  collection: 'audit_logs',
});

AuditLogSchema.index({ userId: 1, createdAt: -1 });
AuditLogSchema.index({ adminId: 1, createdAt: -1 });
AuditLogSchema.index({ action: 1, createdAt: -1 });
AuditLogSchema.index({ resource: 1, createdAt: -1 });

export interface IApiKey extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  name: string;
  keyHash: string;
  prefix: string;
  lastUsedAt?: Date;
  expiresAt?: Date;
  revokedAt?: Date;
  createdAt: Date;
}

const ApiKeySchema = new Schema<IApiKey>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  name: {
    type: String,
    required: true,
    trim: true,
  },
  keyHash: {
    type: String,
    required: true,
    select: false,
  },
  prefix: {
    type: String,
    required: true,
  },
  lastUsedAt: {
    type: Date,
  },
  expiresAt: {
    type: Date,
    index: true,
  },
  revokedAt: {
    type: Date,
    default: null,
  },
}, {
  timestamps: { createdAt: 'createdAt', updatedAt: false },
  collection: 'api_keys',
});

ApiKeySchema.index({ userId: 1, revokedAt: 1 });
ApiKeySchema.index({ keyHash: 1 }, { unique: true });

export interface ISystemConfig extends Document {
  _id: Types.ObjectId;
  key: string;
  value: Record<string, any>;
  description?: string;
  isPublic: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const SystemConfigSchema = new Schema<ISystemConfig>({
  key: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    index: true,
  },
  value: {
    type: Schema.Types.Mixed,
    required: true,
    default: {},
  },
  description: {
    type: String,
  },
  isPublic: {
    type: Boolean,
    default: false,
  },
}, {
  timestamps: true,
  collection: 'system_configs',
});

SystemConfigSchema.index({ isPublic: 1 });

export { 
  WebhookEventSchema, 
  AnalyticsEventSchema, 
  NotificationSchema, 
  AuditLogSchema, 
  ApiKeySchema, 
  SystemConfigSchema 
};