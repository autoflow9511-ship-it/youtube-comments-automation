import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { automationsApi } from '@services/api';
import { AutomationExecution } from '@types';
import { LoadingScreen } from '@components/ui/LoadingScreen';
import { formatRelativeTime, formatDateTime } from '@utils/format';
import {
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon,
  DocumentTextIcon,
  ChevronDownIcon,
  ChevronRightIcon,
} from '@heroicons/react/24/outline';
import { useState } from 'react';

const statusConfig = {
  completed: { label: 'Completed', color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200', icon: CheckCircleIcon },
  failed: { label: 'Failed', color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200', icon: XCircleIcon },
  pending: { label: 'Pending', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200', icon: ClockIcon },
  running: { label: 'Running', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200', icon: ArrowPathIcon },
};

export function ExecutionDetail() {
  const { id, executionId } = useParams<{ id: string; executionId: string }>();

  const { data: execution, isLoading } = useQuery({
    queryKey: ['execution', executionId],
    queryFn: () => automationsApi.getExecutions(id!, { limit: 1 }).then(r => r.data[0]),
    enabled: !!id && !!executionId,
  });

  const [expandedActions, setExpandedActions] = useState<Set<string>>(new Set());

  if (isLoading) return <LoadingScreen />;
  if (!execution) return <div className="text-center py-12">Execution not found</div>;

  const status = statusConfig[execution.status as keyof typeof statusConfig] || statusConfig.pending;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Execution Details</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Automation execution log</p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`badge ${status.color} flex items-center gap-1`}>
            <status.icon className="w-4 h-4" />
            {status.label}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <InfoCard label="Started" value={formatDateTime(execution.startedAt)} icon={ClockIcon} />
        <InfoCard label="Completed" value={execution.completedAt ? formatDateTime(execution.completedAt) : '—'} icon={CheckCircleIcon} />
        <InfoCard label="Duration" value={execution.completedAt ? Math.round((new Date(execution.completedAt).getTime() - new Date(execution.startedAt).getTime()) / 1000) + 's' : '—'} icon={ClockIcon} />
      </div>

      {execution.error && (
        <div className="card p-4 border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20">
          <div className="flex items-start gap-3">
            <ExclamationTriangleIcon className="w-5 h-5 text-red-500 mt-0.5" />
            <div>
              <h3 className="font-medium text-red-800 dark:text-red-200">Execution Error</h3>
              <p className="text-sm text-red-600 dark:text-red-400 mt-1">{execution.error}</p>
            </div>
          </div>
        </div>
      )}

      <div className="card">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold">Action Executions ({execution.actions?.length || 0})</h2>
        </div>
        <div className="divide-y divide-gray-200 dark:divide-gray-700">
          {execution.actions?.map((action) => {
            const actionStatus = statusConfig[action.status as keyof typeof statusConfig] || statusConfig.pending;
            const isExpanded = expandedActions.has(action.id);
            return (
              <div key={action.id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-1">
                    <button
                      onClick={() => setExpandedActions(prev => {
                        const next = new Set(prev);
                        if (isExpanded) next.delete(action.id);
                        else next.add(action.id);
                        return next;
                      })}
                      className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                    >
                      {isExpanded ? <ChevronDownIcon className="w-5 h-5" /> : <ChevronRightIcon className="w-5 h-5" />}
                    </button>
                    <span className={`badge ${actionStatus.color} flex items-center gap-1`}>
                      <actionStatus.icon className="w-3 h-3" />
                      {actionStatus.label}
                    </span>
                    <span className="font-medium text-gray-900 dark:text-white capitalize">{action.action?.type?.replace(/_/g, ' ') || 'Action'}</span>
                    <span className="text-sm text-gray-500">Order: {action.action?.order ?? 0}</span>
                  </div>
                  <div className="text-sm text-gray-500">
                    {action.completedAt ? formatRelativeTime(action.completedAt) : 'Running...'}
                  </div>
                </div>

                {isExpanded && (
                  <div className="mt-4 ml-8 space-y-3 border-l-2 border-gray-200 dark:border-gray-700 pl-4">
                    <JsonViewer title="Input Data" data={action.inputData} />
                    <JsonViewer title="Output Data" data={action.outputData} />
                    {action.error && (
                      <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                        <h4 className="font-medium text-red-800 dark:text-red-200 mb-1">Error</h4>
                        <pre className="text-sm text-red-600 dark:text-red-400 overflow-auto">{action.error}</pre>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
          {(!execution.actions?.length) && (
            <div className="p-8 text-center text-gray-500 dark:text-gray-400">
              <DocumentTextIcon className="w-12 h-12 mx-auto mb-3 text-gray-300 dark:text-gray-600" />
              <p>No action executions recorded</p>
            </div>
          )}
        </div>
      </div>

      <div className="card p-6">
        <h3 className="text-lg font-semibold mb-4">Trigger Data</h3>
        <pre className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg text-sm overflow-auto max-h-64">
          {JSON.stringify(execution.triggerData, null, 2)}
        </pre>
      </div>
    </div>
  );
}

function InfoCard({ label, value, icon: Icon }: { label: string; value: string; icon: any }) {
  return (
    <div className="card p-4">
      <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
        <Icon className="w-4 h-4" />
        <span>{label}</span>
      </div>
      <p className="text-xl font-bold text-gray-900 dark:text-white mt-1">{value}</p>
    </div>
  );
}

function JsonViewer({ title, data }: { title: string; data: any }) {
  if (!data || Object.keys(data).length === 0) return null;
  
  return (
    <div>
      <h4 className="font-medium text-sm text-gray-700 dark:text-gray-300 mb-1">{title}</h4>
      <pre className="bg-gray-100 dark:bg-gray-800 p-3 rounded-lg text-xs overflow-auto max-h-48">
        {JSON.stringify(data, null, 2)}
      </pre>
    </div>
  );
}