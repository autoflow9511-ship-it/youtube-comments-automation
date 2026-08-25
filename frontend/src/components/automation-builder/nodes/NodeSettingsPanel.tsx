import { useForm, Controller } from 'react-hook-form';
import { useEffect } from 'react';
import { 
  X, ChevronDown, MessageSquare, Search, Zap, Clock, Square,
  MailCheck, MailX, MailPlus, Send, Tag, Webhook, GitBranch, Play
} from 'lucide-react';
import { cn } from '@utils/format';
import { NODE_DEFINITIONS } from '../../../types/automation';

interface NodeSettingsPanelProps {
  node: any;
  onUpdate: (data: any) => void;
  onClose: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  channels: any[];
  landingPages: any[];
}

export function NodeSettingsPanel({ 
  node, 
  onUpdate, 
  onClose, 
  onDelete, 
  onDuplicate,
  channels,
  landingPages 
}: NodeSettingsPanelProps) {
  const nodeType = node.type;
  const subType = node.data?.conditionType || node.data?.actionType || node.data?.triggerType || node.data?.type;
  const nodeDef = NODE_DEFINITIONS.find(d => d.type === nodeType && (d.subType === subType || !d.subType));
  
  const getNodeIcon = (type: string, subType?: string) => {
    switch (type) {
      case 'trigger': return Play;
      case 'condition':
        switch (subType) {
          case 'comment_contains': return Search;
          case 'comment_not_contains': return Search;
          case 'email_exists': return MailCheck;
          case 'email_not_exists': return MailX;
          default: return Search;
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
  };

  const getNodeColor = (type: string) => {
    switch (type) {
      case 'trigger': return 'text-green-500';
      case 'condition': return 'text-blue-500';
      case 'action': return 'text-purple-500';
      case 'delay': return 'text-orange-500';
      case 'end': return 'text-red-500';
      default: return 'text-gray-500';
    }
  };

  const getNodeBg = (type: string) => {
    switch (type) {
      case 'trigger': return 'bg-green-500/10';
      case 'condition': return 'bg-blue-500/10';
      case 'action': return 'bg-purple-500/10';
      case 'delay': return 'bg-orange-500/10';
      case 'end': return 'bg-red-500/10';
      default: return 'bg-gray-500/10';
    }
  };

  const Icon = getNodeIcon(nodeType, subType);

  // Render appropriate form based on node type
  const renderFormContent = () => {
    const data = node.data;
    
    switch (nodeType) {
      case 'trigger':
        return <TriggerSettings data={data} onUpdate={onUpdate} channels={channels} />;
      case 'condition':
        return <ConditionSettings data={data} onUpdate={onUpdate} />;
      case 'action':
        return <ActionSettings data={data} onUpdate={onUpdate} landingPages={landingPages} />;
      case 'delay':
        return <DelaySettings data={data} onUpdate={onUpdate} />;
      case 'end':
        return <EndSettings data={data} onUpdate={onUpdate} />;
      default:
        return <div className="text-center py-8 text-gray-500">No settings available</div>;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className={cn('p-2 rounded-lg', getNodeBg(node.type))}>
              <Icon className={cn('w-5 h-5', getNodeColor(nodeType))} />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white">{node.data.label}</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">{node.type.replace('_', ' ')}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {renderFormContent()}
        </div>

        {/* Actions */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <div className="flex gap-2">
            <button onClick={onDuplicate} className="btn-secondary text-sm flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
              Duplicate
            </button>
            <button onClick={onDelete} className="btn-danger text-sm flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
              Delete
            </button>
          </div>
          <button onClick={onClose} className="btn-primary">Done</button>
        </div>
      </div>
    </div>
  );
}

function TriggerSettings({ data, onUpdate, channels }: any) {
  return (
    <div className="space-y-4">
      <div>
        <label className="label">Channel</label>
        <select
          value={data.channelId}
          onChange={(e) => onUpdate({ ...data, channelId: e.target.value })}
          className="input"
        >
          <option value="">Select a channel</option>
          {channels?.map((c: any) => (
            <option key={c.id} value={c.id}>{c.title}</option>
          ))}
        </select>
      </div>
      
      <div>
        <label className="label">Video (Optional)</label>
        <input
          type="text"
          value={data.videoId || ''}
          onChange={(e) => onUpdate({ ...data, videoId: e.target.value })}
          className="input"
          placeholder="Leave empty for all videos"
        />
        <p className="text-xs text-gray-500 mt-1">Leave empty to trigger on all videos</p>
      </div>
      
      <div>
        <label className="label">Match Type</label>
        <select
          value={data.matchType || 'contains'}
          onChange={(e) => onUpdate({ ...data, matchType: e.target.value })}
          className="input"
        >
          <option value="contains">Contains</option>
          <option value="exact">Exact Match</option>
          <option value="starts_with">Starts With</option>
          <option value="ends_with">Ends With</option>
          <option value="regex">Regex</option>
        </select>
      </div>
      
      <div>
        <label className="label">Keywords</label>
        <input
          type="text"
          value={data.keywords?.join(', ') || ''}
          onChange={(e) => onUpdate({ ...data, keywords: e.target.value.split(',').map((k: string) => k.trim()).filter(Boolean) })}
          className="input"
          placeholder="thank you, thanks, awesome, great video"
        />
        <p className="text-xs text-gray-500 mt-1">Comma separated keywords</p>
      </div>
      
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="caseInsensitive"
          checked={data.caseInsensitive !== false}
          onChange={(e) => onUpdate({ ...data, caseInsensitive: e.target.checked })}
          className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
        />
        <label htmlFor="caseInsensitive" className="text-sm text-gray-700 dark:text-gray-300">
          Case insensitive matching
        </label>
      </div>
    </div>
  );
}

function ConditionSettings({ data, onUpdate }: any) {
  const conditionTypes = [
    { value: 'comment_contains', label: 'Comment Contains', icon: Search },
    { value: 'comment_not_contains', label: 'Comment Not Contains', icon: Search },
    { value: 'email_exists', label: 'Email Exists', icon: MailCheck },
    { value: 'email_not_exists', label: 'Email Not Exists', icon: MailX },
  ];

  return (
    <div className="space-y-4">
      <div>
        <label className="label">Condition Type</label>
        <div className="grid grid-cols-2 gap-2">
          {conditionTypes.map((type) => (
            <label
              key={type.value}
              className={cn(
                'relative cursor-pointer p-3 border-2 rounded-lg transition-colors flex items-center gap-2',
                data.conditionType === type.value
                  ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                  : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
              )}
            >
              <input
                type="radio"
                value={type.value}
                checked={data.conditionType === type.value}
                onChange={() => onUpdate({ ...data, conditionType: type.value })}
                className="sr-only"
              />
              <type.icon className="w-4 h-4 text-gray-600 dark:text-gray-400" />
              <span className="text-sm font-medium text-gray-900 dark:text-white">{type.label}</span>
            </label>
          ))}
        </div>
      </div>
      
      <div>
        <label className="label">Value</label>
        <input
          type="text"
          value={data.value || ''}
          onChange={(e) => onUpdate({ ...data, value: e.target.value })}
          className="input"
          placeholder="Enter keyword or value"
        />
        <p className="text-xs text-gray-500 mt-1">
          {data.conditionType === 'comment_contains' && 'Keyword to match in comment'}
          {data.conditionType === 'comment_not_contains' && 'Keyword that should NOT be in comment'}
          {data.conditionType === 'email_exists' && 'Email field name to check'}
          {data.conditionType === 'email_not_exists' && 'Email field name to check'}
        </p>
      </div>
    </div>
  );
}

function ActionSettings({ data, onUpdate, landingPages }: any) {
  const actionTypes = [
    { value: 'reply_comment', label: 'Reply to Comment', icon: MessageSquare },
    { value: 'send_email', label: 'Send Email', icon: Send },
    { value: 'collect_email', label: 'Collect Email', icon: MailPlus },
    { value: 'send_landing_page_link', label: 'Send Landing Page Link', icon: Tag },
    { value: 'add_tag', label: 'Add Tag', icon: Tag },
    { value: 'call_webhook', label: 'Call Webhook', icon: Webhook },
  ];

  return (
    <div className="space-y-4">
      <div>
        <label className="label">Action Type</label>
        <div className="grid grid-cols-2 gap-2">
          {actionTypes.map((type) => (
            <label
              key={type.value}
              className={cn(
                'relative cursor-pointer p-3 border-2 rounded-lg transition-colors flex items-center gap-2',
                data.actionType === type.value
                  ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                  : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
              )}
            >
              <input
                type="radio"
                value={type.value}
                checked={data.actionType === type.value}
                onChange={() => onUpdate({ ...data, actionType: type.value, config: {} })}
                className="sr-only"
              />
              <type.icon className="w-4 h-4 text-gray-600 dark:text-gray-400" />
              <span className="text-sm font-medium text-gray-900 dark:text-white">{type.label}</span>
            </label>
          ))}
        </div>
      </div>

      {data.actionType === 'reply_comment' && (
        <div>
          <label className="label">Reply Message</label>
          <textarea
            value={data.config?.message || ''}
            onChange={(e) => onUpdate({ ...data, config: { ...data.config, message: e.target.value } })}
            className="input"
            rows={4}
            placeholder="Thanks for your comment! {{commenterName}}..."
          />
          <p className="text-xs text-gray-500 mt-1">
            Available variables: {'{{'+'commenterName}}'}, {'{{'+'videoTitle}}'}, {'{{'+'commentText}}'}, {'{{'+'channelName}}'}
          </p>
        </div>
      )}

      {data.actionType === 'send_email' && (
        <div className="space-y-4">
          <div>
            <label className="label">Subject</label>
            <input
              type="text"
              value={data.config?.subject || ''}
              onChange={(e) => onUpdate({ ...data, config: { ...data.config, subject: e.target.value } })}
              className="input"
              placeholder="Welcome to our community!"
            />
          </div>
          <div>
            <label className="label">HTML Content</label>
            <textarea
              value={data.config?.htmlContent || ''}
              onChange={(e) => onUpdate({ ...data, config: { ...data.config, htmlContent: e.target.value } })}
              className="input font-mono text-sm"
              rows={6}
              placeholder="<p>Hi {{firstName}},</p><p>Thanks for subscribing!</p>"
            />
          </div>
          <div>
            <label className="label">Text Content (Optional)</label>
            <textarea
              value={data.config?.textContent || ''}
              onChange={(e) => onUpdate({ ...data, config: { ...data.config, textContent: e.target.value } })}
              className="input"
              rows={3}
              placeholder="Hi {{firstName}},\n\nThanks for subscribing!"
            />
          </div>
          <div>
            <label className="label">From Email (Optional)</label>
            <input
              type="email"
              value={data.config?.fromEmail || ''}
              onChange={(e) => onUpdate({ ...data, config: { ...data.config, fromEmail: e.target.value } })}
              className="input"
              placeholder="noreply@example.com"
            />
          </div>
          <p className="text-xs text-gray-500">
            Available variables: {'{{'+'firstName}}'}, {'{{'+'lastName}}'}, {'{{'+'email}}'}, {'{{'+'customFieldName}}'}
          </p>
        </div>
      )}

      {data.actionType === 'collect_email' && (
        <div className="space-y-4">
          <div>
            <label className="label">Landing Page</label>
            <select
              value={data.config?.landingPageId || ''}
              onChange={(e) => onUpdate({ ...data, config: { ...data.config, landingPageId: e.target.value } })}
              className="input"
            >
              <option value="">Select a landing page</option>
              {landingPages?.map((lp: any) => (
                <option key={lp.id} value={lp.id}>{lp.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Heading</label>
            <input
              type="text"
              value={data.config?.heading || ''}
              onChange={(e) => onUpdate({ ...data, config: { ...data.config, heading: e.target.value } })}
              className="input"
              placeholder="Get the PDF"
            />
          </div>
          <div>
            <label className="label">Description</label>
            <textarea
              value={data.config?.description || ''}
              onChange={(e) => onUpdate({ ...data, config: { ...data.config, description: e.target.value } })}
              className="input"
              rows={2}
              placeholder="Enter your email to receive the PDF"
            />
          </div>
          <div>
            <label className="label">Submit Button Text</label>
            <input
              type="text"
              value={data.config?.submitButtonText || 'Submit'}
              onChange={(e) => onUpdate({ ...data, config: { ...data.config, submitButtonText: e.target.value } })}
              className="input"
              placeholder="Send me the PDF"
            />
          </div>
          <div>
            <label className="label">Success Message</label>
            <input
              type="text"
              value={data.config?.successMessage || 'Thanks for subscribing!'}
              onChange={(e) => onUpdate({ ...data, config: { ...data.config, successMessage: e.target.value } })}
              className="input"
              placeholder="Check your email for the PDF!"
            />
          </div>
        </div>
      )}

      {data.actionType === 'send_landing_page_link' && (
        <div className="space-y-4">
          <div>
            <label className="label">Landing Page</label>
            <select
              value={data.config?.landingPageId || ''}
              onChange={(e) => onUpdate({ ...data, config: { ...data.config, landingPageId: e.target.value } })}
              className="input"
            >
              <option value="">Select a landing page</option>
              {landingPages?.map((lp: any) => (
                <option key={lp.id} value={lp.id}>{lp.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Message with Link</label>
            <textarea
              value={data.config?.message || ''}
              onChange={(e) => onUpdate({ ...data, config: { ...data.config, message: e.target.value } })}
              className="input"
              rows={3}
              placeholder="Thanks! Get your free guide here: {{landingPageUrl}}"
            />
            <p className="text-xs text-gray-500 mt-1">Use {'{{landingPageUrl}}'} placeholder for the link</p>
          </div>
        </div>
      )}

      {data.actionType === 'add_tag' && (
        <div>
          <label className="label">Tags</label>
          <div className="flex flex-wrap gap-2">
            {/* Tag input would go here */}
            <input
              type="text"
              placeholder="Add tag (comma separated)"
              className="input flex-1"
              onBlur={(e) => onUpdate({ 
                ...data, 
                config: { 
                  ...data.config, 
                  tags: e.target.value.split(',').map((t: string) => t.trim()).filter(Boolean) 
                } 
              })}
            />
          </div>
          <p className="text-xs text-gray-500 mt-1">Enter tags separated by commas</p>
        </div>
      )}

      {data.actionType === 'call_webhook' && (
        <div className="space-y-4">
          <div>
            <label className="label">Webhook URL</label>
            <input
              type="url"
              value={data.config?.url || ''}
              onChange={(e) => onUpdate({ ...data, config: { ...data.config, url: e.target.value } })}
              className="input"
              placeholder="https://your-webhook-url.com/endpoint"
            />
          </div>
          <div>
            <label className="label">HTTP Method</label>
            <select
              value={data.config?.method || 'POST'}
              onChange={(e) => onUpdate({ ...data, config: { ...data.config, method: e.target.value } })}
              className="input"
            >
              <option value="POST">POST</option>
              <option value="PUT">PUT</option>
              <option value="PATCH">PATCH</option>
            </select>
          </div>
          <div>
            <label className="label">Headers (JSON)</label>
            <textarea
              value={JSON.stringify(data.config?.headers || {}, null, 2)}
              onChange={(e) => {
                try {
                  const headers = JSON.parse(e.target.value);
                  onUpdate({ ...data, config: { ...data.config, headers } });
                } catch {}
              }}
              className="input font-mono text-sm"
              rows={4}
              placeholder='{"Authorization": "Bearer token"}'
            />
          </div>
        </div>
      )}
    </div>
  );
}

function DelaySettings({ data, onUpdate }: any) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label">Value</label>
          <input
            type="number"
            min={1}
            value={data.value || 1}
            onChange={(e) => onUpdate({ ...data, value: parseInt(e.target.value) || 1 })}
            className="input"
          />
        </div>
        <div>
          <label className="label">Unit</label>
          <select
            value={data.unit || 'hours'}
            onChange={(e) => onUpdate({ ...data, unit: e.target.value })}
            className="input"
          >
            <option value="minutes">Minutes</option>
            <option value="hours">Hours</option>
            <option value="days">Days</option>
          </select>
        </div>
      </div>
      <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Total delay: <span className="font-medium">{data.value || 1} {data.unit || 'hours'}</span>
        </p>
      </div>
    </div>
  );
}

function EndSettings({ data, onUpdate }: any) {
  return (
    <div className="space-y-4 text-center">
      <div className="p-6 bg-gray-50 dark:bg-gray-800 rounded-lg">
        <Square className="w-12 h-12 text-red-500 mx-auto mb-3" />
        <h4 className="font-medium text-gray-900 dark:text-white">End of Automation</h4>
        <p className="text-sm text-gray-500 mt-2">This node marks the end of the automation flow. No further actions will be executed after this point.</p>
      </div>
    </div>
  );
}

export default NodeSettingsPanel;