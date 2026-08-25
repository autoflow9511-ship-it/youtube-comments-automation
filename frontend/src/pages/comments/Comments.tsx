import { useQuery } from '@tanstack/react-query';
import { commentsApi } from '@services/api';
import { LoadingScreen, PageLoading } from '@components/ui/LoadingScreen';
import { formatRelativeTime } from '@utils/format';
import { MagnifyingGlassIcon, FunnelIcon } from '@heroicons/react/24/outline';
import { useState } from 'react';

export function Comments() {
  const { data, isLoading } = useQuery({
    queryKey: ['comments'],
    queryFn: () => commentsApi.getAll(),
  });

  const { data: stats } = useQuery({
    queryKey: ['commentStats'],
    queryFn: () => commentsApi.getStats(),
  });

  const [search, setSearch] = useState('');
  const [filterProcessed, setFilterProcessed] = useState<'all' | 'processed' | 'pending'>('all');

  if (isLoading) return <PageLoading />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Comments</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Manage and monitor YouTube comments</p>
        </div>
      </div>

      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="card p-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">Total Comments</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total.toLocaleString()}</p>
          </div>
          <div className="card p-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">Processed</p>
            <p className="text-2xl font-bold text-green-600">{stats.processed.toLocaleString()}</p>
          </div>
          <div className="card p-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">Pending</p>
            <p className="text-2xl font-bold text-yellow-600">{stats.pending.toLocaleString()}</p>
          </div>
          <div className="card p-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">This Week</p>
            <p className="text-2xl font-bold text-blue-600">{stats.thisWeek.toLocaleString()}</p>
          </div>
        </div>
      )}

      <div className="card overflow-hidden">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1 max-w-md">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search comments..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input pl-10"
            />
          </div>
          <div className="flex items-center gap-2">
            <FunnelIcon className="w-5 h-5 text-gray-400" />
            <select
              value={filterProcessed}
              onChange={(e) => setFilterProcessed(e.target.value as any)}
              className="input py-2"
            >
              <option value="all">All</option>
              <option value="processed">Processed</option>
              <option value="pending">Pending</option>
            </select>
          </div>
        </div>

        {data?.data.length === 0 ? (
          <div className="p-12 text-center text-gray-500 dark:text-gray-400">
            No comments found
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Comment</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Video</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Author</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {data?.data.map((comment) => (
                  <tr key={comment.id}>
                    <td className="px-6 py-4">
                      <div className="max-w-xs truncate text-gray-900 dark:text-white">{comment.text}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900 dark:text-white truncate max-w-xs">{comment.videoTitle || comment.videoId}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        {comment.authorAvatar && <img src={comment.authorAvatar} alt="" className="w-6 h-6 rounded-full" />}
                        <span className="text-sm font-medium text-gray-900 dark:text-white">{comment.authorName}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`badge ${comment.processedAt ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                        {comment.processedAt ? 'Processed' : 'Pending'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">{formatRelativeTime(comment.publishedAt)}</td>
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