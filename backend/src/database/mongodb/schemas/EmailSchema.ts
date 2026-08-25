import { Schema, Document, Types } from 'mongoose';
import { EmailProvider, EmailStatus } from '../schemas/enums';

export interface IEmailCapture extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  channelId?: Types.ObjectId;
  automationId?: Types.ObjectId;
  landingPageId?: Types.ObjectId;
  email: string;
  firstName?: string;
  lastName?: string;
  customFields: Record<string, any>;
  source: string;
  ipAddress?: string;
  userAgent?: string;
  referrer?: string;
  consentGiven: boolean;
  consentIp?: string;
  consentAt?: Date;
  tags: string[];
  isVerified: boolean;
  verificationToken?: string;
  verifiedAt?: Date;
  unsubscribedAt?: Date;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmContent?: string;
  utmTerm?: string;
  createdAt: Date;
  updatedAt: Date;
}

const EmailCaptureSchema = new Schema<IEmailCapture>({
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
  landingPageId: {
    type: Schema.Types.ObjectId,
    ref: 'LandingPage',
    index: true,
    default: null,
  },
  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true,
    index: true,
  },
  firstName: {
    type: String,
    trim: true,
  },
  lastName: {
    type: String,
    trim: true,
  },
  customFields: {
    type: Schema.Types.Mixed,
    default: {},
  },
  source: {
    type: String,
    default: 'landing_page',
    index: true,
  },
  ipAddress: {
    type: String,
  },
  userAgent: {
    type: String,
  },
  referrer: {
    type: String,
  },
  consentGiven: {
    type: Boolean,
    default: false,
  },
  consentIp: {
    type: String,
  },
  consentAt: {
    type: Date,
  },
  tags: {
    type: [String],
    default: [],
    index: true,
  },
  isVerified: {
    type: Boolean,
    default: false,
    index: true,
  },
  verificationToken: {
    type: String,
    select: false,
  },
  verifiedAt: {
    type: Date,
  },
  unsubscribedAt: {
    type: Date,
    index: true,
    default: null,
  },
  utmSource: { type: String },
  utmMedium: { type: String },
  utmCampaign: { type: String },
  utmContent: { type: String },
  utmTerm: { type: String },
}, {
  timestamps: true,
  collection: 'email_captures',
});

EmailCaptureSchema.index({ userId: 1, email: 1 }, { unique: true });
EmailCaptureSchema.index({ userId: 1, createdAt: -1 });
EmailCaptureSchema.index({ channelId: 1, createdAt: -1 });
EmailCaptureSchema.index({ automationId: 1, createdAt: -1 });
EmailCaptureSchema.index({ landingPageId: 1, createdAt: -1 });
EmailCaptureSchema.index({ email: 1, isVerified: 1 });

EmailCaptureSchema.virtual('emailLogs', {
  ref: 'EmailLog',
  localField: '_id',
  foreignField: 'emailCaptureId',
});

EmailCaptureSchema.virtual('enrollments', {
  ref: 'EmailEnrollment',
  localField: '_id',
  foreignField: 'emailCaptureId',
});

export interface IEmailSequence extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  name: string;
  description?: string;
  isActive: boolean;
  triggerType: string;
  triggerConfig: Record<string, any>;
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  steps?: IEmailSequenceStep[];
}

