import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useAuth } from '@contexts/AuthContext';
import { LoadingScreen } from '@components/ui/LoadingScreen';
import toast from 'react-hot-toast';
import {
  CheckCircleIcon,
  XCircleIcon,
  EnvelopeIcon,
  ArrowRightIcon,
} from '@heroicons/react/24/outline';

interface PublicFormData {
  id: string;
  publicFormId: string;
  title: string;
  description?: string;
  logoUrl?: string;
  heading?: string;
  formDescription?: string;
  emailPlaceholder?: string;
  submitButtonText?: string;
  successMessage?: string;
  errorMessage?: string;
  privacyConsentText?: string;
  privacyPolicyUrl?: string;
  requireConsent: boolean;
}

interface FormState {
  email: string;
  firstName?: string;
  lastName?: string;
  consent?: boolean;
  [key: string]: any;
}

// Inline API call since we don't need auth for public forms
async function fetchPublicForm(publicFormId: string): Promise<PublicFormData> {
  const baseUrl = import.meta.env.VITE_API_URL || '/api/v1';
  const res = await fetch(`${baseUrl}/public-forms/${publicFormId}`);
  if (!res.ok) throw new Error('Form not found');
  return res.json();
}

async function submitPublicForm(publicFormId: string, data: FormState) {
  const baseUrl = import.meta.env.VITE_API_URL || '/api/v1';
  const res = await fetch(`${baseUrl}/public-forms/${publicFormId}/submit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: 'Submission failed' }));
    throw new Error(err.message || 'Submission failed');
  }
  return res.json();
}

export function PublicFormPage() {
  const { publicFormId } = useParams<{ publicFormId: string }>();
  const [formState, setFormState] = useState<FormState>({ email: '' });
  const [submitted, setSubmitted]   = useState(false);
  const [errors, setErrors]         = useState<Record<string, string>>({});

  const { data: form, isLoading, isError } = useQuery<PublicFormData>({
    queryKey: ['publicForm', publicFormId],
    queryFn:  () => fetchPublicForm(publicFormId!),
    enabled:  !!publicFormId,
    retry:    false,
  });

  const submitMutation = useMutation({
    mutationFn: (data: FormState) => submitPublicForm(publicFormId!, data),
    onSuccess: () => {
      setSubmitted(true);
      setFormState({ email: '' });
    },
    onError: (error: any) => {
      setErrors({ submit: error.message || 'Submission failed' });
      toast.error(error.message || 'Submission failed');
    },
  });

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!formState.email) {
      errs.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formState.email)) {
      errs.email = 'Please enter a valid email address';
    }
    if (form?.requireConsent && !formState.consent) {
      errs.consent = 'You must agree to the privacy policy';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    submitMutation.mutate(formState);
  };

  const handleChange = (field: string, value: any) => {
    setFormState(prev => ({ ...prev, [field]: value }));
    setErrors(prev => { const n = { ...prev }; delete n[field]; return n; });
  };

  // ── Loading ──────────────────────────────────────────────
  if (isLoading) return <LoadingScreen />;

  // ── Not found ────────────────────────────────────────────
  if (isError || !form) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-900 px-4">
        <div className="text-center">
          <XCircleIcon className="w-16 h-16 text-error-500 mx-auto mb-4" aria-hidden="true" />
          <h1 className="text-2xl font-bold text-white mb-2">Form Not Found</h1>
          <p className="text-slate-400">This form doesn&apos;t exist or has been unpublished.</p>
        </div>
      </div>
    );
  }

  // ── Success state ─────────────────────────────────────────
  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-900 px-4 py-12">
        <div className="max-w-md w-full card-glass p-8 text-center animate-scale-in">
          <div className="w-16 h-16 rounded-2xl bg-success-500/10 border border-success-500/20 flex items-center justify-center mx-auto mb-4">
            <CheckCircleIcon className="w-8 h-8 text-success-400" aria-hidden="true" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">
            {form.successMessage || 'Thank you!'}
          </h1>
          <p className="text-slate-400 mt-2">
            Check your email — we&apos;ve sent you the content you requested.
          </p>
        </div>
      </div>
    );
  }

  // ── Form ──────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-surface-900 px-4 py-12">
      {/* Background glow */}
      <div className="fixed inset-0 pointer-events-none" aria-hidden="true">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-96 rounded-full bg-primary-600/10 blur-[120px]" />
      </div>

      <div className="relative max-w-md w-full mx-auto">
        {/* Logo */}
        {form.logoUrl && (
          <div className="text-center mb-6">
            <img src={form.logoUrl} alt="Logo" className="h-14 w-auto mx-auto" />
          </div>
        )}

        {/* Card */}
        <div className="card-glass p-6 sm:p-8 animate-fade-up">
          {/* Heading */}
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-white mb-1.5">
              {form.heading || form.title || 'Get Your Content'}
            </h1>
            {form.formDescription && (
              <p className="text-slate-400 text-sm">{form.formDescription}</p>
            )}
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>

            {/* Email */}
            <div>
              <label htmlFor="pub-email" className="label-normal">
                Email Address <span className="text-error-400" aria-hidden="true">*</span>
              </label>
              <div className="input-group">
                <EnvelopeIcon className="input-group-icon" aria-hidden="true" />
                <input
                  id="pub-email"
                  type="email"
                  autoComplete="email"
                  value={formState.email}
                  onChange={e => handleChange('email', e.target.value)}
                  placeholder={form.emailPlaceholder || 'your@email.com'}
                  className={`input pl-10 ${errors.email ? 'input-error' : ''}`}
                  disabled={submitMutation.isPending}
                  required
                  aria-invalid={!!errors.email}
                  aria-describedby={errors.email ? 'email-err' : undefined}
                />
              </div>
              {errors.email && (
                <p id="email-err" className="mt-1.5 text-xs text-error-400" role="alert">
                  {errors.email}
                </p>
              )}
            </div>

            {/* Consent */}
            {form.requireConsent && (
              <label className="flex items-start gap-2.5 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={!!formState.consent}
                  onChange={e => handleChange('consent', e.target.checked)}
                  disabled={submitMutation.isPending}
                  className="mt-0.5 w-4 h-4 rounded border-white/20 bg-white/5 text-primary-500 focus:ring-primary-500/50 cursor-pointer"
                  aria-describedby={errors.consent ? 'consent-err' : undefined}
                />
                <span className="text-xs text-slate-400 leading-relaxed group-hover:text-slate-300 transition-colors">
                  {form.privacyConsentText || 'I agree to receive emails and accept the privacy policy.'}
                  {form.privacyPolicyUrl && (
                    <a
                      href={form.privacyPolicyUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary-400 hover:text-primary-300 ml-1"
                    >
                      Privacy Policy
                    </a>
                  )}
                </span>
              </label>
            )}
            {errors.consent && (
              <p id="consent-err" className="text-xs text-error-400" role="alert">{errors.consent}</p>
            )}

            {/* Submit error */}
            {errors.submit && (
              <p className="text-xs text-error-400 text-center" role="alert">{errors.submit}</p>
            )}

            {/* Submit button */}
            <button
              type="submit"
              disabled={submitMutation.isPending}
              className="btn-primary w-full py-3 group mt-2"
            >
              {submitMutation.isPending ? (
                <span className="flex items-center gap-2">
                  <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                  </svg>
                  Submitting...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  {form.submitButtonText || 'Submit'}
                  <ArrowRightIcon className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" aria-hidden="true" />
                </span>
              )}
            </button>
          </form>
        </div>

        {/* Footer */}
        <p className="mt-6 text-center text-[11px] text-slate-600">
          Powered by YouTube Automation Platform
        </p>
      </div>
    </div>
  );
}
