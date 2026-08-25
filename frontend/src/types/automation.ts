import type { Channel } from './index';

// ============================================
// Visual Flow Types (React Flow compatible)
// ============================================

export type NodeType = 
  | 'trigger'
  | 'condition'
  | 'action'
  | 'delay'
  | 'end';

export type TriggerType = 
  | 'youtube_comment';

export type ConditionType = 
  | 'comment_contains'
  | 'comment_not_contains'
  | 'email_exists'
  | 'email_not_exists';

export type ActionType = 
  | 'reply_comment'
  | 'send_email'
  | 'collect_email'
  | 'send_landing_page_link'
  | 'add_tag'
  | 'call_webhook';

export type DelayUnit = 'minutes' | 'hours' | 'days';

export type MatchType = 'contains' | 'exact' | 'starts_with' | 'ends_with' | 'regex';

// Node data interfaces
export interface TriggerNodeData {
  type: 'trigger';
  triggerType: TriggerType;
  channelId: string;
  videoId?: string; // optional, empty means all videos
  matchType: MatchType;
  keywords: string[];
  caseInsensitive: boolean;
  label: string;
}

export interface ConditionNodeData {
  type: 'condition';
  conditionType: ConditionType;
  value: string; // keyword, email field name, etc.
  label: string;
}

export interface ActionNodeData {
  type: 'action';
  actionType: ActionType;
  config: Record<string, any>;
  label: string;
}

export interface DelayNodeData {
  type: 'delay';
  value: number;
  unit: DelayUnit;
  label: string;
}

export interface EndNodeData {
  type: 'end';
  label: string;
}

export type NodeData = 
  | TriggerNodeData
  | ConditionNodeData
  | ActionNodeData
  | DelayNodeData
  | EndNodeData;

// Visual Flow Node (extends React Flow Node)
export interface FlowNode {
  id: string;
  type: NodeType;
  position: { x: number; y: number };
  data: NodeData;
  width?: number;
  height?: number;
  selected?: boolean;
  dragging?: boolean;
}

// Visual Flow Edge
export interface FlowEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
  type?: 'default' | 'straight' | 'step' | 'smoothstep' | 'bezier';
  animated?: boolean;
  style?: React.CSSProperties;
  label?: string;
  labelStyle?: React.CSSProperties;
  labelShowBg?: boolean;
  labelBgStyle?: React.CSSProperties;
  labelBgPadding?: number[];
  markerEnd?: {
    type: 'arrow' | 'arrowclosed';
    color?: string;
    width?: number;
    height?: number;
  };
}

// Visual Flow (complete workflow)
export interface VisualFlow {
  nodes: FlowNode[];
  edges: FlowEdge[];
  viewport?: { x: number; y: number; zoom: number };
}

// ============================================
// Backend API Types (matching existing backend)
// ============================================

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
  visualFlow?: VisualFlow; // New field for visual flow
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

// ============================================
// Conversion Types (Visual Flow <-> Backend)
// ============================================

export interface CreateAutomationRequest {
  channelId: string;
  name: string;
  description?: string;
  triggerType: string;
  triggerConfig: Record<string, any>;
  actions: Array<{
    type: string;
    config: Record<string, any>;
    order: number;
    conditions?: Record<string, any>;
  }>;
  settings?: Record<string, any>;
  visualFlow?: VisualFlow;
}

export interface UpdateAutomationRequest extends Partial<CreateAutomationRequest> {
  status?: 'ACTIVE' | 'PAUSED' | 'DRAFT' | 'ARCHIVED';
}

// ============================================
// Node Registry (for sidebar palette)
// ============================================

export interface NodeCategory {
  id: string;
  label: string;
  icon: string;
  color: string;
  nodes: NodeDefinition[];
}

export interface NodeDefinition {
  type: NodeType;
  subType?: string; // specific type like 'reply_comment', 'send_email', etc.
  label: string;
  description: string;
  icon: string;
  defaultData: Partial<NodeData>;
  inputs: number; // number of input handles
  outputs: number; // number of output handles
  allowedNextTypes?: NodeType[]; // which node types can follow
  allowedPrevTypes?: NodeType[]; // which node types can precede
}

