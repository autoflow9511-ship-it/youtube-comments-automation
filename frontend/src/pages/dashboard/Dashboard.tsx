import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  PlayCircleIcon,
  BoltIcon,
  ChatBubbleLeftRightIcon,
  EnvelopeOpenIcon,
  DocumentTextIcon,
  ChartBarIcon,
  ArrowTrendingUpIcon,
  ArrowPathIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
} from '@heroicons/react/24/outline';
import { analyticsApi } from '@services/api';
import { DashboardStats } from '@types';
import { LoadingScreen } from '@components/ui/LoadingScreen';
import { formatNumber } from '@utils/format';

const statsCards = [
  {
    name: 'Channels',
    description: 'Connected YouTube channels',
    icon: PlayCircleIcon,
    color: 'bg-blue-500',
    bgColor: 'bg-blue-50 dark:bg-blue-900/30',
    path: '/channels',
    key: 'channels.connected',
    subKey: 'channels.total',
    subLabel: 'Total channels',
  },
  {
    name: 'Automations',
    description: 'Active automation rules',
    icon: BoltIcon,
    color: 'bg-purple-500',
    bgColor: 'bg-purple-50 dark:bg-purple-900/30',
    path: '/automations',
    key: 'automations.active',
    subKey: 'automations.total',
    subLabel: 'Total automations',
  },
  {
    name: 'Comments Processed',
    description: 'Comments handled by automations',
    icon: ChatBubbleLeftRightIcon,
    color: 'bg-green-500',
    bgColor: 'bg-green-50 dark:bg-green-900/30',
    path: '/comments',
    key: 'comments.processed',
    subKey: 'comments.total',
    subLabel: 'Total comments',
  },
  {
    name: 'Emails Collected',
    description: 'Leads captured this month',
    icon: EnvelopeOpenIcon,
    color: 'bg-orange-500',
    bgColor: 'bg-orange-50 dark:bg-orange-900/30',
    path: '/emails/captures',
    key: 'emails.thisMonth',
    subKey: 'emails.total',
    subLabel: 'Total emails',
  },
  {
    name: 'Emails Sent',
    description: 'Emails delivered this month',
    icon: ArrowPathIcon,
    color: 'bg-green-500',
    bgColor: 'bg-green-50 dark:bg-green-900/30',
    path: '/emails/captures',
    key: 'emailsSent.thisMonth',
    subKey: 'emailsSent.total',
    subLabel: 'Total sent',
  },
  {
    name: 'Emails Failed',
    description: 'Failed email deliveries',
    icon: ExclamationTriangleIcon,
    color: 'bg-red-500',
    bgColor: 'bg-red-50 dark:bg-red-900/30',
    path: '/emails/captures',
    key: 'emailsFailed.thisMonth',
    subKey: 'emailsFailed.total',
    subLabel: 'Total failed',
  },
];

