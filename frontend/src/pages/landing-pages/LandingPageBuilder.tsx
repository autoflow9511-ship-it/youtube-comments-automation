import { useParams, useNavigate } from 'react-router-dom';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { landingPagesApi, channelsApi } from '@services/api';
import { LandingPage } from '@types';
import toast from 'react-hot-toast';
import { LoadingScreen } from '@components/ui/LoadingScreen';
import { ArrowPathIcon, CodeBracketIcon, EyeIcon } from '@heroicons/react/24/outline';

const landingPageSchema = z.object({
  channelId: z.string().optional(),
  name: z.string().min(1, 'Name is required'),
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  htmlContent: z.string().min(1, 'HTML content is required'),
  cssContent: z.string().optional(),
  jsContent: z.string().optional(),
  seoTitle: z.string().optional(),
  seoDescription: z.string().optional(),
  formFields: z.array(z.object({
    name: z.string(),
    label: z.string(),
    type: z.enum(['text', 'email', 'textarea', 'select', 'checkbox']),
    required: z.boolean(),
    options: z.array(z.string()).optional(),
  })).min(1, 'At least one form field is required'),
  settings: z.record(z.any()).optional(),
});

type LandingPageForm = z.infer<typeof landingPageSchema>;

const defaultFields = [
  { name: 'email', label: 'Email Address', type: 'email' as const, required: true },
  { name: 'firstName', label: 'First Name', type: 'text' as const, required: false },
];

const defaultHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{{title}}</title>
  <style>{{css}}</style>
</head>
<body>
  <div class="container">
    <header>
      <h1>{{title}}</h1>
      <p>{{description}}</p>
    </header>
    <main>
      <form id="capture-form" method="POST">
        {{formFields}}
        <button type="submit" class="btn-primary">Submit</button>
      </form>
    </main>
  </div>
  <script>{{js}}</script>
