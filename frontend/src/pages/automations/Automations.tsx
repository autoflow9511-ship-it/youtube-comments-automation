import { useQuery } from '@tanstack/react-query';
import { automationsApi } from '@services/api';
import { Automation, AutomationStatus } from '@types';
import { LoadingScreen, PageLoading } from '@components/ui/LoadingScreen';
import { Link } from 'react-router-dom';
import { PlusIcon, PlayIcon, PauseIcon, PencilIcon, TrashIcon, DocumentDuplicateIcon } from '@heroicons/react/24/outline';
import { formatRelativeTime } from '@utils/format';
import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';

const statusConfig: Record<AutomationStatus, { label: string; color: string }> = {
  ACTIVE: { label: 'Active', color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' },
  PAUSED: { label: 'Paused', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' },
  DRAFT: { label: 'Draft', color: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200' },
  ARCHIVED: { label: 'Archived', color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' },
};

export function Automations() {
  const queryClient = useQueryClient();
  const [showCreateModal, setShowCreateModal] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['automations'],
    queryFn: () => automationsApi.getAll(),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => automationsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['automations'] });
      toast.success('Automation deleted');
    },
    onError: () => toast.error('Failed to delete automation'),
  });

  const duplicateMutation = useMutation({
    mutationFn: (id: string) => automationsApi.duplicate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['automations'] });
      toast.success('Automation duplicated');
    },
    onError: () => toast.error('Failed to duplicate automation'),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: AutomationStatus }) => automationsApi.toggleStatus(id, status),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['automations'] }),
    onError: () => toast.error('Failed to update status'),
  });

  if (isLoading) return <PageLoading />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Automations</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Create rules to automate YouTube comments and capture leads</p>
        </div>
        <Link to="/automations/new" className="btn-primary flex items-center gap-2">
          <PlusIcon className="w-5 h-5" />
          Create Automation
        </Link>
      </div>

      {data?.data.length === 0 ? (
        <div className="card p-12 text-center">
          <svg className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
          </svg>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No automations yet</h3>
          <p className="text-gray-500 dark:text-gray-400 mb-6">Create your first automation to start replying to comments and capturing emails automatically</p>
          <Link to="/automations/new" className="btn-primary">Create Automation</Link>
        </div>
      ) : (
        <div className="space-y-4">
          {data?.data.map((automation: Automation) => {
            const status = statusConfig[automation.status];
            return (
              <div key={automation.id} className="card p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold text-gray-900 dark:text-white">{automation.name}</h3>
                      <span className={`badge ${status.color}`}>{status.label}</span>
                    </div>
                    <p className="text-gray-500 dark:text-gray-400 text-sm mb-3">{automation.description || 'No description'}</p>
                    <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                      <span>Trigger: {automation.triggerType.replace('_', ' ')}</span>
                      <span>{automation.actions.length} action(s)</span>
                      <span>Executed: {automation.executionCount} times</span>
                      <span>Last run: {automation.lastExecutedAt ? formatRelativeTime(automation.lastExecutedAt) : 'Never'}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Link to={`/automations/${automation.id}`} className="btn-secondary text-sm">
                      <PencilIcon className="w-4 h-4" />
                    </Link>
                    <button
                      onClick={() => duplicateMutation.mutate(automation.id)}
                      disabled={duplicateMutation.isPending}
                      className="btn-secondary text-sm"
                      title="Duplicate"
                    >
                      <DocumentDuplicateIcon className="w-4 h-4" />
                    </button>
                    <select
                      value={automation.status}
                      onChange={(e) => toggleMutation.mutate({ id: automation.id, status: e.target.value as AutomationStatus })}
                      disabled={toggleMutation.isPending}
                      className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800"
                    >
                      <option value="ACTIVE">Active</option>
                      <option value="PAUSED">Paused</option>
                      <option value="DRAFT">Draft</option>
                    </select>
                    <button
                      onClick={() => { if (confirm('Delete this automation?')) deleteMutation.mutate(automation.id); }}
                      disabled={deleteMutation.isPending}
                      className="btn-danger text-sm"
                      title="Delete"
                    >
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}