// Predefined node definitions for the sidebar palette
export const NODE_DEFINITIONS: NodeDefinition[] = [
  // Triggers
  {
    type: 'trigger',
    subType: 'youtube_comment',
    label: 'YouTube Comment',
    description: 'Trigger when a comment matches criteria',
    icon: 'message-square',
    defaultData: {
      type: 'trigger',
      triggerType: 'youtube_comment',
      channelId: '',
      videoId: '',
      matchType: 'contains',
      keywords: [],
      caseInsensitive: true,
      label: 'YouTube Comment',
    },
    inputs: 0,
    outputs: 1,
    allowedNextTypes: ['condition', 'action', 'delay', 'end'],
  },
  // Conditions
  {
    type: 'condition',
    subType: 'comment_contains',
    label: 'Comment Contains',
    description: 'Check if comment contains keyword',
    icon: 'search',
    defaultData: {
      type: 'condition',
      conditionType: 'comment_contains',
      value: '',
      label: 'Comment Contains',
    },
    inputs: 1,
    outputs: 2, // true/false branches
    allowedPrevTypes: ['trigger', 'action', 'delay'],
    allowedNextTypes: ['condition', 'action', 'delay', 'end'],
  },
  {
    type: 'condition',
    subType: 'comment_not_contains',
    label: 'Comment Not Contains',
    description: 'Check if comment does not contain keyword',
    icon: 'search-x',
    defaultData: {
      type: 'condition',
      conditionType: 'comment_not_contains',
      value: '',
      label: 'Comment Not Contains',
    },
    inputs: 1,
    outputs: 2,
    allowedPrevTypes: ['trigger', 'action', 'delay'],
    allowedNextTypes: ['condition', 'action', 'delay', 'end'],
  },
  {
    type: 'condition',
    subType: 'email_exists',
    label: 'Email Exists',
    description: 'Check if email was collected',
    icon: 'mail-check',
    defaultData: {
      type: 'condition',
      conditionType: 'email_exists',
      value: '',
      label: 'Email Exists',
    },
    inputs: 1,
    outputs: 2,
    allowedPrevTypes: ['action'],
    allowedNextTypes: ['condition', 'action', 'delay', 'end'],
  },
  {
    type: 'condition',
    subType: 'email_not_exists',
    label: 'Email Not Exists',
    description: 'Check if email was not collected',
    icon: 'mail-x',
    defaultData: {
      type: 'condition',
      conditionType: 'email_not_exists',
      value: '',
      label: 'Email Not Exists',
    },
    inputs: 1,
    outputs: 2,
    allowedPrevTypes: ['action'],
    allowedNextTypes: ['condition', 'action', 'delay', 'end'],
  },
  // Actions
  {
    type: 'action',
    subType: 'reply_comment',
    label: 'Reply to Comment',
    description: 'Post a reply to the triggering comment',
    icon: 'reply',
    defaultData: {
      type: 'action',
      actionType: 'reply_comment',
      config: { message: '', useVariables: true },
      label: 'Reply to Comment',
    },
    inputs: 1,
    outputs: 1,
    allowedPrevTypes: ['trigger', 'condition', 'delay'],
    allowedNextTypes: ['action', 'delay', 'end'],
  },
  {
    type: 'action',
    subType: 'send_email',
    label: 'Send Email',
    description: 'Send an automated email',
    icon: 'send',
    defaultData: {
      type: 'action',
      actionType: 'send_email',
      config: { 
        subject: '', 
        htmlContent: '', 
        textContent: '',
        fromEmail: '',
        useVariables: true 
      },
      label: 'Send Email',
    },
    inputs: 1,
    outputs: 1,
    allowedPrevTypes: ['trigger', 'condition', 'action', 'delay'],
    allowedNextTypes: ['action', 'delay', 'end'],
  },
  {
    type: 'action',
    subType: 'collect_email',
    label: 'Collect Email',
    description: 'Show landing page to capture email',
    icon: 'mail-plus',
    defaultData: {
      type: 'action',
      actionType: 'collect_email',
      config: { 
        landingPageId: '',
        heading: 'Get the PDF',
        description: 'Enter your email to receive the PDF',
        submitButtonText: 'Send me the PDF',
        successMessage: 'Check your email for the PDF!',
      },
      label: 'Collect Email',
    },
    inputs: 1,
    outputs: 1,
    allowedPrevTypes: ['trigger', 'condition', 'delay'],
    allowedNextTypes: ['action', 'delay', 'end'],
  },
  {
    type: 'action',
    subType: 'send_landing_page_link',
    label: 'Send Landing Page Link',
    description: 'Reply with a link to a landing page',
    icon: 'link',
    defaultData: {
      type: 'action',
      actionType: 'send_landing_page_link',
      config: { 
        landingPageId: '',
        message: 'Get your free guide here: {{landingPageUrl}}',
      },
      label: 'Send Landing Page Link',
    },
    inputs: 1,
    outputs: 1,
    allowedPrevTypes: ['trigger', 'condition', 'delay'],
    allowedNextTypes: ['action', 'delay', 'end'],
  },
  {
    type: 'action',
    subType: 'add_tag',
    label: 'Add Tag',
    description: 'Tag the user for segmentation',
    icon: 'tag',
    defaultData: {
      type: 'action',
      actionType: 'add_tag',
      config: { tags: [] },
      label: 'Add Tag',
    },
    inputs: 1,
    outputs: 1,
    allowedPrevTypes: ['action'],
    allowedNextTypes: ['action', 'delay', 'end'],
  },
  {
    type: 'action',
    subType: 'call_webhook',
    label: 'Call Webhook',
    description: 'Send data to an external webhook URL',
    icon: 'webhook',
    defaultData: {
      type: 'action',
      actionType: 'call_webhook',
      config: { url: '', method: 'POST', headers: {} },
      label: 'Call Webhook',
    },
    inputs: 1,
    outputs: 1,
    allowedPrevTypes: ['trigger', 'condition', 'action', 'delay'],
    allowedNextTypes: ['action', 'delay', 'end'],
  },
  // Delay
  {
    type: 'delay',
    subType: 'delay',
    label: 'Delay',
    description: 'Wait before continuing',
    icon: 'clock',
    defaultData: {
      type: 'delay',
      value: 1,
      unit: 'hours',
      label: 'Delay',
    },
    inputs: 1,
    outputs: 1,
    allowedPrevTypes: ['trigger', 'condition', 'action'],
    allowedNextTypes: ['condition', 'action', 'delay', 'end'],
  },
  // End
  {
    type: 'end',
    subType: 'end',
    label: 'End',
    description: 'Stop the automation',
    icon: 'square',
    defaultData: {
      type: 'end',
      label: 'End',
    },
    inputs: 1,
    outputs: 0,
    allowedPrevTypes: ['trigger', 'condition', 'action', 'delay'],
    allowedNextTypes: [],
  },
];

// Category definitions for sidebar
export const NODE_CATEGORIES: Array<{
  id: string;
  label: string;
  icon: string;
  color: string;
  nodes: NodeDefinition[];
}> = [
  {
    id: 'triggers',
    label: 'Triggers',
    icon: 'play',
    color: 'bg-green-500',
    nodes: NODE_DEFINITIONS.filter(n => n.type === 'trigger'),
  },
  {
    id: 'conditions',
    label: 'Conditions',
    icon: 'git-branch',
    color: 'bg-blue-500',
    nodes: NODE_DEFINITIONS.filter(n => n.type === 'condition'),
  },
  {
    id: 'actions',
    label: 'Actions',
    icon: 'zap',
    color: 'bg-purple-500',
    nodes: NODE_DEFINITIONS.filter(n => n.type === 'action'),
  },
  {
    id: 'control',
    label: 'Control Flow',
    icon: 'git-merge',
    color: 'bg-orange-500',
    nodes: NODE_DEFINITIONS.filter(n => n.type === 'delay' || n.type === 'end'),
  },
];