</body>
</html>`;

export function LandingPageBuilder() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEditing = !!id;
  const queryClient = useQueryClient();

  const { data: channels } = useQuery({ queryKey: ['channels'], queryFn: () => channelsApi.getAll() });

  const { data: page, isLoading: loadingPage } = useQuery({
    queryKey: ['landingPage', id],
    queryFn: () => landingPagesApi.getById(id!),
    enabled: isEditing,
  });

  const createMutation = useMutation({
    mutationFn: landingPagesApi.create,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['landingPages'] }); toast.success('Page created!'); navigate('/landing-pages'); },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed to create page'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => landingPagesApi.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['landingPages'] }); toast.success('Page updated!'); navigate('/landing-pages'); },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed to update page'),
  });

  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<LandingPageForm>({
    resolver: zodResolver(landingPageSchema),
    defaultValues: {
      name: '',
      title: '',
      description: '',
      htmlContent: defaultHtml,
      cssContent: '',
      jsContent: '',
      formFields: defaultFields,
      settings: {},
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'formFields' });

  if (isEditing && loadingPage) return <LoadingScreen />;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{isEditing ? 'Edit Landing Page' : 'Create Landing Page'}</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Build custom landing pages to capture emails</p>
        </div>
        <button onClick={() => navigate('/landing-pages')} className="btn-secondary flex items-center gap-2">
          <ArrowPathIcon className="w-5 h-5" /> Back
        </button>
      </div>

      <form onSubmit={handleSubmit(isEditing ? (data) => updateMutation.mutate({ id: id!, data }) : createMutation.mutate)} className="space-y-8">
        <div className="card p-6 space-y-6">
          <h2 className="text-lg font-semibold">Basic Information</h2>
          <div className="space-y-4">
            <div>
              <label className="label">Channel (Optional)</label>
              <select {...register('channelId')} className="input">
                <option value="">None</option>
                {channels?.data.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Page Name</label>
                <input {...register('name')} className="input" placeholder="My Landing Page" />
                {errors.name && <p className="text-sm text-red-600 mt-1">{errors.name.message}</p>}
              </div>
              <div>
                <label className="label">Page Title</label>
                <input {...register('title')} className="input" placeholder="Get Our Free Guide" />
                {errors.title && <p className="text-sm text-red-600 mt-1">{errors.title.message}</p>}
              </div>
            </div>
            <div>
              <label className="label">Description</label>
              <textarea {...register('description')} className="input" rows={2} placeholder="A brief description of what this page offers" />
            </div>
          </div>
        </div>

        <div className="card p-6 space-y-6">
          <h2 className="text-lg font-semibold">Form Fields</h2>
          <p className="text-sm text-gray-500">Define the fields for your email capture form</p>
          <div className="space-y-3">
            {fields.map((field, index) => (
              <div key={field.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">Field #{index + 1}</h4>
                  {fields.length > 1 && <button type="button" onClick={() => remove(index)} className="text-red-500 text-sm">Remove</button>}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="label text-xs">Field Name</label>
                    <input {...register(`formFields.${index}.name`)} className="input" placeholder="email" />
                  </div>
                  <div>
                    <label className="label text-xs">Label</label>
                    <input {...register(`formFields.${index}.label`)} className="input" placeholder="Email Address" />
                  </div>
                  <div>
                    <label className="label text-xs">Type</label>
                    <select {...register(`formFields.${index}.type`)} className="input">
                      <option value="text">Text</option>
                      <option value="email">Email</option>
                      <option value="textarea">Textarea</option>
                      <option value="select">Select</option>
                      <option value="checkbox">Checkbox</option>
                    </select>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" {...register(`formFields.${index}.required`)} className="rounded border-gray-300 text-primary-600" />
                    Required
                  </label>
                  {watch(`formFields.${index}.type`) === 'select' && (
                    <div className="flex-1">
                      <label className="label text-xs">Options (comma separated)</label>
                      <input
                        type="text"
                        value={watch(`formFields.${index}.options`)?.join(', ') || ''}
                        onChange={(e) => setValue(`formFields.${index}.options`, e.target.value.split(',').map(o => o.trim()).filter(Boolean))}
                        className="input"
                        placeholder="Option 1, Option 2, Option 3"
                      />
                    </div>
                  )}
                </div>
              </div>
            ))}
            {fields.length < 10 && <button type="button" onClick={() => append({ name: '', label: '', type: 'text', required: false })} className="btn-secondary text-sm flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
              Add Field
            </button>}
          </div>
          {errors.formFields && <p className="text-sm text-red-600">{errors.formFields.message}</p>}
        </div>

        <div className="card p-6 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Page Content (HTML)</h2>
            <span className="text-xs text-gray-500">Available: {{title}}, {{description}}, {{formFields}}, {{css}}, {{js}}</span>
          </div>
          <div>
            <label className="label">HTML Template</label>
            <textarea
              {...register('htmlContent')}
              className="input font-mono text-sm"
              rows={15}
              spellCheck={false}
            />
            {errors.htmlContent && <p className="text-sm text-red-600 mt-1">{errors.htmlContent.message}</p>}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label">CSS (Optional)</label>
              <textarea {...register('cssContent')} className="input font-mono text-sm" rows={8} spellCheck={false} placeholder=".container { max-width: 600px; margin: 0 auto; }" />
            </div>
            <div>
              <label className="label">JavaScript (Optional)</label>
              <textarea {...register('jsContent')} className="input font-mono text-sm" rows={8} spellCheck={false} placeholder="document.getElementById('capture-form').addEventListener('submit', ...)" />
            </div>
          </div>
        </div>

        <div className="card p-6 space-y-4">
          <h2 className="text-lg font-semibold">SEO Settings</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label">SEO Title</label>
              <input {...register('seoTitle')} className="input" placeholder="Page title for search engines" />
            </div>
            <div>
              <label className="label">SEO Description</label>
              <textarea {...register('seoDescription')} className="input" rows={2} placeholder="Description for search engines" />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-4">
          <button type="button" onClick={() => navigate('/landing-pages')} className="btn-secondary">Cancel</button>
          <button type="submit" disabled={createMutation.isPending || updateMutation.isPending} className="btn-primary">
            {isEditing ? 'Update Page' : 'Create Page'}
          </button>
        </div>
      </form>
    </div>
  );
}