import { useParams } from 'react-router-dom';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { channelsApi, automationsApi, commentsApi, analyticsApi } from '@services/api';
import { Channel, Automation, AutomationStatus } from '@types';
import { LoadingScreen, PageLoading } from '@components/ui/LoadingScreen';
import toast from 'react-hot-toast';
import {
  PlayCircleIcon,
  BoltIcon,
  ChatBubbleLeftRightIcon,
  ChartBarIcon,
  Cog6ToothIcon,
  ArrowPathIcon,
  PencilIcon,
  TrashIcon,
  XCircleIcon,
  ExclamationCircleIcon,
} from '@heroicons/react/24/outline';
import { formatNumber, formatRelativeTime } from '@utils/format';

const statusConfig: Record<ChannelStatus, { label: string; color: string; icon: any }> = {
  CONNECTED: { label: 'Connected', color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200', icon: PlayCircleIcon },
  DISCONNECTED: { label: 'Disconnected', color: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200', icon: XCircleIcon },
  ERROR: { label: 'Error', color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200', icon: ExclamationCircleIcon },
  PENDING_REVIEW: { label: 'Pending Review', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200', icon: ExclamationCircleIcon },
};

const automationStatusConfig: Record<AutomationStatus, { label: string; color: string }> = {
  ACTIVE: { label: 'Active', color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' },
  PAUSED: { label: 'Paused', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' },
  DRAFT: { label: 'Draft', color: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200' },
  ARCHIVED: { label: 'Archived', color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' },
};

export function ChannelDetail() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'overview' | 'automations' | 'comments' | 'analytics'>('overview');

  const { data: channel, isLoading: loadingChannel } = useQuery({
    queryKey: ['channel', id],
    queryFn: () => channelsApi.getById(id!),
    enabled: !!id,
  });

  const { data: automations, isLoading: loadingAutomations } = useQuery({
    queryKey: ['channelAutomations', id],
    queryFn: () => automationsApi.getAll({ channelId: id }),
    enabled: !!id,
  });

  const { data: comments, isLoading: loadingComments } = useQuery({
    queryKey: ['channelComments', id],
    queryFn: () => commentsApi.getAll({ channelId: id, limit: 50 }),
    enabled: !!id,
  });

  const { data: analytics, isLoading: loadingAnalytics } = useQuery({
    queryKey: ['channelAnalytics', id],
    queryFn: () => analyticsApi.getChannelAnalytics(id!, 30),
    enabled: !!id,
  });

  const toggleAutomationMutation = useMutation({
    mutationFn: ({ automationId, status }: { automationId: string; status: AutomationStatus }) => automationsApi.toggleStatus(automationId, status),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['channelAutomations', id] }),
  });

  const disconnectMutation = useMutation({
    mutationFn: () => channelsApi.disconnect(id!),
    onSuccess: () => toast.success('Channel disconnected'),
    onError: () => toast.error('Failed to disconnect channel'),
  });

  if (loadingChannel) return <LoadingScreen />;
  if (!channel) return <div className="text-center py-12">Channel not found</div>;

  const status = statusConfig[channel.status as any];

  const tabs = [
    { id: 'overview', label: 'Overview', icon: ChartBarIcon },
    { id: 'automations', label: 'Automations', icon: BoltIcon, count: automations?.data.length || 0 },
    { id: 'comments', label: 'Comments', icon: ChatBubbleLeftRightIcon, count: comments?.data.length || 0 },
    { id: 'analytics', label: 'Analytics', icon: ChartBarIcon },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <img src={channel.thumbnailUrl || '/default-channel.png'} alt={channel.title} className="w-16 h-16 rounded-lg object-cover" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{channel.title}</h1>
            <div className="flex items-center gap-3 mt-1">
              <span className={`badge ${status.color}`}>
                <status.icon className="w-3 h-3 mr-1" />
                {status.label}
              </span>
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {channel.customUrl ? `@${channel.customUrl}` : channel.youtubeChannelId}
              </span>
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {formatNumber(channel.subscriberCount)} subscribers
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => disconnectMutation.mutate()} disabled={disconnectMutation.isPending} className="btn-danger">
            <XCircleIcon className="w-4 h-4 mr-2" /> Disconnect
          </button>
        </div>
      </div>

      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="flex -mb-px" aria-label="Tabs">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
              }`}
            >
              <tab.icon className="w-5 h-5" />
              {tab.label}
              {tab.count !== undefined && (
                <span className="badge bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200 ml-1">
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard icon={PlayCircleIcon} color="bg-blue-500" bgColor="bg-blue-50 dark:bg-blue-900/30" value={formatNumber(channel.subscriberCount)} label="Subscribers" />
            <StatCard icon={PlayCircleIcon} color="bg-purple-500" bgColor="bg-purple-50 dark:bg-purple-900/30" value={formatNumber(channel.videoCount)} label="Videos" />
            <StatCard icon={PlayCircleIcon} color="bg-green-500" bgColor="bg-green-50 dark:bg-green-900/30" value={formatNumber(channel.viewCount)} label="Total Views" />
            <StatCard icon={PlayCircleIcon} color="bg-orange-500" bgColor="bg-orange-50 dark:bg-orange-900/30" value={automations?.data.filter(a => a.status === 'ACTIVE').length || 0} label="Active Automations" subValue={`${automations?.data.length || 0} total`} />
          </div>

          <div className="card p-6">
            <h3 className="text-lg font-semibold mb-4">Channel Settings</h3>
            <dl className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div><dt className="text-gray-500">Channel ID</dt><dd className="font-medium font-mono">{channel.youtubeChannelId}</dd></div>
              <div><dt className="text-gray-500">Status</dt><dd className="font-medium capitalize">{channel.status.toLowerCase()}</dd></div>
              <div><dt className="text-gray-500">Last Synced</dt><dd className="font-medium">{channel.lastSyncedAt ? formatRelativeTime(channel.lastSyncedAt) : 'Never'}</dd></div>
              <div><dt className="text-gray-500">Connected</dt><dd className="font-medium">{formatRelativeTime(channel.createdAt)}</dd></div>
            </dl>
            {channel.syncError && (
              <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-300 text-sm">
                Sync Error: {channel.syncError}
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'automations' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Automations</h2>
            <button className="btn-primary text-sm">
              <PlusIcon className="w-4 h-4 mr-2" /> Create Automation
            </button>
          </div>

          {loadingAutomations ? <PageLoading /> : (
            <div className="space-y-3">
              {automations?.data.length === 0 ? (
                <div className="card p-12 text-center">
                  <BoltIcon className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No automations</h3>
                  <p className="text-gray-500 dark:text-gray-400 mb-4">Create your first automation for this channel</p>
                  <button className="btn-primary">Create Automation</button>
                </div>
              ) : (
                automations?.data.map((automation: Automation) => {
                  const status = automationStatusConfig[automation.status];
                  return (
                    <div key={automation.id} className="card p-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                          <BoltIcon className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                        </div>
                        <div>
                          <h4 className="font-medium text-gray-900 dark:text-white">{automation.name}</h4>
                          <p className="text-sm text-gray-500 dark:text-gray-400">{automation.triggerType.replace('_', ' ')} • {automation.actions.length} action(s)</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`badge ${status.color}`}>{status.label}</span>
                        <select
                          value={automation.status}
                          onChange={(e) => toggleAutomationMutation.mutate({ automationId: automation.id, status: e.target.value as AutomationStatus })}
                          className="input py-1.5 w-24 text-sm"
                        >
                          <option value="ACTIVE">Active</option>
                          <option value="PAUSED">Paused</option>
                          <option value="DRAFT">Draft</option>
                        </select>
                        <button className="btn-secondary text-sm">Edit</button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
      )}

      {activeTab === 'comments' && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Recent Comments</h2>

          {loadingComments ? <PageLoading /> : (
            <div className="card overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-800">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Comment</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Video</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Author</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {comments?.data.map((comment) => (
                    <tr key={comment.id}>
                      <td className="px-6 py-4 max-w-xs truncate text-gray-900 dark:text-white">{comment.text}</td>
                      <td className="px-6 py-4 text-sm text-gray-500 truncate max-w-xs">{comment.videoTitle || comment.videoId}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          {comment.authorAvatar && <img src={comment.authorAvatar} alt="" className="w-6 h-6 rounded-full" />}
                          <span className="text-sm font-medium text-gray-900 dark:text-white">{comment.authorName}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">{formatRelativeTime(comment.publishedAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === 'analytics' && (
        <div className="space-y-6">
          <h2 className="text-lg font-semibold">Channel Analytics (30 days)</h2>

          {loadingAnalytics ? <PageLoading /> : analytics && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <StatCard icon={ChatBubbleLeftRightIcon} color="bg-blue-500" bgColor="bg-blue-50 dark:bg-blue-900/30" value={formatNumber(analytics.comments)} label="Comments" />
              <StatCard icon={ChatBubbleLeftRightIcon} color="bg-green-500" bgColor="bg-green-50 dark:bg-green-900/30" value={formatNumber(analytics.replies)} label="Auto Replies" />
              <StatCard icon={BoltIcon} color="bg-purple-500" bgColor="bg-purple-50 dark:bg-purple-900/30" value={formatNumber(analytics.automationExecutions)} label="Executions" />
              <StatCard icon={EnvelopeOpenIcon} color="bg-orange-500" bgColor="bg-orange-50 dark:bg-orange-900/30" value={formatNumber(analytics.emailCaptures)} label="Emails Captured" />
            </div>
          )}

          <div className="card p-6">
            <h3 className="text-lg font-semibold mb-4">Top Videos by Comments</h3>
            {analytics?.topVideos.length > 0 ? (
              <div className="space-y-3">
                {analytics.topVideos.map((video: any, index: number) => (
                  <div key={video.videoId} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <div className="flex items-center gap-3">
                      <span className="text-lg font-bold text-gray-400 w-8 text-center">{index + 1}</span>
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white truncate max-w-md">{video.title}</p>
                        <p className="text-sm text-gray-500">{video.videoId}</p>
                      </div>
                    </div>
                    <span className="badge bg-primary-100 text-primary-800">{video.commentCount} comments</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 dark:text-gray-400 text-center py-8">No video data available</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ icon: Icon, color, bgColor, value, label, subValue }: any) {
  return (
    <div className="card p-6">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{label}</p>
          <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">{value}</p>
          {subValue && <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{subValue}</p>}
        </div>
        <div className={`p-3 rounded-xl ${bgColor}`}>
          <Icon className={`w-6 h-6 ${color}`} />
        </div>
      </div>
    </div>
  );
}

// Import icons
import { PlusIcon, EnvelopeOpenIcon } from '@heroicons/react/24/outline';