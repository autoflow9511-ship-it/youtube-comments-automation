import { useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { landingPagesApi } from '@services/api';
import { LandingPage } from '@types';
import { LoadingScreen } from '@components/ui/LoadingScreen';
import toast from 'react-hot-toast';
import { CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/outline';
import { format } from 'date-fns';

interface FormData {
  email: string;
  firstName?: string;
  lastName?: string;
  [key: string]: any;
}

export function LandingPagePublic() {
  const { slug } = useParams<{ slug: string }>();
  const queryClient = useQueryClient();
  const [page, setPage] = useState<LandingPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState<FormData>({ email: '' });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const submitMutation = useMutation({
    mutationFn: (data: { landingPageId: string; formData: FormData }) =>
      landingPagesApi.submitForm(data.landingPageId, data.formData),
    onSuccess: () => {
      setSubmitted(true);
      setFormData({ email: '' });
      toast.success('Thanks for subscribing!');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Submission failed');
    },
  });

  useEffect(() => {
    const fetchPage = async () => {
      try {
        const response = await fetch(`${import.meta.env.VITE_API_URL || '/api/v1'}/lp/${slug}/public`);
        if (!response.ok) throw new Error('Page not found');
        const data = await response.json();
        setPage(data);
      } catch (error) {
        console.error('Failed to load landing page', error);
      } finally {
        setLoading(false);
      }
    };
    fetchPage();
  }, [slug]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email format';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    setSubmitting(true);
    submitMutation.mutate({ landingPageId: page!.id, formData });
  };

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setErrors(prev => ({ ...prev, [field]: '' }));
  };

  if (loading) return <LoadingScreen />;
  if (!page) return <NotFound />;

  const renderedHtml = page.htmlContent
    .replace(/\{\{title\}\}/g, page.title)
    .replace(/\{\{description\}\}/g, page.description || '')
    .replace(/\{\{formFields\}\}/g, renderFormFields(page.formFields))
    .replace(/\{\{css\}\}/g, page.cssContent || '')
    .replace(/\{\{js\}\}/g, page.jsContent || '');

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div
        className="prose dark:prose-invert max-w-none mx-auto p-4 md:p-8"
        dangerouslySetInnerHTML={{ __html: renderedHtml }}
      />
      <style dangerouslySetInnerHTML={{ __html: `
        .landing-form { display: flex; flex-direction: column; gap: 1rem; max-width: 500px; margin: 2rem auto; }
        .landing-form input, .landing-form textarea, .landing-form select { width: 100%; padding: 0.75rem; border: 1px solid #d1d5db; border-radius: 0.5rem; font-size: 1rem; }
        .landing-form input:focus, .landing-form textarea:focus, .landing-form select:focus { outline: none; border-color: #0ea5e9; box-shadow: 0 0 0 3px rgba(14, 165, 233, 0.1); }
        .landing-form button { padding: 0.75rem 1.5rem; background: #0ea5e9; color: white; border: none; border-radius: 0.5rem; font-weight: 500; cursor: pointer; }
        .landing-form button:hover { background: #0284c7; }
        .landing-form button:disabled { opacity: 0.6; cursor: not-allowed; }
        .form-error { color: #ef4444; font-size: 0.875rem; }
        .success-message { text-align: center; padding: 2rem; background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 0.5rem; }
        .success-message h3 { color: #166534; font-size: 1.25rem; margin-bottom: 0.5rem; }
        .success-message p { color: #166534; }
      `}} />
    </div>
  );
}

function renderFormFields(fields: any[]): string {
  return fields.map((field, index) => `
    <div class="form-field">
      <label for="field-${index}" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
        ${field.label} ${field.required ? '<span class="text-red-500">*</span>' : ''}
      </label>
      ${field.type === 'textarea' 
        ? `<textarea id="field-${index}" name="${field.name}" rows="3" ${field.required ? 'required' : ''}></textarea>`
        : field.type === 'select' && field.options
        ? `<select id="field-${index}" name="${field.name}" ${field.required ? 'required' : ''}>
            ${field.options.map((opt: string) => `<option value="${opt}">${opt}</option>`).join('')}
           </select>`
        : `<input type="${field.type}" id="field-${index}" name="${field.name}" ${field.required ? 'required' : ''} placeholder="${field.label}">`
      }
    </div>
  `).join('');
}

function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">404</h1>
        <p className="text-gray-500 dark:text-gray-400 mb-6">Landing page not found</p>
        <p className="text-sm text-gray-400">The page you're looking for doesn't exist or has been unpublished.</p>
      </div>
    </div>
  );
}