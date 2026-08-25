import { Handle, Position, NodeProps } from 'reactflow';
import { 
  MessageSquare, Search, Zap, Clock, Square, 
  MailCheck, MailX, MailPlus, Send, Tag, Webhook, 
  GitBranch, GitMerge, Play 
} from 'lucide-react';
import { cn } from '@utils/format';

interface BaseNodeProps extends NodeProps {
  data: {
    label: string;
    isValid?: boolean;
    validationErrors?: string[];
  };
}

function getNodeIcon(type: string, subType?: string) {
  switch (type) {
    case 'trigger': return Play;
    case 'condition':
      switch (subType) {
        case 'comment_contains': return Search;
        case 'comment_not_contains': return Search;
        case 'email_exists': return MailCheck;
        case 'email_not_exists': return MailX;
        default: return GitBranch;
      }
    case 'action':
      switch (subType) {
        case 'reply_comment': return MessageSquare;
        case 'send_email': return Send;
        case 'collect_email': return MailPlus;
        case 'send_landing_page_link': return Tag;
        case 'add_tag': return Tag;
        case 'call_webhook': return Webhook;
        default: return Zap;
      }
    case 'delay': return Clock;
    case 'end': return Square;
    default: return Zap;
  }
}

function getNodeColor(type: string) {
  switch (type) {
    case 'trigger': return 'bg-green-500';
    case 'condition': return 'bg-blue-500';
    case 'action': return 'bg-purple-500';
    case 'delay': return 'bg-orange-500';
    case 'end': return 'bg-red-500';
    default: return 'bg-gray-500';
  }
}

function getNodeBgColor(type: string) {
  switch (type) {
    case 'trigger': return 'bg-green-50 dark:bg-green-900/20';
    case 'condition': return 'bg-blue-50 dark:bg-blue-900/20';
    case 'action': return 'bg-purple-50 dark:bg-purple-900/20';
    case 'delay': return 'bg-orange-50 dark:bg-orange-900/20';
    case 'end': return 'bg-red-50 dark:bg-red-900/20';
    default: return 'bg-gray-50 dark:bg-gray-900/20';
  }
}

function getBorderColor(type: string, isValid: boolean = true, hasErrors: boolean = false) {
  if (hasErrors) return 'border-red-500';
  if (!isValid) return 'border-yellow-500';
  switch (type) {
    case 'trigger': return 'border-green-500';
    case 'condition': return 'border-blue-500';
    case 'action': return 'border-purple-500';
    case 'delay': return 'border-orange-500';
    case 'end': return 'border-red-500';
    default: return 'border-gray-500';
  }
}

export function BaseNode({ data, selected, type, id }: BaseNodeProps) {
  const nodeData = data as any;
  const nodeType = type as string;
  const subType = nodeData?.conditionType || nodeData?.actionType || nodeData?.triggerType || nodeData?.type;
  const Icon = getNodeIcon(nodeType, subType);
  const nodeColor = getNodeColor(nodeType);
  const bgColor = getNodeBgColor(nodeType);
  const borderColor = getBorderColor(nodeType, true, data.validationErrors?.length > 0);
  const hasErrors = data.validationErrors?.length > 0;
  const isValid = !hasErrors;

  return (
    <div
      className={cn(
        'relative min-w-[200px] max-w-[280px] rounded-xl p-4 transition-all duration-200',
        'shadow-sm border-2',
        bgColor,
        borderColor,
        selected && 'ring-2 ring-primary-500 ring-offset-2 dark:ring-offset-gray-900',
        hasErrors && 'animate-pulse'
      )}
      style={{ width: '100%' }}
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-2">
        <div className={cn('p-1.5 rounded-lg', nodeColor)}>
          <Icon className="w-4 h-4 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-gray-900 dark:text-white truncate">
            {data.label}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 capitalize truncate">
            {type.replace('_', ' ')}
          </p>
        </div>
        {hasErrors && (
          <div className="flex items-center gap-1 text-red-500" title={data.validationErrors?.join(', ')}>
            <span className="text-xs">⚠</span>
            <span className="text-xs font-medium">{data.validationErrors.length}</span>
          </div>
        )}
      </div>

      {/* Input handle */}
      <Handle
        type="target"
        position={Position.Left}
        className="w-3 h-3 bg-primary-500 border-2 border-white dark:border-gray-900"
        id="input"
      />

      {/* Content */}
      <div className="space-y-2">
        {type === 'trigger' && (
          <TriggerNodeContent data={data} />
        )}
        {type === 'condition' && (
          <ConditionNodeContent data={data} />
        )}
        {type === 'action' && (
          <ActionNodeContent data={data} />
        )}
        {type === 'delay' && (
          <DelayNodeContent data={data} />
        )}
        {type === 'end' && (
          <EndNodeContent data={data} />
        )}
      </div>

      {/* Output handle */}
      <Handle
        type="source"
        position={Position.Right}
        className="w-3 h-3 bg-primary-500 border-2 border-white dark:border-gray-900"
        id="output"
      />
    </div>
  );
}

