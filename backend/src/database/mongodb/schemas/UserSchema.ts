import { Schema, Document, Types } from 'mongoose';
import { UserRole, SubscriptionTier } from '../schemas/enums';

export interface IUser extends Document {
  _id: Types.ObjectId;
  email: string;
  passwordHash?: string;
  firstName?: string;
  lastName?: string;
  avatar?: string;
  role: UserRole;
  subscriptionTier: SubscriptionTier;
  subscriptionExpiresAt?: Date;
  stripeCustomerId?: string;
  isEmailVerified: boolean;
  emailVerificationToken?: string;
  passwordResetToken?: string;
  passwordResetExpires?: Date;
  twoFactorEnabled: boolean;
  twoFactorSecret?: string;
  lastLoginAt?: Date;
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    index: true,
  },
  passwordHash: {
    type: String,
    select: false,
  },
  firstName: {
    type: String,
    trim: true,
    maxlength: 50,
  },
  lastName: {
    type: String,
    trim: true,
    maxlength: 50,
  },
  avatar: {
    type: String,
  },
  role: {
    type: String,
    enum: Object.values(UserRole),
    default: UserRole.USER,
    index: true,
  },
  subscriptionTier: {
    type: String,
    enum: Object.values(SubscriptionTier),
    default: SubscriptionTier.FREE,
    index: true,
  },
  subscriptionExpiresAt: {
    type: Date,
  },
  stripeCustomerId: {
    type: String,
    sparse: true,
    index: true,
  },
  isEmailVerified: {
    type: Boolean,
    default: false,
  },
  emailVerificationToken: {
    type: String,
    select: false,
  },
  passwordResetToken: {
    type: String,
    select: false,
  },
  passwordResetExpires: {
    type: Date,
    select: false,
  },
  twoFactorEnabled: {
    type: Boolean,
    default: false,
  },
  twoFactorSecret: {
    type: String,
    select: false,
  },
  lastLoginAt: {
    type: Date,
  },
  deletedAt: {
    type: Date,
    index: true,
    default: null,
  },
}, {
  timestamps: true,
  collection: 'users',
});

UserSchema.index({ subscriptionTier: 1 });
UserSchema.index({ createdAt: -1 });

UserSchema.virtual('channels', {
  ref: 'Channel',
  localField: '_id',
  foreignField: 'userId',
});

UserSchema.virtual('automations', {
  ref: 'Automation',
  localField: '_id',
  foreignField: 'userId',
});

UserSchema.virtual('emailCaptures', {
  ref: 'EmailCapture',
  localField: '_id',
  foreignField: 'userId',
});

UserSchema.set('toJSON', {
  virtuals: true,
  transform: (doc, ret) => {
    delete ret.passwordHash;
    delete ret.emailVerificationToken;
    delete ret.passwordResetToken;
    delete ret.twoFactorSecret;
    return ret;
  },
});

export default UserSchema;