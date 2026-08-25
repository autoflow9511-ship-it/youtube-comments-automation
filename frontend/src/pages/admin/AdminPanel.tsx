import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '@services/api';
import { User, UserRole, SubscriptionTier } from '@types';
import { LoadingScreen, PageLoading } from '@components/ui/LoadingScreen';
import toast from 'react-hot-toast';
import {
  MagnifyingGlassIcon,
  FunnelIcon,
  PencilIcon,
  TrashIcon,
  ShieldCheckIcon,
  Cog6ToothIcon,
  DocumentTextIcon,
  UserGroupIcon,
  CurrencyDollarIcon,
  ArrowTrendingUpIcon,
} from '@heroicons/react/24/outline';
import { formatNumber, formatDate, formatRelativeTime } from '@utils/format';

const roleOptions = ['USER', 'ADMIN', 'SUPER_ADMIN'] as const;
const tierOptions = ['FREE', 'STARTER', 'PRO', 'ENTERPRISE'] as const;

export function AdminPanel() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'audit' | 'config'>('overview');
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<UserRole | 'all'>('all');
  const [tierFilter, setTierFilter] = useState<SubscriptionTier | 'all'>('all');

  const { data: stats, isLoading: loadingStats } = useQuery({
    queryKey: ['adminStats'],
    queryFn: adminApi.getStats,
  });

  const { data: usersData, isLoading: loadingUsers } = useQuery({
    queryKey: ['adminUsers', search, roleFilter, tierFilter],
    queryFn: () => adminApi.getUsers({ search, role: roleFilter === 'all' ? undefined : roleFilter, subscriptionTier: tierFilter === 'all' ? undefined : tierFilter }),
  });

  const { data: auditData, isLoading: loadingAudit } = useQuery({
    queryKey: ['adminAuditLogs'],
    queryFn: () => adminApi.getAuditLogs({ limit: 100 }),
  });

  const updateUserMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => adminApi.updateUser(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminUsers'] });
      toast.success('User updated');
    },
    onError: (error: any) => toast.error(error.response?.data?.message || 'Failed to update user'),
  });

  const deleteUserMutation = useMutation({
    mutationFn: (id: string) => adminApi.deleteUser(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminUsers'] });
      toast.success('User deleted');
    },
    onError: () => toast.error('Failed to delete user'),
  });

  const configMutation = useMutation({
    mutationFn: ({ key, value }: { key: string; value: any }) => adminApi.updateConfig(key, value),
    onSuccess: () => toast.success('Config updated'),
    onError: () => toast.error('Failed to update config'),
  });

  if (loadingStats) return <PageLoading />;

  const tabs = [
    { id: 'overview', label: 'Overview', icon: ChartBarIcon },
    { id: 'users', label: 'Users', icon: UserGroupIcon },
    { id: 'audit', label: 'Audit Logs', icon: DocumentTextIcon },
    { id: 'config', label: 'Config', icon: Cog6ToothIcon },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Admin Panel</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">System administration and monitoring</p>
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
            </button>
          ))}
        </nav>
      </div>

      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard icon={UserGroupIcon} color="bg-blue-500" bgColor="bg-blue-50 dark:bg-blue-900/30" value={formatNumber(stats?.users.total || 0)} label="Total Users" subValue={`${stats?.users.active} active`} />
            <StatCard icon={PlayCircleIcon} color="bg-purple-500" bgColor="bg-purple-50 dark:bg-purple-900/30" value={formatNumber(stats?.channels.connected || 0)} label="Connected Channels" subValue={`${stats?.channels.total} total`} />
            <StatCard icon={BoltIcon} color="bg-green-500" bgColor="bg-green-50 dark:bg-green-900/30" value={formatNumber(stats?.automations.active || 0)} label="Active Automations" subValue={`${stats?.automations.total} total`} />
            <StatCard icon={CurrencyDollarIcon} color="bg-orange-500" bgColor="bg-orange-50 dark:bg-orange-900/30" value={`$${stats?.revenue?.monthly || 0}`} label="Monthly Revenue" subValue={`$${stats?.revenue?.yearly || 0} yearly`} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="card p-6">
              <h3 className="text-lg font-semibold mb-4">Subscription Distribution</h3>
              <div className="space-y-3">
                {stats?.subscriptionDistribution?.map((item: any) => (
                  <div key={item.tier} className="flex items-center justify-between">
                    <span className="capitalize text-gray-700 dark:text-gray-300">{item.tier}</span>
                    <div className="flex items-center gap-3">
                      <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded overflow-hidden">
                        <div className="h-full bg-primary-600" style={{ width: `${stats.users.total > 0 ? (item.count / stats.users.total) * 100 : 0}%` }} />
                      </div>
                      <span className="text-sm font-medium w-16 text-right">{item.count}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="card p-6">
              <h3 className="text-lg font-semibold mb-4">User Growth (30 days)</h3>
              <div className="h-64">
                {stats?.userGrowth && stats.userGrowth.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={stats.userGrowth}>
                      <defs>
                        <linearGradient id="colorGrowth" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis dataKey="date" stroke="#9ca3af" tick={{ fontSize: 12 }} />
                      <YAxis stroke="#9ca3af" tick={{ fontSize: 12 }} />
                      <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px' }} />
                      <Area type="monotone" dataKey="count" stroke="#0ea5e9" fillOpacity={1} fill="url(#colorGrowth)" />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-gray-500">No data available</div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'users' && (
        <div className="space-y-4">
          <div className="card p-4 border-b border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1 max-w-md">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search users..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="input pl-10"
              />
            </div>
            <div className="flex items-center gap-2">
              <FunnelIcon className="w-5 h-5 text-gray-400" />
              <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value as any)} className="input py-2 w-36">
                <option value="all">All Roles</option>
                {roleOptions.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
              <select value={tierFilter} onChange={(e) => setTierFilter(e.target.value as any)} className="input py-2 w-36">
                <option value="all">All Tiers</option>
                {tierOptions.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>

          {loadingUsers ? (
            <PageLoading />
          ) : (
            <div className="card overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-800">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">User</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Role</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Tier</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Channels</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Automations</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Emails</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Last Login</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {usersData?.data.map((user: User) => (
                    <tr key={user.id}>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900 flex items-center justify-center">
                            <span className="text-sm font-medium text-primary-700 dark:text-primary-300">
                              {user.firstName?.[0] || user.email[0].toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white">{user.firstName} {user.lastName}</p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">{user.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <UserRoleBadge role={user.role} onChange={(role) => updateUserMutation.mutate({ id: user.id, data: { role } })} />
                      </td>
                      <td className="px-6 py-4">
                        <SubscriptionTierBadge tier={user.subscriptionTier} onChange={(tier) => updateUserMutation.mutate({ id: user.id, data: { tier } })} />
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">{user._count?.channels || 0}</td>
                      <td className="px-6 py-4 text-sm text-gray-500">{user._count?.automations || 0}</td>
                      <td className="px-6 py-4 text-sm text-gray-500">{user._count?.emailCaptures || 0}</td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {user.lastLoginAt ? formatRelativeTime(user.lastLoginAt) : 'Never'}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <button onClick={() => deleteUserMutation.mutate(user.id)} disabled={deleteUserMutation.isPending} className="text-red-500 hover:text-red-700 text-sm">Delete</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === 'audit' && (
        <div className="card overflow-hidden">
          {loadingAudit ? <PageLoading /> : (
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Time</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Admin</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Action</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Resource</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {auditData?.data.map((log: any) => (
                  <tr key={log.id}>
                    <td className="px-6 py-4 text-sm text-gray-500">{formatRelativeTime(log.createdAt)}</td>
                    <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">{log.admin?.email || 'System'}</td>
                    <td className="px-6 py-4"><span className="badge bg-gray-100 text-gray-800">{log.action}</span></td>
                    <td className="px-6 py-4 text-sm text-gray-500">{log.resource} {log.resourceId ? `(${log.resourceId.slice(0, 8)})` : ''}</td>
                    <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">{JSON.stringify(log.newData || log.oldData || {}).slice(0, 100)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {activeTab === 'config' && (
        <div className="card p-6">
          <h3 className="text-lg font-semibold mb-4">System Configuration</h3>
          <div className="space-y-4">
            {[
              { key: 'max_channels_per_user', label: 'Max Channels Per User', type: 'number' },
              { key: 'max_automations_per_channel', label: 'Max Automations Per Channel', type: 'number' },
              { key: 'comment_fetch_interval_minutes', label: 'Comment Fetch Interval (minutes)', type: 'number' },
              { key: 'email_daily_limit', label: 'Daily Email Limit Per User', type: 'number' },
              { key: 'webhook_retry_max_attempts', label: 'Webhook Retry Max Attempts', type: 'number' },
            ].map((item) => (
              <ConfigItem key={item.key} item={item} onUpdate={configMutation.mutate} />
            ))}
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
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{subValue}</p>
        </div>
        <div className={`p-3 rounded-xl ${bgColor}`}>
          <Icon className={`w-6 h-6 ${color}`} />
        </div>
      </div>
    </div>
  );
}

function UserRoleBadge({ role, onChange }: { role: UserRole; onChange: (role: UserRole) => void }) {
  return (
    <select value={role} onChange={(e) => onChange(e.target.value as UserRole)} className="input py-1.5 w-32 text-sm">
      {roleOptions.map(r => <option key={r} value={r}>{r}</option>)}
    </select>
  );
}

function SubscriptionTierBadge({ tier, onChange }: { tier: SubscriptionTier; onChange: (tier: SubscriptionTier) => void }) {
  const colors: Record<SubscriptionTier, string> = {
    FREE: 'bg-gray-100 text-gray-800',
    STARTER: 'bg-blue-100 text-blue-800',
    PRO: 'bg-purple-100 text-purple-800',
    ENTERPRISE: 'bg-yellow-100 text-yellow-800',
  };

  return (
    <select value={tier} onChange={(e) => onChange(e.target.value as SubscriptionTier)} className="input py-1.5 w-32 text-sm">
      {tierOptions.map(t => <option key={t} value={t}>{t}</option>)}
    </select>
  );
}

function ConfigItem({ item, onUpdate }: { item: { key: string; label: string; type: string }; onUpdate: (data: { key: string; value: any }) => void }) {
  const [value, setValue] = useState('');
  const [saving, setSaving] = useState(false);

  return (
    <div className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
      <div>
        <p className="font-medium text-gray-900 dark:text-white">{item.label}</p>
        <p className="text-sm text-gray-500 dark:text-gray-400">{item.key}</p>
      </div>
      <div className="flex items-center gap-2">
        <input
          type={item.type}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="input w-32"
        />
        <button
          onClick={() => { onUpdate({ key: item.key, value: item.type === 'number' ? Number(value) : value }); setSaving(true); setTimeout(() => setSaving(false), 1000); }}
          disabled={saving || !value}
          className="btn-primary text-sm"
        >
          Save
        </button>
      </div>
    </div>
  );
}

// Import recharts for charts
import { ResponsiveContainer, AreaChart, Area, CartesianGrid, XAxis, YAxis, Tooltip, defs, linearGradient, stop } from 'recharts';
import { PlayCircleIcon } from '@heroicons/react/24/outline';