function TriggerNodeContent({ data }: { data: any }) {
  return (
    <div className="space-y-2 text-sm">
      <div className="flex items-center gap-2 p-2 bg-white/50 dark:bg-gray-800/50 rounded-lg">
        <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">Channel:</span>
        <span className="text-xs text-gray-900 dark:text-white truncate flex-1">
          {data.channelId ? `Channel ${data.channelId.slice(0, 8)}...` : 'Not selected'}
        </span>
      </div>
      {data.videoId && (
        <div className="flex items-center gap-2 p-2 bg-white/50 dark:bg-gray-800/50 rounded-lg">
          <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">Video:</span>
          <span className="text-xs text-gray-900 dark:text-white truncate flex-1">
            {data.videoId}
          </span>
        </div>
      )}
      <div className="flex items-center gap-2 p-2 bg-white/50 dark:bg-gray-800/50 rounded-lg">
        <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">Match:</span>
        <span className="text-xs text-gray-900 dark:text-white capitalize">
          {data.matchType || 'contains'}
        </span>
      </div>
      <div className="flex items-center gap-2 p-2 bg-white/50 dark:bg-gray-800/50 rounded-lg">
        <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">Keywords:</span>
        <span className="text-xs text-gray-900 dark:text-white truncate flex-1">
          {data.keywords?.length ? data.keywords.join(', ') : 'None'}
        </span>
      </div>
      <div className="flex items-center gap-2 p-2 bg-white/50 dark:bg-gray-800/50 rounded-lg">
        <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">Case:</span>
        <span className="text-xs text-gray-900 dark:text-white">
          {data.caseInsensitive ? 'Insensitive' : 'Sensitive'}
        </span>
      </div>
    </div>
  );
}

function ConditionNodeContent({ data }: { data: any }) {
  const conditionLabels: Record<string, string> = {
    comment_contains: 'Comment Contains',
    comment_not_contains: 'Comment Not Contains',
    email_exists: 'Email Exists',
    email_not_exists: 'Email Not Exists',
  };

  return (
    <div className="space-y-2 text-sm">
      <div className="flex items-center gap-2 p-2 bg-white/50 dark:bg-gray-800/50 rounded-lg">
        <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">Type:</span>
        <span className="text-xs text-gray-900 dark:text-white capitalize">
          {conditionLabels[data.conditionType] || data.conditionType}
        </span>
      </div>
      <div className="flex items-center gap-2 p-2 bg-white/50 dark:bg-gray-800/50 rounded-lg">
        <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">Value:</span>
        <span className="text-xs text-gray-900 dark:text-white truncate flex-1 font-mono">
          {data.value || 'Not set'}
        </span>
      </div>
      <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
        <span>True →</span>
        <span className="text-green-500">✓</span>
        <span>False →</span>
        <span className="text-red-500">✗</span>
      </div>
    </div>
  );
}

