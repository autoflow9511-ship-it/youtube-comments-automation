import { Schema, Document, Types } from 'mongoose';

export interface IAutomationExecution extends Document {
  _id: Types.ObjectId;
  automationId: Types.ObjectId;
  triggerData: Record<string, any>;
  triggerCommentId?: Types.ObjectId;
  status: string;
  startedAt: Date;
  completedAt?: Date;
  error?: string;
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
  actions?: IActionExecution[];
}

const AutomationExecutionSchema = new Schema<IAutomationExecution>({
  automationId: {
    type: Schema.Types.ObjectId,
    ref: 'Automation',
    required: true,
    index: true,
  },
  triggerData: {
    type: Schema.Types.Mixed,
    required: true,
    default: {},
  },
  triggerCommentId: {
    type: Schema.Types.ObjectId,
    ref: 'Comment',
    index: true,
    default: null,
  },
  status: {
    type: String,
    default: 'pending',
    index: true,
  },
  startedAt: {
    type: Date,
    default: Date.now,
    index: true,
  },
  completedAt: {
    type: Date,
  },
  error: {
    type: String,
  },
  metadata: {
    type: Schema.Types.Mixed,
    default: {},
  },
}, {
  timestamps: true,
  collection: 'automation_executions',
});

AutomationExecutionSchema.index({ automationId: 1, startedAt: -1 });
AutomationExecutionSchema.index({ status: 1, startedAt: -1 });
AutomationExecutionSchema.index({ triggerCommentId: 1 });

AutomationExecutionSchema.virtual('actions', {
  ref: 'ActionExecution',
  localField: '_id',
  foreignField: 'executionId',
  options: { sort: { createdAt: 1 } },
});

export interface IActionExecution extends Document {
  _id: Types.ObjectId;
  executionId: Types.ObjectId;
  actionId: Types.ObjectId;
  status: string;
  inputData: Record<string, any>;
  outputData: Record<string, any>;
  error?: string;
  startedAt: Date;
  completedAt?: Date;
  retryCount: number;
}

const ActionExecutionSchema = new Schema<IActionExecution>({
  executionId: {
    type: Schema.Types.ObjectId,
    ref: 'AutomationExecution',
    required: true,
    index: true,
  },
  actionId: {
    type: Schema.Types.ObjectId,
    ref: 'AutomationAction',
    required: true,
    index: true,
  },
  status: {
    type: String,
    default: 'pending',
    index: true,
  },
  inputData: {
    type: Schema.Types.Mixed,
    default: {},
  },
  outputData: {
    type: Schema.Types.Mixed,
    default: {},
  },
  error: {
    type: String,
  },
  startedAt: {
    type: Date,
    default: Date.now,
  },
  completedAt: {
    type: Date,
  },
  retryCount: {
    type: Number,
    default: 0,
  },
}, {
  timestamps: true,
  collection: 'action_executions',
});

ActionExecutionSchema.index({ executionId: 1, createdAt: 1 });
ActionExecutionSchema.index({ actionId: 1, status: 1 });

export { AutomationExecutionSchema, ActionExecutionSchema };