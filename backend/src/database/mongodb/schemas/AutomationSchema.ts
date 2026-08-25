import { Schema, Document, Types } from 'mongoose';
import { AutomationStatus, TriggerType, ActionType } from '../schemas/enums';

export interface IAutomationAction extends Document {
  _id: Types.ObjectId;
  automationId: Types.ObjectId;
  type: ActionType;
  config: Record<string, any>;
  order: number;
  conditions: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

const AutomationActionSchema = new Schema<IAutomationAction>({
  automationId: {
    type: Schema.Types.ObjectId,
    ref: 'Automation',
    required: true,
    index: true,
  },
  type: {
    type: String,
    enum: Object.values(ActionType),
    required: true,
  },
  config: {
    type: Schema.Types.Mixed,
    required: true,
    default: {},
  },
  order: {
    type: Number,
    default: 0,
  },
  conditions: {
    type: Schema.Types.Mixed,
    default: {},
  },
}, {
  timestamps: true,
  collection: 'automation_actions',
});

AutomationActionSchema.index({ automationId: 1, order: 1 });

export interface IAutomation extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  channelId: Types.ObjectId;
  name: string;
  description?: string;
  status: AutomationStatus;
  triggerType: TriggerType;
  triggerConfig: Record<string, any>;
  executionCount: number;
  lastExecutedAt?: Date;
  settings: Record<string, any>;
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  actions?: IAutomationAction[];
}

const AutomationSchema = new Schema<IAutomation>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  channelId: {
    type: Schema.Types.ObjectId,
    ref: 'Channel',
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
  status: {
    type: String,
    enum: Object.values(AutomationStatus),
    default: AutomationStatus.DRAFT,
    index: true,
  },
  triggerType: {
    type: String,
    enum: Object.values(TriggerType),
    required: true,
  },
  triggerConfig: {
    type: Schema.Types.Mixed,
    required: true,
    default: {},
  },
  executionCount: {
    type: Number,
    default: 0,
  },
  lastExecutedAt: {
    type: Date,
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
  collection: 'automations',
});

AutomationSchema.index({ userId: 1, status: 1 });
AutomationSchema.index({ channelId: 1, status: 1 });
AutomationSchema.index({ createdAt: -1 });

AutomationSchema.virtual('actions', {
  ref: 'AutomationAction',
  localField: '_id',
  foreignField: 'automationId',
  options: { sort: { order: 1 } },
});

AutomationSchema.virtual('executions', {
  ref: 'AutomationExecution',
  localField: '_id',
  foreignField: 'automationId',
});

export { AutomationSchema, AutomationActionSchema };