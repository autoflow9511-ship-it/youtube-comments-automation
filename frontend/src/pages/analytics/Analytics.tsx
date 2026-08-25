import { useQuery } from '@tanstack/react-query';
import { analyticsApi } from '@services/api';
import { LoadingScreen, PageLoading } from '@components/ui/LoadingScreen';
import {
  ChartBarIcon,
  PlayCircleIcon,
  BoltIcon,
  ChatBubbleLeftRightIcon,
  EnvelopeOpenIcon,
  ArrowTrendingUpIcon,
  CurrencyDollarIcon,
} from '@heroicons/react/24/outline';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area,
  BarChart, Bar, PieChart, Pie, Cell,
} from 'recharts';
import { formatNumber, formatDate } from '@utils/format';

const COLORS = ['#0ea5e9', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#ec4899'];

export function Analytics() {
  const { data: stats, isLoading: loadingStats } = useQuery({
    queryKey: ['dashboardStats'],
    queryFn: analyticsApi.getDashboardStats,
  });

  const { data: automationStats, isLoading: loadingAuto } = useQuery({
    queryKey: ['automationStats'],
    queryFn: () => analyticsApi.getAutomationStats(undefined, 30),
  });

  const { data: emailStats, isLoading: loadingEmail } = useQuery({
    queryKey: ['emailStats'],
    queryFn: () => analyticsApi.getEmailStats(30),
  });

  if (loadingStats || loadingAuto || loadingEmail) return <PageLoading />;

  const chartData = automationStats?.byDay || [];
  const emailChartData = [
    { name: 'Sent', value: emailStats?.sent || 0 },
    { name: 'Delivered', value: emailStats?.delivered || 0 },
    { name: 'Opened', value: emailStats?.opened || 0 },
    { name: 'Clicked', value: emailStats?.clicked || 0 },
    { name: 'Bounced', value: emailStats?.bounced || 0 },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Analytics</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">Track your YouTube automation performance</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={PlayCircleIcon} color="bg-blue-500" bgColor="bg-blue-50 dark:bg-blue-900/30" value={formatNumber(stats?.channels.connected || 0)} label="Connected Channels" subValue={`${stats?.channels.total} total`} />
        <StatCard icon={BoltIcon} color="bg-purple-500" bgColor="bg-purple-50 dark:bg-purple-900/30" value={formatNumber(stats?.automations.active || 0)} label="Active Automations" subValue={`${stats?.automations.total} total`} />
        <StatCard icon={ChatBubbleLeftRightIcon} color="bg-green-500" bgColor="bg-green-50 dark:bg-green-900/30" value={formatNumber(stats?.comments.processed || 0)} label="Comments Processed" subValue={`${stats?.comments.total} total`} />
        <StatCard icon={EnvelopeOpenIcon} color="bg-orange-500" bgColor="bg-orange-50 dark:bg-orange-900/30" value={formatNumber(stats?.emails.thisMonth || 0)} label="Emails This Month" subValue={`${stats?.emails.total} total`} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card p-6">
          <h2 className="text-lg font-semibold mb-4">Automation Executions (30 days)</h2>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorExecutions" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorSuccess" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="date" stroke="#9ca3af" tick={{ fontSize: 12 }} />
                <YAxis stroke="#9ca3af" tick={{ fontSize: 12 }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px' }}
                  labelFormatter={formatDate}
                  formatter={(value: number, name: string) => [value, name]}
                />
                <Area type="monotone" dataKey="total" stroke="#0ea5e9" fillOpacity={1} fill="url(#colorExecutions)" name="Total" />
                <Area type="monotone" dataKey="successful" stroke="#10b981" fillOpacity={1} fill="url(#colorSuccess)" name="Successful" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card p-6">
          <h2 className="text-lg font-semibold mb-4">Email Performance</h2>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={emailChartData.filter(d => d.value > 0)}
                  cx="50%" cy="50%" innerRadius={60} outerRadius={100}
                  paddingAngle={2} dataKey="value" nameKey="name"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  labelLine={false}
                >
                  {emailChartData.filter(d => d.value > 0).map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => [value, 'emails']} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{emailStats?.deliveryRate?.toFixed(1) || 0}%</p>
              <p className="text-xs text-gray-500">Delivery Rate</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{emailStats?.openRate?.toFixed(1) || 0}%</p>
              <p className="text-xs text-gray-500">Open Rate</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{emailStats?.clickRate?.toFixed(1) || 0}%</p>
              <p className="text-xs text-gray-500">Click Rate</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{emailStats?.bounceRate?.toFixed(1) || 0}%</p>
              <p className="text-xs text-gray-500">Bounce Rate</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <MetricCard title="Automation Success Rate" value={`${automationStats?.successRate?.toFixed(1) || 0}%`} icon={ArrowTrendingUpIcon} color="text-green-600" />
        <MetricCard title="Total Executions" value={formatNumber(automationStats?.total || 0)} icon={BoltIcon} color="text-purple-600" />
        <MetricCard title="Failed Executions" value={formatNumber(automationStats?.failed || 0)} icon={ChartBarIcon} color="text-red-600" />
      </div>
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
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{subValue}</p>
        </div>
        <div className={`p-3 rounded-xl ${bgColor}`}>
          <Icon className={`w-6 h-6 ${color}`} />
        </div>
      </div>
    </div>
  );
}

function MetricCard({ title, value, icon: Icon, color }: any) {
  return (
    <div className="card p-6 text-center">
      <Icon className={`w-8 h-8 mx-auto mb-2 ${color}`} />
      <p className="text-3xl font-bold text-gray-900 dark:text-white">{value}</p>
      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{title}</p>
    </div>
  );
}