export interface IEmailSequenceStep extends Document {
  _id: Types.ObjectId;
  sequenceId: Types.ObjectId;
  order: number;
  delayHours: number;
  delayDays: number;
  subject: string;
  htmlContent: string;
  textContent?: string;
  conditions: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

const EmailSequenceStepSchema = new Schema<IEmailSequenceStep>({
  sequenceId: {
    type: Schema.Types.ObjectId,
    ref: 'EmailSequence',
    required: true,
    index: true,
  },
  order: {
    type: Number,
    required: true,
    index: true,
  },
  delayHours: {
    type: Number,
    default: 0,
  },
  delayDays: {
    type: Number,
    default: 0,
  },
  subject: {
    type: String,
    required: true,
  },
  htmlContent: {
    type: String,
    required: true,
  },
  textContent: {
    type: String,
  },
  conditions: {
    type: Schema.Types.Mixed,
    default: {},
  },
}, {
  timestamps: true,
  collection: 'email_sequence_steps',
});

EmailSequenceStepSchema.index({ sequenceId: 1, order: 1 }, { unique: true });

const EmailSequenceSchema = new Schema<IEmailSequence>({
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
  description: {
    type: String,
  },
  isActive: {
    type: Boolean,
    default: true,
    index: true,
  },
  triggerType: {
    type: String,
    default: 'immediate',
  },
  triggerConfig: {
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
  collection: 'email_sequences',
});

EmailSequenceSchema.index({ userId: 1, isActive: 1 });
EmailSequenceSchema.index({ createdAt: -1 });

EmailSequenceSchema.virtual('steps', {
  ref: 'EmailSequenceStep',
  localField: '_id',
  foreignField: 'sequenceId',
  options: { sort: { order: 1 } },
});

EmailSequenceSchema.virtual('enrollments', {
  ref: 'EmailEnrollment',
  localField: '_id',
  foreignField: 'sequenceId',
});

export interface IEmailEnrollment extends Document {
  _id: Types.ObjectId;
  sequenceId: Types.ObjectId;
  emailCaptureId: Types.ObjectId;
  currentStep: number;
  status: string;
  startedAt: Date;
  completedAt?: Date;
  pausedAt?: Date;
  nextSendAt?: Date;
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

const EmailEnrollmentSchema = new Schema<IEmailEnrollment>({
  sequenceId: {
    type: Schema.Types.ObjectId,
    ref: 'EmailSequence',
    required: true,
    index: true,
  },
  emailCaptureId: {
    type: Schema.Types.ObjectId,
    ref: 'EmailCapture',
    required: true,
    index: true,
  },
  currentStep: {
    type: Number,
    default: 0,
  },
  status: {
    type: String,
    default: 'active',
    index: true,
  },
  startedAt: {
    type: Date,
    default: Date.now,
  },
  completedAt: {
    type: Date,
  },
  pausedAt: {
    type: Date,
  },
  nextSendAt: {
    type: Date,
    index: true,
  },
  metadata: {
    type: Schema.Types.Mixed,
    default: {},
  },
}, {
  timestamps: true,
  collection: 'email_enrollments',
});

EmailEnrollmentSchema.index({ sequenceId: 1, emailCaptureId: 1 }, { unique: true });
EmailEnrollmentSchema.index({ status: 1, nextSendAt: 1 });

export interface IEmailLog extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  emailCaptureId?: Types.ObjectId;
  enrollmentId?: Types.ObjectId;
  sequenceStepId?: Types.ObjectId;
  toEmail: string;
  fromEmail: string;
  subject: string;
  htmlContent: string;
  textContent?: string;
  status: EmailStatus;
  provider: EmailProvider;
  providerMessageId?: string;
  error?: string;
  sentAt?: Date;
  deliveredAt?: Date;
  openedAt?: Date;
  clickedAt?: Date;
  unsubscribedAt?: Date;
  bouncedAt?: Date;
  metadata: Record<string, any>;
  createdAt: Date;
}

const EmailLogSchema = new Schema<IEmailLog>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  emailCaptureId: {
    type: Schema.Types.ObjectId,
    ref: 'EmailCapture',
    index: true,
    default: null,
  },
  enrollmentId: {
    type: Schema.Types.ObjectId,
    ref: 'EmailEnrollment',
    index: true,
    default: null,
  },
  sequenceStepId: {
    type: Schema.Types.ObjectId,
    ref: 'EmailSequenceStep',
    index: true,
    default: null,
  },
  toEmail: {
    type: String,
    required: true,
    lowercase: true,
    trim: true,
  },
  fromEmail: {
    type: String,
    required: true,
  },
  subject: {
    type: String,
    required: true,
  },
  htmlContent: {
    type: String,
    required: true,
  },
  textContent: {
    type: String,
  },
  status: {
    type: String,
    enum: Object.values(EmailStatus),
    default: EmailStatus.PENDING,
    index: true,
  },
  provider: {
    type: String,
    enum: Object.values(EmailProvider),
    default: EmailProvider.SMTP,
  },
  providerMessageId: {
    type: String,
  },
  error: {
    type: String,
  },
  sentAt: {
    type: Date,
    index: true,
  },
  deliveredAt: {
    type: Date,
  },
  openedAt: {
    type: Date,
  },
  clickedAt: {
    type: Date,
  },
  unsubscribedAt: {
    type: Date,
  },
  bouncedAt: {
    type: Date,
  },
  metadata: {
    type: Schema.Types.Mixed,
    default: {},
  },
}, {
  timestamps: true,
  collection: 'email_logs',
});

EmailLogSchema.index({ userId: 1, createdAt: -1 });
EmailLogSchema.index({ emailCaptureId: 1, createdAt: -1 });
EmailLogSchema.index({ enrollmentId: 1, createdAt: -1 });
EmailLogSchema.index({ status: 1, sentAt: -1 });
EmailLogSchema.index({ providerMessageId: 1 }, { sparse: true });

export { 
  EmailCaptureSchema, 
  EmailSequenceSchema, 
  EmailSequenceStepSchema, 
  EmailEnrollmentSchema, 
  EmailLogSchema 
};