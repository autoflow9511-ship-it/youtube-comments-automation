export interface User {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  avatar: string | null;
  role: 'USER' | 'ADMIN' | 'SUPER_ADMIN';
  subscriptionTier: 'FREE' | 'STARTER' | 'PRO' | 'ENTERPRISE';
  subscriptionExpiresAt: string | null;
  isEmailVerified: boolean;
  twoFactorEnabled: boolean;
  lastLoginAt: string | null;
  createdAt: string;
}

export interface Channel {
  id: string;
  userId: string;
  youtubeChannelId: string;
  title: string;
  description: string | null;
  customUrl: string | null;
  thumbnailUrl: string | null;
  subscriberCount: number;
  videoCount: number;
  viewCount: number;
  status: 'CONNECTED' | 'DISCONNECTED' | 'ERROR' | 'PENDING_REVIEW';
  accessToken: string;
  refreshToken: string;
  tokenExpiresAt: string;
  scope: string[];
  lastSyncedAt: string | null;
  syncError: string | null;
  settings: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface Automation {
  id: string;
  userId: string;
  channelId: string;
  name: string;
  description: string | null;
  status: 'ACTIVE' | 'PAUSED' | 'DRAFT' | 'ARCHIVED';
  triggerType: 'COMMENT_KEYWORD' | 'COMMENT_REGEX' | 'NEW_VIDEO' | 'CHANNEL_MILESTONE';
  triggerConfig: Record<string, any>;
  executionCount: number;
  lastExecutedAt: string | null;
  settings: Record<string, any>;
  createdAt: string;
  updatedAt: string;
  actions: AutomationAction[];
  channel?: Channel;
}

export interface AutomationAction {
  id: string;
  automationId: string;
  type: 'REPLY_COMMENT' | 'SEND_LANDING_PAGE_LINK' | 'COLLECT_EMAIL' | 'SEND_EMAIL' | 'ADD_TAG' | 'CALL_WEBHOOK';
  config: Record<string, any>;
  order: number;
  conditions: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface Comment {
  id: string;
  channelId: string;
  youtubeCommentId: string;
  videoId: string;
  videoTitle: string | null;
  authorChannelId: string;
  authorName: string;
  authorAvatar: string | null;
  text: string;
  likeCount: number;
  replyCount: number;
  isReply: boolean;
  parentCommentId: string | null;
  publishedAt: string;
  updatedAt: string;
  fetchedAt: string;
  processedAt: string | null;
  metadata: Record<string, any>;
  channel?: Channel;
  replies?: CommentReply[];
}

export interface CommentReply {
  id: string;
  commentId: string;
  automationId: string | null;
  youtubeReplyId: string | null;
  text: string;
  status: string;
  error: string | null;
  sentAt: string | null;
  createdAt: string;
}

export interface EmailCapture {
  id: string;
  userId: string;
  channelId: string | null;
  automationId: string | null;
  landingPageId: string | null;
  email: string;
  firstName: string | null;
  lastName: string | null;
  customFields: Record<string, any>;
  source: string;
  ipAddress: string | null;
  userAgent: string | null;
  referrer: string | null;
  consentGiven: boolean;
  consentIp: string | null;
  consentAt: string | null;
  tags: string[];
  isVerified: boolean;
  verificationToken: string | null;
  verifiedAt: string | null;
  unsubscribedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface EmailSequence {
  id: string;
  userId: string;
  name: string;
  description: string | null;
  isActive: boolean;
  triggerType: string;
  triggerConfig: Record<string, any>;
  createdAt: string;
  updatedAt: string;
  steps: EmailSequenceStep[];
}

export interface EmailSequenceStep {
  id: string;
  sequenceId: string;
  order: number;
  delayHours: number;
  delayDays: number;
  subject: string;
  htmlContent: string;
  textContent: string | null;
  conditions: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface EmailLog {
  id: string;
  userId: string;
  emailCaptureId: string | null;
  enrollmentId: string | null;
  sequenceStepId: string | null;
  toEmail: string;
  fromEmail: string;
  subject: string;
  htmlContent: string;
  textContent: string | null;
  status: 'PENDING' | 'SENT' | 'DELIVERED' | 'OPENED' | 'CLICKED' | 'BOUNCED' | 'FAILED' | 'UNSUBSCRIBED';
  provider: 'SMTP' | 'SENDGRID' | 'MAILGUN' | 'SES';
  providerMessageId: string | null;
  error: string | null;
  sentAt: string | null;
  deliveredAt: string | null;
  openedAt: string | null;
  clickedAt: string | null;
  unsubscribedAt: string | null;
  bouncedAt: string | null;
  metadata: Record<string, any>;
  createdAt: string;
}

export interface LandingPage {
  id: string;
  userId: string;
  channelId: string | null;
  name: string;
  slug: string;
  title: string;
  description: string | null;
  htmlContent: string;
  cssContent: string | null;
  jsContent: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  seoImage: string | null;
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  customDomain: string | null;
  publishUrl: string | null;
  settings: Record<string, any>;
  formFields: any[];
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
}

export interface LandingPageSubmission {
  id: string;
  landingPageId: string;
  emailCaptureId: string | null;
  formData: Record<string, any>;
  ipAddress: string | null;
  userAgent: string | null;
  referrer: string | null;
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  utmContent: string | null;
  utmTerm: string | null;
  createdAt: string;
}

export interface DashboardStats {
  channels: { total: number; connected: number };
  automations: { total: number; active: number };
  comments: { total: number; processed: number };
  emails: { total: number; thisMonth: number };
  landingPages: { total: number; published: number };
  submissions: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface ApiError {
  statusCode: number;
  error: string;
  message: string;
  details: any;
  timestamp: string;
  path: string;
  method: string;
}