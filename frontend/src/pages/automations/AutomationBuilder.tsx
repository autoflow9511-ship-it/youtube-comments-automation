import { useParams, useNavigate } from 'react-router-dom';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { automationsApi, channelsApi } from '@services/api';
import { Automation, TriggerType, ActionType } from '@types';
import toast from 'react-hot-toast';
import { LoadingScreen } from '@components/ui/LoadingScreen';
import { ArrowPathIcon, XMarkIcon } from '@heroicons/react/24/outline';

const triggerTypes: { value: TriggerType; label: string; description: string }[] = [
  { value: 'COMMENT_KEYWORD', label: 'Comment Keyword', description: 'Trigger when a comment contains specific keywords' },
  { value: 'COMMENT_REGEX', label: 'Comment Regex', description: 'Trigger when a comment matches a regex pattern' },
  { value: 'NEW_VIDEO', label: 'New Video Upload', description: 'Trigger when a new video is published' },
  { value: 'CHANNEL_MILESTONE', label: 'Channel Milestone', description: 'Trigger when channel reaches subscriber milestones' },
];

const actionTypes: { value: ActionType; label: string; description: string }[] = [
  { value: 'REPLY_COMMENT', label: 'Reply to Comment', description: 'Post an automated reply to the triggering comment' },
  { value: 'REPLY_WITH_FORM_LINK', label: 'Reply with Form Link', description: 'Reply with a link to a public email form' },
  { value: 'SEND_LANDING_PAGE_LINK', label: 'Send Landing Page Link', description: 'Reply with a link to a landing page' },
  { value: 'COLLECT_EMAIL', label: 'Collect Email', description: 'Show a form to capture the commenter\'s email' },
  { value: 'SEND_EMAIL', label: 'Send Email', description: 'Send an automated email after email capture' },
  { value: 'ADD_TAG', label: 'Add Tag', description: 'Tag the user for segmentation' },
  { value: 'CALL_WEBHOOK', label: 'Call Webhook', description: 'Send data to an external webhook URL' },
  { value: 'DELAY', label: 'Delay', description: 'Wait before continuing to next action' },
  { value: 'END', label: 'End', description: 'Stop the automation' },
];

const automationSchema = z.object({
  channelId: z.string().min(1, 'Channel is required'),
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  triggerType: z.enum(['COMMENT_KEYWORD', 'COMMENT_REGEX', 'NEW_VIDEO', 'CHANNEL_MILESTONE']),
  triggerConfig: z.record(z.any()),
  videoIds: z.array(z.string()).optional(),
  actions: z.array(z.object({
    type: z.enum(['REPLY_COMMENT', 'REPLY_WITH_FORM_LINK', 'SEND_LANDING_PAGE_LINK', 'COLLECT_EMAIL', 'SEND_EMAIL', 'ADD_TAG', 'CALL_WEBHOOK', 'DELAY', 'END']),
    config: z.record(z.any()),
    order: z.number(),
    conditions: z.record(z.any()).optional(),
  })).min(1, 'At least one action is required'),
});

type AutomationForm = z.infer<typeof automationSchema>;