function ActionNodeContent({ data }: { data: any }) {
  const actionLabels: Record<string, string> = {
    reply_comment: 'Reply to Comment',
    send_email: 'Send Email',
    collect_email: 'Collect Email',
    send_landing_page_link: 'Send Landing Page Link',
    add_tag: 'Add Tag',
    call_webhook: 'Call Webhook',
  };

  return (
    <div className="space-y-2 text-sm">
      <div className="flex items-center gap-2 p-2 bg-white/50 dark:bg-gray-800/50 rounded-lg">
        <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">Action:</span>
        <span className="text-xs text-gray-900 dark:text-white capitalize">
          {actionLabels[data.actionType] || data.actionType}
        </span>
      </div>
      
      {data.actionType === 'reply_comment' && (
        <div className="p-2 bg-white/50 dark:bg-gray-800/50 rounded-lg">
          <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">Message:</span>
          <p className="text-xs text-gray-900 dark:text-white truncate mt-1 line-clamp-2">
            {data.config?.message || 'Not set'}
          </p>
        </div>
      )}
      
      {data.actionType === 'send_email' && (
        <div className="space-y-1">
          <div className="flex items-center gap-2 p-2 bg-white/50 dark:bg-gray-800/50 rounded-lg">
            <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">Subject:</span>
            <span className="text-xs text-gray-900 dark:text-white truncate flex-1">
              {data.config?.subject || 'Not set'}
            </span>
          </div>
        </div>
      )}
      
      {data.actionType === 'collect_email' && (
        <div className="flex items-center gap-2 p-2 bg-white/50 dark:bg-gray-800/50 rounded-lg">
          <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">Landing Page:</span>
          <span className="text-xs text-gray-900 dark:text-white truncate flex-1">
            {data.config?.landingPageId ? `LP ${data.config.landingPageId.slice(0, 8)}...` : 'Not selected'}
          </span>
        </div>
      )}
      
      {data.actionType === 'send_landing_page_link' && (
        <div className="flex items-center gap-2 p-2 bg-white/50 dark:bg-gray-800/50 rounded-lg">
          <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">Landing Page:</span>
          <span className="text-xs text-gray-900 dark:text-white truncate flex-1">
            {data.config?.landingPageId ? `LP ${data.config.landingPageId.slice(0, 8)}...` : 'Not selected'}
          </span>
        </div>
      )}
      
      {data.actionType === 'add_tag' && data.config?.tags?.length && (
        <div className="flex flex-wrap gap-1">
          {data.config.tags.map((tag: string) => (
            <span key={tag} className="px-1.5 py-0.5 bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 text-xs rounded">
              #{tag}
            </span>
          ))}
        </div>
      )}
      
      {data.actionType === 'call_webhook' && (
        <div className="flex items-center gap-2 p-2 bg-white/50 dark:bg-gray-800/50 rounded-lg">
          <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">URL:</span>
          <span className="text-xs text-gray-900 dark:text-white truncate flex-1 font-mono">
            {data.config?.url || 'Not set'}
          </span>
        </div>
      )}
    </div>
  );
}

function DelayNodeContent({ data }: { data: any }) {
  return (
    <div className="space-y-2 text-sm">
      <div className="flex items-center gap-2 p-2 bg-white/50 dark:bg-gray-800/50 rounded-lg">
        <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">Wait:</span>
        <span className="text-lg font-bold text-gray-900 dark:text-white">
          {data.value} {data.unit}
        </span>
      </div>
    </div>
  );
}

function EndNodeContent({ data }: { data: any }) {
  return (
    <div className="text-center py-4">
      <p className="text-xs text-gray-500 dark:text-gray-400">Automation ends here</p>
    </div>
  );
}

export default BaseNode;