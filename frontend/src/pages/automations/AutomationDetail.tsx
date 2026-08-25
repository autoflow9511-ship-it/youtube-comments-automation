import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { automationsApi } from '@services/api';
import { LoadingScreen } from '@components/ui/LoadingScreen';
import { formatRelativeTime } from '@utils/format';
import {
  PlayIcon, PauseIcon, PencilIcon, TrashIcon, DocumentDuplicateIcon,
  ArrowPathIcon, ChartBarIcon, DocumentTextIcon
} from '@heroicons/react/24/outline';
import { AutomationStatus } from '@types';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';

const statusConfig: Record<AutomationStatus, { label: string; color: string }> = {
  ACTIVE: { label: 'Active', color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' },
  PAUSED: { label: 'Paused', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' },
  DRAFT: { label: 'Draft', color: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200' },
  ARCHIVED: { label: 'Archived', color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' },
};

export function AutomationDetail() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();

  const { data: automation, isLoading } = useQuery({
    queryKey: ['automation', id],
    queryFn: () => automationsApi.getById(id!),
    enabled: !!id,
  });

  const { data: executions } = useQuery({
    queryKey: ['automationExecutions', id],
    queryFn: () => automationsApi.getExecutions(id!),
    enabled: !!id,
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: AutomationStatus }) => automationsApi.toggleStatus(id, status),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['automation', id] }),
    onError: () => toast.error('Failed to update status'),
  });

  const duplicateMutation = useMutation({
    mutationFn: (id: string) => automationsApi.duplicate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['automations'] });
      toast.success('Automation duplicated');
    },
    onError: () => toast.error('Failed to duplicate'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => automationsApi.delete(id),
    onSuccess: () => toast.success('Automation deleted'),
    onError: () => toast.error('Failed to delete'),
  });

  if (isLoading) return <LoadingScreen />;
  if (!automation) return <div className="text-center py-12">Automation not found</div>;

  const status = statusConfig[automation.status];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{automation.name}</h1>
          <div className="flex items-center gap-3 mt-2">
            <span className={`badge ${status.color}`}>{status.label}</span>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              Channel: {automation.channel?.title}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => duplicateMutation.mutate(id)} className="btn-secondary">
            <DocumentDuplicateIcon className="w-4 h-4 mr-2" /> Duplicate
          </button>
          <button onClick={() => deleteMutation.mutate(id)} className="btn-danger">
            <TrashIcon className="w-4 h-4 mr-2" /> Delete
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card p-6">
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Trigger</h3>
          <p className="font-medium text-gray-900 dark:text-white capitalize">{automation.triggerType.replace('_', ' ')}</p>
          <pre className="mt-2 text-xs text-gray-500 bg-gray-100 dark:bg-gray-800 p-3 rounded overflow-auto">
            {JSON.stringify(automation.triggerConfig, null, 2)}
          </pre>
        </div>
        <div className="card p-6">
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Actions ({automation.actions.length})</h3>
          <div className="space-y-2">
            {automation.actions.map((action, index) => (
              <div key={action.id} className="text-sm">
                <span className="font-medium">{index + 1}. {action.type.replace('_', ' ')}</span>
                <pre className="text-xs text-gray-500 mt-1">{JSON.stringify(action.config)}</pre>
              </div>
            ))}
          </div>
        </div>
        <div className="card p-6">
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Statistics</h3>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between"><dt className="text-gray-500">Total Executions</dt><dd className="font-medium">{automation.executionCount}</dd></div>
            <div className="flex justify-between"><dt className="text-gray-500">Last Executed</dt><dd className="font-medium">{automation.lastExecutedAt ? formatRelativeTime(automation.lastExecutedAt) : 'Never'}</dd></div>
            <div className="flex justify-between"><dt className="text-gray-500">Created</dt><dd className="font-medium">{formatRelativeTime(automation.createdAt)}</dd></div>
          </dl>
        </div>
      </div>

      <div className="card">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Recent Executions</h2>
          <select
            value={automation.status}
            onChange={(e) => toggleMutation.mutate({ id, status: e.target.value as AutomationStatus })}
            className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800"
          >
            <option value="ACTIVE">Active</option>
            <option value="PAUSED">Paused</option>
            <option value="DRAFT">Draft</option>
            <option value="ARCHIVED">Archived</option>
          </select>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Trigger Data</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Started</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Completed</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Duration</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {executions?.data.slice(0, 10).map((exec) => (
                <tr key={exec.id}>
                  <td className="px-6 py-4">
                    <span className={`badge ${
                      exec.status === 'completed' ? 'bg-green-100 text-green-800' :
                      exec.status === 'failed' ? 'bg-red-100 text-red-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>{exec.status}</span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">
                    {JSON.stringify(exec.triggerData).slice(0, 50)}...
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">{formatRelativeTime(exec.startedAt)}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{exec.completedAt ? formatRelativeTime(exec.completedAt) : '-'}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {exec.completedAt ? Math.round((new Date(exec.completedAt).getTime() - new Date(exec.startedAt).getTime()) / 1000) + 's' : '-'}
                  </td>
                </tr>
              ))}
              {(!executions?.data.length || executions.data.length === 0) && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-500">No executions yet</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}