export function Dashboard() {
  const { data: stats, isLoading } = useQuery<DashboardStats>({
    queryKey: ['dashboardStats'],
    queryFn: analyticsApi.getDashboardStats,
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="card p-6 animate-pulse">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-4" />
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Overview of your YouTube automation performance</p>
        </div>
        <Link to="/automations/new" className="btn-primary">
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Create Automation
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6">
        {statsCards.map((stat) => (
          <Link key={stat.name} to={stat.path} className="card p-6 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{stat.description}</p>
                <div className="mt-2 flex items-baseline gap-4">
                  <p className="text-3xl font-bold text-gray-900 dark:text-white">
                    {stats ? formatNumber((stats as any)[stat.key] || 0) : '0'}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {(stats as any)[stat.subKey] !== undefined 
                      ? `${formatNumber((stats as any)[stat.subKey])} ${stat.subLabel.toLowerCase()}`
                      : ''}
                  </p>
                </div>
              </div>
              <div className={`p-3 rounded-xl ${stat.bgColor}`}>
                <stat.icon className={`w-6 h-6 ${stat.color}`} aria-hidden="true" />
              </div>
            </div>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="card">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Quick Actions</h2>
          </div>
          <div className="p-6 space-y-3">
            <Link to="/channels" className="flex items-center gap-4 p-4 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <PlayCircleIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="font-medium text-gray-900 dark:text-white">Connect YouTube Channel</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Link your channel to start automating</p>
              </div>
            </Link>
            <Link to="/automations/new" className="flex items-center gap-4 p-4 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
              <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                <BoltIcon className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="font-medium text-gray-900 dark:text-white">Create Automation</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Build rules for comment replies and lead capture</p>
              </div>
            </Link>
            <Link to="/landing-pages/new" className="flex items-center gap-4 p-4 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
              <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                <DocumentTextIcon className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="font-medium text-gray-900 dark:text-white">Build Landing Page</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Create pages to capture emails from comments</p>
              </div>
            </Link>
          </div>
        </div>

        <div className="card lg:col-span-2">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Email Delivery Status</h2>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <div className="flex items-center gap-3">
                  <CheckCircleIcon className="w-6 h-6 text-green-600" />
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">Emails Sent</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Successfully delivered</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-green-600">
                    {stats ? formatNumber((stats as any).emailsSent?.thisMonth || 0) : '0'}
                  </p>
                  <p className="text-sm text-gray-500">This month</p>
                </div>
              </div>
              <div className="flex items-center justify-between p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
                <div className="flex items-center gap-3">
                  <XCircleIcon className="w-6 h-6 text-red-600" />
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">Emails Failed</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Delivery failed</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-red-600">
                    {stats ? formatNumber((stats as any).emailsFailed?.thisMonth || 0) : '0'}
                  </p>
                  <p className="text-sm text-gray-500">This month</p>
                </div>
              </div>
              <div className="flex items-center justify-between p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                <div className="flex items-center gap-3">
                  <ClockIcon className="w-6 h-6 text-yellow-600" />
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">Pending Delivery</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">In queue or retrying</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-yellow-600">
                    {stats ? formatNumber((stats as any).emailsPending?.thisMonth || 0) : '0'}
                  </p>
                  <p className="text-sm text-gray-500">In queue</p>
                </div>
              </div>
              <div className="flex items-center justify-between p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <div className="flex items-center gap-3">
                  <CheckCircleIcon className="w-6 h-6 text-blue-600" />
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">Delivery Rate</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Overall success rate</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-blue-600">
                    {stats && (stats as any).emailsSent?.total > 0 
                      ? Math.round(((stats as any).emailsSent?.thisMonth || 0) / ((stats as any).emailsSent?.total || 1) * 100) + '%'
                      : 'N/A'}
                  </p>
                  <p className="text-sm text-gray-500">Success rate</p>
                </div>
              </div>
            </div>
            <div className="mt-4 text-center">
              <Link to="/emails/captures" className="text-primary-600 hover:text-primary-500 font-medium text-sm">
                View Detailed Email Logs →
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Quick Actions</h2>
          </div>
          <div className="p-6 space-y-3">
            <Link to="/channels" className="flex items-center gap-4 p-4 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <PlayCircleIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="font-medium text-gray-900 dark:text-white">Connect YouTube Channel</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Link your channel to start automating</p>
              </div>
            </Link>
            <Link to="/automations/new" className="flex items-center gap-4 p-4 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
              <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                <BoltIcon className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="font-medium text-gray-900 dark:text-white">Create Automation</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Build rules for comment replies and lead capture</p>
              </div>
            </Link>
            <Link to="/landing-pages/new" className="flex items-center gap-4 p-4 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
              <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                <DocumentTextIcon className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="font-medium text-gray-900 dark:text-white">Build Landing Page</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Create pages to capture emails from comments</p>
              </div>
            </Link>
          </div>
        </div>

        <div className="card">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Recent Activity</h2>
          </div>
          <div className="p-6">
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              <ChartBarIcon className="w-12 h-12 mx-auto mb-3 text-gray-300 dark:text-gray-600" />
              <p>Connect your first channel to see activity here</p>
              <Link to="/channels" className="mt-3 inline-block text-primary-600 hover:text-primary-500 font-medium">
                Connect Channel →
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}