import { Schema, Document, Types } from 'mongoose';
import { LandingPageStatus } from '../schemas/enums';

export interface ILandingPage extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  channelId?: Types.ObjectId;
  name: string;
  slug: string;
  title: string;
  description?: string;
  htmlContent: string;
  cssContent?: string;
  jsContent?: string;
  seoTitle?: string;
  seoDescription?: string;
  seoImage?: string;
  status: LandingPageStatus;
  customDomain?: string;
  publishUrl?: string;
  settings: Record<string, any>;
  formFields: any[];
  deletedAt?: Date;
  publishedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const LandingPageSchema = new Schema<ILandingPage>({
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
  name: {
    type: String,
    required: true,
    trim: true,
  },
  slug: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
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
  htmlContent: {
    type: String,
    required: true,
  },
  cssContent: {
    type: String,
  },
  jsContent: {
    type: String,
  },
  seoTitle: {
    type: String,
  },
  seoDescription: {
    type: String,
  },
  seoImage: {
    type: String,
  },
  status: {
    type: String,
    enum: Object.values(LandingPageStatus),
    default: LandingPageStatus.DRAFT,
    index: true,
  },
  customDomain: {
    type: String,
    sparse: true,
  },
  publishUrl: {
    type: String,
  },
  settings: {
    type: Schema.Types.Mixed,
    default: {},
  },
  formFields: {
    type: Schema.Types.Mixed,
    default: [],
  },
  deletedAt: {
    type: Date,
    index: true,
    default: null,
  },
  publishedAt: {
    type: Date,
  },
}, {
  timestamps: true,
  collection: 'landing_pages',
});

LandingPageSchema.index({ userId: 1, status: 1 });
LandingPageSchema.index({ slug: 1 }, { unique: true });
LandingPageSchema.index({ userId: 1, createdAt: -1 });

LandingPageSchema.virtual('submissions', {
  ref: 'LandingPageSubmission',
  localField: '_id',
  foreignField: 'landingPageId',
});

export interface ILandingPageSubmission extends Document {
  _id: Types.ObjectId;
  landingPageId: Types.ObjectId;
  emailCaptureId?: Types.ObjectId;
  formData: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  referrer?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmContent?: string;
  utmTerm?: string;
  createdAt: Date;
}

const LandingPageSubmissionSchema = new Schema<ILandingPageSubmission>({
  landingPageId: {
    type: Schema.Types.ObjectId,
    ref: 'LandingPage',
    required: true,
    index: true,
  },
  emailCaptureId: {
    type: Schema.Types.ObjectId,
    ref: 'EmailCapture',
    index: true,
    default: null,
  },
  formData: {
    type: Schema.Types.Mixed,
    default: {},
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
  utmSource: { type: String },
  utmMedium: { type: String },
  utmCampaign: { type: String },
  utmContent: { type: String },
  utmTerm: { type: String },
}, {
  timestamps: true,
  collection: 'landing_page_submissions',
});

LandingPageSubmissionSchema.index({ landingPageId: 1, createdAt: -1 });
LandingPageSubmissionSchema.index({ emailCaptureId: 1, createdAt: -1 });

export { LandingPageSchema, LandingPageSubmissionSchema };