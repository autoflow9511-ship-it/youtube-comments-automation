import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { landingPagesApi } from '@services/api';
import { LandingPage, LandingPageStatus } from '@types';
import { LoadingScreen, PageLoading } from '@components/ui/LoadingScreen';
import toast from 'react-hot-toast';
import { PlusIcon, PencilIcon, TrashIcon, EyeIcon, GlobeAltIcon, DocumentDuplicateIcon } from '@heroicons/react/24/outline';
import { useState } from 'react';
import { Link } from 'react-router-dom';

const statusConfig: Record<LandingPageStatus, { label: string; color: string }> = {
  DRAFT: { label: 'Draft', color: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200' },
  PUBLISHED: { label: 'Published', color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' },
  ARCHIVED: { label: 'Archived', color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' },
};

export function LandingPages() {
  const queryClient = useQueryClient();
  const [showCreateModal, setShowCreateModal] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['landingPages'],
    queryFn: () => landingPagesApi.getAll(),
  });

  const publishMutation = useMutation({
    mutationFn: landingPagesApi.publish,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['landingPages'] });
      toast.success('Page published!');
    },
    onError: () => toast.error('Failed to publish'),
  });

  const unpublishMutation = useMutation({
    mutationFn: landingPagesApi.unpublish,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['landingPages'] });
      toast.success('Page unpublished');
    },
    onError: () => toast.error('Failed to unpublish'),
  });

  const deleteMutation = useMutation({
    mutationFn: landingPagesApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['landingPages'] });
      toast.success('Page deleted');
    },
    onError: () => toast.error('Failed to delete page'),
  });

  if (isLoading) return <PageLoading />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Landing Pages</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Create pages to capture emails from YouTube comments</p>
        </div>
        <Link to="/landing-pages/new" className="btn-primary flex items-center gap-2">
          <PlusIcon className="w-5 h-5" />
          Create Page
        </Link>
      </div>

      {data?.data.length === 0 ? (
        <div className="card p-12 text-center">
          <svg className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
          </svg>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No landing pages</h3>
          <p className="text-gray-500 dark:text-gray-400 mb-6">Create landing pages to capture emails from your YouTube audience</p>
          <Link to="/landing-pages/new" className="btn-primary">Create Landing Page</Link>
        </div>
      ) : (
        <div className="space-y-4">
          {data?.data.map((page: LandingPage) => {
            const status = statusConfig[page.status];
            return (
              <div key={page.id} className="card p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold text-gray-900 dark:text-white">{page.name}</h3>
                      <span className={`badge ${status.color}`}>{status.label}</span>
                    </div>
                    <p className="text-gray-500 dark:text-gray-400 text-sm mb-3">{page.description || 'No description'}</p>
                    <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                      <span>Submissions: {page._count?.submissions || 0}</span>
                      {page.publishUrl && <span>Live: {page.publishUrl}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Link to={`/landing-pages/${page.id}/edit`} className="btn-secondary text-sm">
                      <PencilIcon className="w-4 h-4" />
                    </Link>
                    {page.status === 'PUBLISHED' && (
                      <a href={page.publishUrl!} target="_blank" rel="noopener noreferrer" className="btn-secondary text-sm">
                        <EyeIcon className="w-4 h-4" />
                      </a>
                    )}
                    {page.status === 'DRAFT' ? (
                      <button onClick={() => publishMutation.mutate(page.id)} disabled={publishMutation.isPending} className="btn-primary text-sm">
                        <GlobeAltIcon className="w-4 h-4" /> Publish
                      </button>
                    ) : (
                      <button onClick={() => unpublishMutation.mutate(page.id)} disabled={unpublishMutation.isPending} className="btn-secondary text-sm">
                        Unpublish
                      </button>
                    )}
                    <button onClick={() => deleteMutation.mutate(page.id)} disabled={deleteMutation.isPending} className="btn-danger text-sm">
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