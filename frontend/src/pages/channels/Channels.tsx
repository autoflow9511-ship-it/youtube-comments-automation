import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { channelsApi } from '@services/api';
import { Channel, ChannelStatus } from '@types';
import { LoadingScreen, PageLoading } from '@components/ui/LoadingScreen';
import toast from 'react-hot-toast';
import {
  PlusIcon,
  PlayCircleIcon,
  PauseCircleIcon,
  XCircleIcon,
  ExclamationCircleIcon,
  LinkIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';
import { formatRelativeTime } from '@utils/format';
import { useState } from 'react';

const statusConfig: Record<ChannelStatus, { label: string; color: string; icon: any }> = {
  CONNECTED: { label: 'Connected', color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200', icon: PlayCircleIcon },
  DISCONNECTED: { label: 'Disconnected', color: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200', icon: PauseCircleIcon },
  ERROR: { label: 'Error', color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200', icon: ExclamationCircleIcon },
  PENDING_REVIEW: { label: 'Pending Review', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200', icon: ExclamationCircleIcon },
};

export function Channels() {
  const queryClient = useQueryClient();
  const [showConnectModal, setShowConnectModal] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['channels'],
    queryFn: () => channelsApi.getAll(),
  });

  const connectMutation = useMutation({
    mutationFn: channelsApi.connect,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['channels'] });
      toast.success('Channel connected successfully!');
      setShowConnectModal(false);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to connect channel');
    },
  });

  const disconnectMutation = useMutation({
    mutationFn: (id: string) => channelsApi.disconnect(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['channels'] });
      toast.success('Channel disconnected');
    },
    onError: () => toast.error('Failed to disconnect channel'),
  });

  if (isLoading) return <PageLoading />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">YouTube Channels</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Manage your connected YouTube channels</p>
        </div>
        <button
          onClick={() => setShowConnectModal(true)}
          className="btn-primary flex items-center gap-2"
        >
          <PlusIcon className="w-5 h-5" />
          Connect Channel
        </button>
      </div>

      {data?.data.length === 0 ? (
        <div className="card p-12 text-center">
          <PlayCircleIcon className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No channels connected</h3>
          <p className="text-gray-500 dark:text-gray-400 mb-6">Connect your YouTube channel to start automating comments and capturing leads</p>
          <button
            onClick={() => setShowConnectModal(true)}
            className="btn-primary"
          >
            Connect Your First Channel
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {data?.data.map((channel: Channel) => {
            const status = statusConfig[channel.status as ChannelStatus];
            const StatusIcon = status.icon;
            return (
              <div key={channel.id} className="card overflow-hidden">
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <img
                        src={channel.thumbnailUrl || '/default-channel.png'}
                        alt={channel.title}
                        className="w-12 h-12 rounded-lg object-cover"
                      />
                      <div>
                        <h3 className="font-semibold text-gray-900 dark:text-white truncate max-w-[200px]">
                          {channel.title}
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {channel.customUrl ? `@${channel.customUrl}` : channel.youtubeChannelId}
                        </p>
                      </div>
                    </div>
                    <span className={`badge ${status.color}`}>
                      <StatusIcon className="w-3 h-3 mr-1" />
                      {status.label}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-4 text-center mb-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <div>
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">
                        {channel.subscriberCount.toLocaleString()}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Subscribers</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">
                        {channel.videoCount.toLocaleString()}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Videos</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">
                        {channel.viewCount.toLocaleString()}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Views</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => connectMutation.mutate(channel.id)}
                      disabled={connectMutation.isPending}
                      className="btn-secondary flex-1 flex items-center justify-center gap-2 text-sm"
                    >
                      <ArrowPathIcon className="w-4 h-4" />
                      Refresh
                    </button>
                    <button
                      onClick={() => disconnectMutation.mutate(channel.id)}
                      disabled={disconnectMutation.isPending}
                      className="btn-danger flex-1 flex items-center justify-center gap-2 text-sm"
                    >
                      <XCircleIcon className="w-4 h-4" />
                      Disconnect
                    </button>
                  </div>
                </div>
                <div className="border-t border-gray-200 dark:border-gray-700 px-6 py-3 bg-gray-50 dark:bg-gray-800">
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Last synced: {channel.lastSyncedAt ? formatRelativeTime(channel.lastSyncedAt) : 'Never'}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showConnectModal && (
        <ChannelConnectModal
          isOpen={showConnectModal}
          onClose={() => setShowConnectModal(false)}
          onConnect={connectMutation.mutate}
          isLoading={connectMutation.isPending}
        />
      )}
    </div>
  );
}

function ChannelConnectModal({
  isOpen,
  onClose,
  onConnect,
  isLoading,
}: {
  isOpen: boolean;
  onClose: () => void;
  onConnect: (data: any) => void;
  isLoading: boolean;
}) {
  const [step, setStep] = useState(1);
  const [oauthUrl, setOauthUrl] = useState('');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Connect YouTube Channel</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {step === 1 && (
          <div className="p-6 space-y-4">
            <p className="text-gray-600 dark:text-gray-400">
              You'll be redirected to Google to authorize access to your YouTube channel.
            </p>
            <button
              onClick={async () => {
                const res = await channelsApi.getAll();
                // In real app, this would call the Google OAuth endpoint
                window.location.href = `${import.meta.env.VITE_API_URL || '/api/v1'}/auth/google`;
              }}
              disabled={isLoading}
              className="btn-primary w-full flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              Continue with Google
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="p-6 space-y-4">
            <p className="text-gray-600 dark:text-gray-400">Select the channel to connect:</p>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {/* Channel list would go here */}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}