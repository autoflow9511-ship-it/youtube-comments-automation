import { Connection, Model } from 'mongoose';
import UserSchema from '../schemas/UserSchema';
import ChannelSchema from '../schemas/ChannelSchema';
import { AutomationSchema, AutomationActionSchema } from '../schemas/AutomationSchema';
import { CommentSchema, CommentReplySchema } from '../schemas/CommentSchema';
import { 
  EmailCaptureSchema, 
  EmailSequenceSchema, 
  EmailSequenceStepSchema, 
  EmailEnrollmentSchema, 
  EmailLogSchema 
} from '../schemas/EmailSchema';
import { LandingPageSchema, LandingPageSubmissionSchema } from '../schemas/LandingPageSchema';
import { 
  WebhookEventSchema, 
  AnalyticsEventSchema, 
  NotificationSchema, 
  AuditLogSchema, 
  ApiKeySchema, 
  SystemConfigSchema 
} from '../schemas/SystemSchema';
import { AutomationExecutionSchema, ActionExecutionSchema } from '../schemas/AutomationExecutionSchema';
import { PublicFormSchema } from '../schemas/PublicFormSchema';
import { FormSubmissionSchema } from '../schemas/FormSubmissionSchema';
import { EmailDeliveryStatusSchema } from '../schemas/EmailDeliveryStatusSchema';
import { AutomationVideoSchema } from '../schemas/AutomationVideoSchema';

export interface Models {
  User: Model<any>;
  Channel: Model<any>;
  Automation: Model<any>;
  AutomationAction: Model<any>;
  Comment: Model<any>;
  CommentReply: Model<any>;
  EmailCapture: Model<any>;
  EmailSequence: Model<any>;
  EmailSequenceStep: Model<any>;
  EmailEnrollment: Model<any>;
  EmailLog: Model<any>;
  LandingPage: Model<any>;
  LandingPageSubmission: Model<any>;
  WebhookEvent: Model<any>;
  AnalyticsEvent: Model<any>;
  Notification: Model<any>;
  AuditLog: Model<any>;
  ApiKey: Model<any>;
  SystemConfig: Model<any>;
  AutomationExecution: Model<any>;
  ActionExecution: Model<any>;
  PublicForm: Model<any>;
  FormSubmission: Model<any>;
  EmailDeliveryStatus: Model<any>;
  AutomationVideo: Model<any>;
}

export function createModels(connection: Connection): Models {
  return {
    User: connection.model('User', UserSchema),
    Channel: connection.model('Channel', ChannelSchema),
    Automation: connection.model('Automation', AutomationSchema),
    AutomationAction: connection.model('AutomationAction', AutomationActionSchema),
    Comment: connection.model('Comment', CommentSchema),
    CommentReply: connection.model('CommentReply', CommentReplySchema),
    EmailCapture: connection.model('EmailCapture', EmailCaptureSchema),
    EmailSequence: connection.model('EmailSequence', EmailSequenceSchema),
    EmailSequenceStep: connection.model('EmailSequenceStep', EmailSequenceStepSchema),
    EmailEnrollment: connection.model('EmailEnrollment', EmailEnrollmentSchema),
    EmailLog: connection.model('EmailLog', EmailLogSchema),
    LandingPage: connection.model('LandingPage', LandingPageSchema),
    LandingPageSubmission: connection.model('LandingPageSubmission', LandingPageSubmissionSchema),
    WebhookEvent: connection.model('WebhookEvent', WebhookEventSchema),
    AnalyticsEvent: connection.model('AnalyticsEvent', AnalyticsEventSchema),
    Notification: connection.model('Notification', NotificationSchema),
    AuditLog: connection.model('AuditLog', AuditLogSchema),
    ApiKey: connection.model('ApiKey', ApiKeySchema),
    SystemConfig: connection.model('SystemConfig', SystemConfigSchema),
    AutomationExecution: connection.model('AutomationExecution', AutomationExecutionSchema),
    ActionExecution: connection.model('ActionExecution', ActionExecutionSchema),
    PublicForm: connection.model('PublicForm', PublicFormSchema),
    FormSubmission: connection.model('FormSubmission', FormSubmissionSchema),
    EmailDeliveryStatus: connection.model('EmailDeliveryStatus', EmailDeliveryStatusSchema),
    AutomationVideo: connection.model('AutomationVideo', AutomationVideoSchema),
  };
}

export function getModelNames(): string[] {
  return [
    'User',
    'Channel',
    'Automation',
    'AutomationAction',
    'Comment',
    'CommentReply',
    'EmailCapture',
    'EmailSequence',
    'EmailSequenceStep',
    'EmailEnrollment',
    'EmailLog',
    'LandingPage',
    'LandingPageSubmission',
    'WebhookEvent',
    'AnalyticsEvent',
    'Notification',
    'AuditLog',
    'ApiKey',
    'SystemConfig',
    'AutomationExecution',
    'ActionExecution',
    'PublicForm',
    'FormSubmission',
    'EmailDeliveryStatus',
    'AutomationVideo',
  ];
}