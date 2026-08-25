import { Schema, Document, Types } from 'mongoose';

export interface IComment extends Document {
  _id: Types.ObjectId;
  channelId: Types.ObjectId;
  youtubeCommentId: string;
  videoId: string;
  videoTitle?: string;
  authorChannelId: string;
  authorName: string;
  authorAvatar?: string;
  text: string;
  likeCount: number;
  replyCount: number;
  isReply: boolean;
  parentCommentId?: Types.ObjectId;
  publishedAt: Date;
  updatedAt: Date;
  fetchedAt: Date;
  processedAt?: Date;
  metadata: Record<string, any>;
  deletedAt?: Date;
  createdAt: Date;
  updatedAtSchema: Date;
}

const CommentSchema = new Schema<IComment>({
  channelId: {
    type: Schema.Types.ObjectId,
    ref: 'Channel',
    required: true,
    index: true,
  },
  youtubeCommentId: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  videoId: {
    type: String,
    required: true,
    index: true,
  },
  videoTitle: {
    type: String,
  },
  authorChannelId: {
    type: String,
    required: true,
    index: true,
  },
  authorName: {
    type: String,
    required: true,
  },
  authorAvatar: {
    type: String,
  },
  text: {
    type: String,
    required: true,
  },
  likeCount: {
    type: Number,
    default: 0,
  },
  replyCount: {
    type: Number,
    default: 0,
  },
  isReply: {
    type: Boolean,
    default: false,
    index: true,
  },
  parentCommentId: {
    type: Schema.Types.ObjectId,
    ref: 'Comment',
    index: true,
    default: null,
  },
  publishedAt: {
    type: Date,
    required: true,
    index: true,
  },
  updatedAt: {
    type: Date,
    required: true,
  },
  fetchedAt: {
    type: Date,
    default: Date.now,
  },
  processedAt: {
    type: Date,
    index: true,
    default: null,
  },
  metadata: {
    type: Schema.Types.Mixed,
    default: {},
  },
  deletedAt: {
    type: Date,
    index: true,
    default: null,
  },
}, {
  timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAtSchema' },
  collection: 'comments',
});

CommentSchema.index({ channelId: 1, publishedAt: -1 });
CommentSchema.index({ channelId: 1, processedAt: 1 });
CommentSchema.index({ videoId: 1, publishedAt: -1 });
CommentSchema.index({ authorChannelId: 1, publishedAt: -1 });

CommentSchema.virtual('replies', {
  ref: 'CommentReply',
  localField: '_id',
  foreignField: 'commentId',
});

CommentSchema.virtual('automationExecution', {
  ref: 'AutomationExecution',
  localField: '_id',
  foreignField: 'triggerCommentId',
});

export interface ICommentReply extends Document {
  _id: Types.ObjectId;
  commentId: Types.ObjectId;
  automationId?: Types.ObjectId;
  youtubeReplyId?: string;
  text: string;
  status: string;
  error?: string;
  sentAt?: Date;
  createdAt: Date;
}

const CommentReplySchema = new Schema<ICommentReply>({
  commentId: {
    type: Schema.Types.ObjectId,
    ref: 'Comment',
    required: true,
    index: true,
  },
  automationId: {
    type: Schema.Types.ObjectId,
    ref: 'Automation',
    index: true,
    default: null,
  },
  youtubeReplyId: {
    type: String,
    sparse: true,
    unique: true,
  },
  text: {
    type: String,
    required: true,
  },
  status: {
    type: String,
    default: 'pending',
    index: true,
  },
  error: {
    type: String,
  },
  sentAt: {
    type: Date,
  },
}, {
  timestamps: true,
  collection: 'comment_replies',
});

CommentReplySchema.index({ commentId: 1, status: 1 });
CommentReplySchema.index({ automationId: 1, status: 1 });

export { CommentSchema, CommentReplySchema };