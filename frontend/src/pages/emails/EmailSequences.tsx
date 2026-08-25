import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { emailsApi } from '@services/api';
import { EmailSequence, EmailSequenceStep } from '@types';
import { LoadingScreen, PageLoading } from '@components/ui/LoadingScreen';
import toast from 'react-hot-toast';
import { PlusIcon, PencilIcon, TrashIcon, PlayIcon, PauseIcon, DocumentDuplicateIcon } from '@heroicons/react/24/outline';
import { useState } from 'react';
import { Link } from 'react-router-dom';

export function EmailSequences() {
  const queryClient = useQueryClient();
  const [showCreateModal, setShowCreateModal] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['emailSequences'],
    queryFn: () => emailsApi.getSequences(),
  });

  const createMutation = useMutation({
    mutationFn: emailsApi.createSequence,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['emailSequences'] });
      toast.success('Sequence created!');
      setShowCreateModal(false);
    },
    onError: (error: any) => toast.error(error.response?.data?.message || 'Failed to create sequence'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => emailsApi.updateSequence(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['emailSequences'] });
      toast.success('Sequence updated!');
      setShowCreateModal(false);
    },
    onError: (error: any) => toast.error(error.response?.data?.message || 'Failed to update sequence'),
  });

  const deleteMutation = useMutation({
    mutationFn: emailsApi.deleteSequence,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['emailSequences'] });
      toast.success('Sequence deleted');
    },
    onError: () => toast.error('Failed to delete sequence'),
  });

  if (isLoading) return <PageLoading />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Email Sequences</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Automated email follow-up sequences</p>
        </div>
        <button onClick={() => setShowCreateModal(true)} className="btn-primary flex items-center gap-2">
          <PlusIcon className="w-5 h-5" />
          Create Sequence
        </button>
      </div>

      {data?.data.length === 0 ? (
        <div className="card p-12 text-center">
          <svg className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No email sequences</h3>
          <p className="text-gray-500 dark:text-gray-400 mb-6">Create automated email sequences to nurture your leads</p>
          <button onClick={() => setShowCreateModal(true)} className="btn-primary">Create Sequence</button>
        </div>
      ) : (
        <div className="space-y-4">
          {data?.data.map((sequence: EmailSequence) => (
            <div key={sequence.id} className="card p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-semibold text-gray-900 dark:text-white">{sequence.name}</h3>
                    <span className={`badge ${sequence.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                      {sequence.isActive ? 'Active' : 'Draft'}
                    </span>
                  </div>
                  <p className="text-gray-500 dark:text-gray-400 text-sm mb-3">{sequence.description || 'No description'}</p>
                  <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                    <span>{sequence.steps.length} step(s)</span>
                    <span>Trigger: {sequence.triggerType}</span>
                    <span>Enrolled: {sequence._count?.enrollments || 0}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Link to={`/emails/sequences/${sequence.id}`} className="btn-secondary text-sm">
                    <PencilIcon className="w-4 h-4" />
                  </Link>
                  <button onClick={() => deleteMutation.mutate(sequence.id)} className="btn-danger text-sm">
                    <TrashIcon className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showCreateModal && (
        <SequenceModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onSubmit={createMutation.mutate}
          isLoading={createMutation.isPending}
        />
      )}
    </div>
  );
}

function SequenceModal({
  isOpen,
  onClose,
  onSubmit,
  isLoading,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
  isLoading: boolean;
}) {
  const [steps, setSteps] = useState<Array<{ order: number; delayHours: number; delayDays: number; subject: string; htmlContent: string; textContent: string }>>([
    { order: 0, delayHours: 0, delayDays: 0, subject: '', htmlContent: '', textContent: '' },
  ]);

  const addStep = () => setSteps([...steps, { order: steps.length, delayHours: 0, delayDays: 0, subject: '', htmlContent: '', textContent: '' }]);
  const removeStep = (index: number) => setSteps(steps.filter((_, i) => i !== index));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <h2 className="text-xl font-semibold">Create Email Sequence</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">×</button>
        </div>
        <form onSubmit={(e) => { e.preventDefault(); onSubmit({ name: '', description: '', triggerType: 'immediate', triggerConfig: {}, steps }); }} className="p-6 space-y-6">
          <div>
            <label className="label">Sequence Name</label>
            <input type="text" className="input" placeholder="Welcome Sequence" required />
          </div>
          <div>
            <label className="label">Description</label>
            <textarea className="input" rows={2} placeholder="Automated welcome emails for new subscribers" />
          </div>
          <div>
            <label className="label">Steps</label>
            <div className="space-y-4">
              {steps.map((step, index) => (
                <div key={index} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">Step #{index + 1}</h4>
                    {steps.length > 1 && <button type="button" onClick={() => removeStep(index)} className="text-red-500">Remove</button>}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="label text-xs">Delay (hours)</label>
                      <input type="number" value={step.delayHours} onChange={(e) => { const s = [...steps]; s[index] = { ...s[index], delayHours: Number(e.target.value) }; setSteps(s); }} className="input" min="0" />
                    </div>
                    <div>
                      <label className="label text-xs">Delay (days)</label>
                      <input type="number" value={step.delayDays} onChange={(e) => { const s = [...steps]; s[index] = { ...s[index], delayDays: Number(e.target.value) }; setSteps(s); }} className="input" min="0" />
                    </div>
                  </div>
                  <div>
                    <label className="label text-xs">Subject</label>
                    <input type="text" value={step.subject} onChange={(e) => { const s = [...steps]; s[index] = { ...s[index], subject: e.target.value }; setSteps(s); }} className="input" placeholder="Welcome to our community!" />
                  </div>
                  <div>
                    <label className="label text-xs">HTML Content</label>
                    <textarea value={step.htmlContent} onChange={(e) => { const s = [...steps]; s[index] = { ...s[index], htmlContent: e.target.value }; setSteps(s); }} className="input" rows={3} placeholder="<p>Hi {{firstName}},</p><p>Thanks for joining!</p>" />
                  </div>
                  <div>
                    <label className="label text-xs">Text Content (optional)</label>
                    <textarea value={step.textContent} onChange={(e) => { const s = [...steps]; s[index] = { ...s[index], textContent: e.target.value }; setSteps(s); }} className="input" rows={2} placeholder="Hi {{firstName}},\n\nThanks for joining!" />
                  </div>
                </div>
              ))}
              {steps.length < 10 && <button type="button" onClick={addStep} className="btn-secondary text-sm">+ Add Step</button>}
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t">
            <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={isLoading} className="btn-primary">
              {isLoading ? 'Creating...' : 'Create Sequence'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}