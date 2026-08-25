import { useQuery } from '@tanstack/react-query';
import { emailsApi } from '@services/api';
import { LoadingScreen, PageLoading } from '@components/ui/LoadingScreen';
import { formatRelativeTime } from '@utils/format';
import { MagnifyingGlassIcon, ArrowDownTrayIcon } from '@heroicons/react/24/outline';
import { useState } from 'react';

export function EmailCaptures() {
  const { data, isLoading } = useQuery({
    queryKey: ['emailCaptures'],
    queryFn: () => emailsApi.getCaptures(),
  });

  const [search, setSearch] = useState('');

  if (isLoading) return <PageLoading />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Email Captures</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">View and manage captured email leads</p>
        </div>
        <button className="btn-secondary flex items-center gap-2">
          <ArrowDownTrayIcon className="w-5 h-5" />
          Export CSV
        </button>
      </div>

      <div className="card overflow-hidden">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="relative max-w-md">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search emails..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input pl-10"
            />
          </div>
        </div>

        {data?.data.length === 0 ? (
          <div className="p-12 text-center text-gray-500 dark:text-gray-400">
            No email captures yet
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Email</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Source</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Channel</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {data?.data.map((capture) => (
                  <tr key={capture.id}>
                    <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">{capture.email}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {capture.firstName || ''} {capture.lastName || ''}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 capitalize">{capture.source}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{capture.channel?.title || '-'}</td>
                    <td className="px-6 py-4">
                      <span className={`badge ${capture.isVerified ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                        {capture.isVerified ? 'Verified' : 'Unverified'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">{formatRelativeTime(capture.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}