export function AutomationBuilder() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEditing = !!id;
  const queryClient = useQueryClient();

  const { data: channels } = useQuery({
    queryKey: ['channels'],
    queryFn: () => channelsApi.getAll(),
  });

  const { data: automation, isLoading: loadingAutomation } = useQuery({
    queryKey: ['automation', id],
    queryFn: () => automationsApi.getById(id!),
    enabled: isEditing,
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => automationsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['automations'] });
      toast.success('Automation created successfully!');
      navigate('/automations');
    },
    onError: (error: any) => toast.error(error.response?.data?.message || 'Failed to create automation'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => automationsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['automations'] });
      toast.success('Automation updated successfully!');
      navigate('/automations');
    },
    onError: (error: any) => toast.error(error.response?.data?.message || 'Failed to update automation'),
  });

  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<AutomationForm>({
    resolver: zodResolver(automationSchema),
    defaultValues: {
      name: '',
      description: '',
      triggerType: 'COMMENT_KEYWORD',
      triggerConfig: { keywords: [] },
      videoIds: [],
      actions: [{ type: 'REPLY_COMMENT', config: { message: '' }, order: 0, conditions: {} }],
    },
  });

  const { fields: actionFields, append: appendAction, remove: removeAction } = useFieldArray({
    control,
    name: 'actions',
  });

  const triggerType = watch('triggerType');

  if (isEditing && loadingAutomation) return <LoadingScreen />;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {isEditing ? 'Edit Automation' : 'Create Automation'}
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Build automated rules for YouTube comment responses and lead capture
          </p>
        </div>
        <button onClick={() => navigate('/automations')} className="btn-secondary">
          <ArrowPathIcon className="w-5 h-5 mr-2" />
          Back
        </button>
      </div>

      <form onSubmit={handleSubmit(isEditing ? (data) => updateMutation.mutate({ id: id!, data }) : createMutation.mutate)} className="space-y-8">
        <div className="card p-6 space-y-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Basic Information</h2>
          
          <div className="space-y-4">
            <div>
              <label className="label">Channel</label>
              <select {...register('channelId')} className="input">
                <option value="">Select a channel</option>
                {channels?.data.map((c) => (
                  <option key={c.id} value={c.id}>{c.title}</option>
                ))}
              </select>
              {errors.channelId && <p className="text-sm text-red-600 mt-1">{errors.channelId.message}</p>}
            </div>

            <div>
              <label className="label">Automation Name</label>
              <input {...register('name')} className="input" placeholder="e.g. Welcome new subscribers" />
              {errors.name && <p className="text-sm text-red-600 mt-1">{errors.name.message}</p>}
            </div>

            <div>
              <label className="label">Description</label>
              <textarea {...register('description')} className="input" rows={3} placeholder="What does this automation do?" />
            </div>

            <div>
              <label className="label">Apply to Videos</label>
              <div className="space-y-2">
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={watch('videoIds')?.length === 0} onChange={(e) => setValue('videoIds', e.target.checked ? [] : [])} className="rounded border-gray-300 text-primary-600 focus:ring-primary-500" />
                  <span className="text-sm text-gray-700 dark:text-gray-300">All current and future videos</span>
                </label>
              </div>
              <div className="mt-2">
                <p className="text-sm text-gray-500 dark:text-gray-400">Or select specific videos:</p>
                <VideoSelector register={register} watch={watch} setValue={setValue} />
              </div>
            </div>
          </div>
        </div>

        <div className="card p-6 space-y-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Trigger</h2>
          
          <div>
            <label className="label">Trigger Type</label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {triggerTypes.map((trigger) => (
                <label
                  key={trigger.value}
                  className={`relative cursor-pointer p-4 border-2 rounded-lg transition-colors ${
                    triggerType === trigger.value
                      ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                      : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                  }`}
                >
                  <input
                    type="radio"
                    value={trigger.value}
                    {...register('triggerType')}
                    className="sr-only"
                  />
                  <div className="font-medium text-gray-900 dark:text-white">{trigger.label}</div>
                  <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">{trigger.description}</div>
                </label>
              ))}
            </div>
            {errors.triggerType && <p className="text-sm text-red-600 mt-1">{errors.triggerType.message}</p>}
          </div>

          <div>
            <label className="label">Trigger Configuration</label>
            {triggerType === 'COMMENT_KEYWORD' && (
              <div className="space-y-2">
                <p className="text-sm text-gray-500 dark:text-gray-400">Enter keywords that will trigger this automation (comma separated)</p>
                <input
                  type="text"
                  value={watch('triggerConfig.keywords')?.join(', ') || ''}
                  onChange={(e) => setValue('triggerConfig.keywords', e.target.value.split(',').map(k => k.trim()).filter(Boolean))}
                  className="input"
                  placeholder="thank you, thanks, awesome, great video"
                />
                <label className="flex items-center gap-2 mt-2">
                  <input type="checkbox" checked={watch('triggerConfig.caseInsensitive') !== false} onChange={(e) => setValue('triggerConfig.caseInsensitive', e.target.checked)} className="rounded border-gray-300 text-primary-600 focus:ring-primary-500" />
                  <span className="text-sm text-gray-700 dark:text-gray-300">Case insensitive matching</span>
                </label>
              </div>
            )}
            {triggerType === 'COMMENT_REGEX' && (
              <div className="space-y-2">
                <p className="text-sm text-gray-500 dark:text-gray-400">Enter a regex pattern to match comments</p>
                <input
                  type="text"
                  {...register('triggerConfig.pattern')}
                  className="input font-mono"
                  placeholder="\\b(thank you|thanks|awesome)\\b"
                />
              </div>
            )}
            {triggerType === 'CHANNEL_MILESTONE' && (
              <div className="space-y-2">
                <p className="text-sm text-gray-500 dark:text-gray-400">Subscriber count milestones (comma separated)</p>
                <input
                  type="text"
                  value={watch('triggerConfig.milestones')?.join(', ') || ''}
                  onChange={(e) => setValue('triggerConfig.milestones', e.target.value.split(',').map(k => k.trim()).filter(Boolean))}
                  className="input"
                  placeholder="1000, 10000, 100000"
                />
              </div>
            )}
          </div>
        </div>

        <div className="card p-6 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Actions</h2>
            <button
              type="button"
              onClick={() => appendAction({ type: 'REPLY_COMMENT', config: { message: '' }, order: actionFields.length, conditions: {} })}
              className="btn-secondary text-sm flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
              Add Action
            </button>
          </div>

          {actionFields.map((action, index) => (
            <div key={action.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-medium">Action #{index + 1}</h3>
                <button
                  type="button"
                  onClick={() => removeAction(index)}
                  className="text-gray-400 hover:text-red-500"
                >
                  <XMarkIcon className="w-5 h-5" />
                </button>
              </div>

              <div>
                <label className="label">Action Type</label>
                <select
                  {...register(`actions.${index}.type`)}
                  className="input"
                >
                  {actionTypes.map((a) => (
                    <option key={a.value} value={a.value}>{a.label}</option>
                  ))}
                </select>
              </div>

              {actionTypes.find(a => a.value === watch(`actions.${index}.type`))?.value === 'REPLY_COMMENT' && (
                <div>
                  <label className="label">Reply Message</label>
                  <textarea
                    {...register(`actions.${index}.config.message`)}
                    className="input"
                    rows={3}
                    placeholder="Thanks for your comment! Check out our latest video..."
                  />
                </div>
              )}

              {actionTypes.find(a => a.value === watch(`actions.${index}.type`))?.value === 'REPLY_WITH_FORM_LINK' && (
                <div>
                  <label className="label">Reply Message with Form Link</label>
                  <textarea
                    {...register(`actions.${index}.config.message`)}
                    className="input"
                    rows={3}
                    placeholder="Thanks for your comment! Get the PDF here: {{formUrl}}"
                  />
                  <p className="text-xs text-gray-500 mt-1">Use {{formUrl}} placeholder for the form link</p>
                </div>
              )}

              {actionTypes.find(a => a.value === watch(`actions.${index}.type`))?.value === 'SEND_LANDING_PAGE_LINK' && (
                <div>
                  <label className="label">Message with Link</label>
                  <textarea
                    {...register(`actions.${index}.config.message`)}
                    className="input"
                    rows={2}
                    placeholder="Thanks! Get our free guide here: {{landingPageUrl}}"
                  />
                  <p className="text-xs text-gray-500 mt-1">Use {{landingPageUrl}} placeholder for the link</p>
                </div>
              )}

              {actionTypes.find(a => a.value === watch(`actions.${index}.type`))?.value === 'SEND_EMAIL' && (
                <div className="space-y-2">
                  <label className="label">Email Subject</label>
                  <input
                    {...register(`actions.${index}.config.subject`)}
                    className="input"
                    placeholder="Welcome to our community!"
                  />
                  <label className="label">Email HTML Content</label>
                  <textarea
                    {...register(`actions.${index}.config.htmlContent`)}
                    className="input"
                    rows={5}
                    placeholder="<p>Hi {{firstName}},</p><p>Thanks for subscribing!</p>"
                  />
                  <p className="text-xs text-gray-500">Available variables: {{firstName}}, {{lastName}}, {{email}}, {{customFieldName}}</p>
                </div>
              )}

              {actionTypes.find(a => a.value === watch(`actions.${index}.type`))?.value === 'COLLECT_EMAIL' && (
                <div className="space-y-2">
                  <label className="label">Landing Page</label>
                  <select
                    {...register(`actions.${index}.config.landingPageId`)}
                    className="input"
                  >
                    <option value="">Select a landing page</option>
                    {/* Landing pages would be loaded from API */}
                  </select>
                  <p className="text-xs text-gray-500 mt-1">Select a published landing page with email form</p>
                </div>
              )}

              {actionTypes.find(a => a.value === watch(`actions.${index}.type`))?.value === 'ADD_TAG' && (
                <div>
                  <label className="label">Tags</label>
                  <input
                    type="text"
                    placeholder="Add tags (comma separated)"
                    className="input"
                    onBlur={(e) => setValue(`actions.${index}.config.tags`, e.target.value.split(',').map((t: string) => t.trim()).filter(Boolean))}
                  />
                  <p className="text-xs text-gray-500 mt-1">Enter tags separated by commas</p>
                </div>
              )}

              {actionTypes.find(a => a.value === watch(`actions.${index}.type`))?.value === 'CALL_WEBHOOK' && (
                <div className="space-y-2">
                  <label className="label">Webhook URL</label>
                  <input
                    {...register(`actions.${index}.config.url`)}
                    className="input"
                    placeholder="https://your-webhook-url.com/endpoint"
                  />
                  <label className="label">HTTP Method</label>
                  <select
                    {...register(`actions.${index}.config.method`)}
                    className="input"
                  >
                    <option value="POST">POST</option>
                    <option value="PUT">PUT</option>
                    <option value="PATCH">PATCH</option>
                  </select>
                  <label className="label">Headers (JSON)</label>
                  <textarea
                    {...register(`actions.${index}.config.headers`)}
                    className="input font-mono text-sm"
                    rows={3}
                    placeholder='{"Authorization": "Bearer token"}'
                  />
                </div>
              )}

              {actionTypes.find(a => a.value === watch(`actions.${index}.type`))?.value === 'DELAY' && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">Value</label>
                    <input
                      type="number"
                      min={1}
                      {...register(`actions.${index}.config.delayValue`, { valueAsNumber: true })}
                      className="input"
                      placeholder="1"
                    />
                  </div>
                  <div>
                    <label className="label">Unit</label>
                    <select
                      {...register(`actions.${index}.config.delayUnit`)}
                      className="input"
                    >
                      <option value="minutes">Minutes</option>
                      <option value="hours">Hours</option>
                      <option value="days">Days</option>
                    </select>
                  </div>
                </div>
              )}

              {actionTypes.find(a => a.value === watch(`actions.${index}.type`))?.value === 'END' && (
                <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg text-center">
                  <p className="text-gray-600 dark:text-gray-400">This action marks the end of the automation. No further actions will execute.</p>
                </div>
              )}

              <div>
                <label className="label">Conditions (Optional)</label>
                <p className="text-sm text-gray-500 dark:text-gray-400">Add conditions to control when this action executes</p>
                {/* Conditions UI would go here */}
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-end gap-4">
          <button type="button" onClick={() => navigate('/automations')} className="btn-secondary">
            Cancel
          </button>
          <button
            type="submit"
            disabled={createMutation.isPending || updateMutation.isPending}
            className="btn-primary"
          >
            {isEditing ? 'Update Automation' : 'Create Automation'}
          </button>
        </div>
      </form>
    </div>
  );
}

// Video Selector Component
function VideoSelector({ register, watch, setValue }: any) {
  // This would be connected to the YouTube API to fetch user's videos
  return (
    <div className="space-y-2">
      <div className="max-h-60 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg p-2">
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">Select videos (connect YouTube channel first to load videos)</p>
        <div className="space-y-1">
          {/* Video checkboxes would be rendered here */}
        </div>
      </div>
    </div>
  );
}