import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '@contexts/AuthContext';
import { authApi } from '@services/api';
import { User } from '@types';
import toast from 'react-hot-toast';
import { ButtonLoading } from '@components/ui/LoadingScreen';
import { UserCircleIcon, LockClosedIcon, BellIcon, ShieldCheckIcon } from '@heroicons/react/24/outline';

const profileSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(50),
  lastName: z.string().min(1, 'Last name is required').max(50),
});

const passwordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string(),
}).refine(data => data.newPassword === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

type ProfileForm = z.infer<typeof profileSchema>;
type PasswordForm = z.infer<typeof passwordSchema>;

export function Settings() {
  const { user, updateUser, refreshUser } = useAuth();
  const [activeTab, setActiveTab] = useState<'profile' | 'password' | 'notifications' | 'security'>('profile');
  const [isLoading, setIsLoading] = useState(false);

  const profileForm = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      firstName: user?.firstName || '',
      lastName: user?.lastName || '',
    },
  });

  const passwordForm = useForm<PasswordForm>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
  });

  const handleProfileSubmit = async (data: ProfileForm) => {
    setIsLoading(true);
    try {
      await authApi.updateProfile(data);
      updateUser(data);
      toast.success('Profile updated successfully!');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to update profile');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordSubmit = async (data: PasswordForm) => {
    setIsLoading(true);
    try {
      await authApi.changePassword({ currentPassword: data.currentPassword, newPassword: data.newPassword });
      toast.success('Password changed successfully!');
      passwordForm.reset();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to change password');
    } finally {
      setIsLoading(false);
    }
  };

  const tabs = [
    { id: 'profile', label: 'Profile', icon: UserCircleIcon },
    { id: 'password', label: 'Password', icon: LockClosedIcon },
    { id: 'notifications', label: 'Notifications', icon: BellIcon },
    { id: 'security', label: 'Security', icon: ShieldCheckIcon },
  ];

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Settings</h1>

      <div className="card overflow-hidden">
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

        <div className="p-6">
          {activeTab === 'profile' && (
            <form onSubmit={profileForm.handleSubmit(handleProfileSubmit)} className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">First Name</label>
                  <input {...profileForm.register('firstName')} className="input" />
                  {profileForm.formState.errors.firstName && <p className="text-sm text-red-600 mt-1">{profileForm.formState.errors.firstName.message}</p>}
                </div>
                <div>
                  <label className="label">Last Name</label>
                  <input {...profileForm.register('lastName')} className="input" />
                  {profileForm.formState.errors.lastName && <p className="text-sm text-red-600 mt-1">{profileForm.formState.errors.lastName.message}</p>}
                </div>
              </div>
              <div>
                <label className="label">Email</label>
                <input type="email" value={user?.email || ''} className="input bg-gray-100 dark:bg-gray-800" disabled />
                <p className="text-sm text-gray-500 mt-1">Email cannot be changed</p>
              </div>
              <div>
                <label className="label">Subscription Tier</label>
                <input type="text" value={user?.subscriptionTier || 'FREE'} className="input bg-gray-100 dark:bg-gray-800" disabled />
              </div>
              <button type="submit" disabled={isLoading} className="btn-primary flex items-center gap-2">
                {isLoading && <ButtonLoading />}
                Save Changes
              </button>
            </form>
          )}

          {activeTab === 'password' && (
            <form onSubmit={passwordForm.handleSubmit(handlePasswordSubmit)} className="space-y-6 max-w-md">
              <div>
                <label className="label">Current Password</label>
                <input type="password" {...passwordForm.register('currentPassword')} className="input" />
                {passwordForm.formState.errors.currentPassword && <p className="text-sm text-red-600 mt-1">{passwordForm.formState.errors.currentPassword.message}</p>}
              </div>
              <div>
                <label className="label">New Password</label>
                <input type="password" {...passwordForm.register('newPassword')} className="input" />
                {passwordForm.formState.errors.newPassword && <p className="text-sm text-red-600 mt-1">{passwordForm.formState.errors.newPassword.message}</p>}
              </div>
              <div>
                <label className="label">Confirm New Password</label>
                <input type="password" {...passwordForm.register('confirmPassword')} className="input" />
                {passwordForm.formState.errors.confirmPassword && <p className="text-sm text-red-600 mt-1">{passwordForm.formState.errors.confirmPassword.message}</p>}
              </div>
              <button type="submit" disabled={isLoading} className="btn-primary flex items-center gap-2">
                {isLoading && <ButtonLoading />}
                Change Password
              </button>
            </form>
          )}

          {activeTab === 'notifications' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium">Email Notifications</h3>
                  <p className="text-sm text-gray-500">Receive email updates about your automations</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" defaultChecked />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 dark:peer-focus:ring-primary-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary-600"></div>
                </label>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium">Automation Alerts</h3>
                  <p className="text-sm text-gray-500">Get notified when automations fail</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" defaultChecked />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 dark:peer-focus:ring-primary-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary-600"></div>
                </label>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium">Weekly Reports</h3>
                  <p className="text-sm text-gray-500">Receive weekly performance summary</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 dark:peer-focus:ring-primary-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary-600"></div>
                </label>
              </div>
            </div>
          )}

          {activeTab === 'security' && (
            <div className="space-y-6">
              <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <h3 className="font-medium mb-2">Two-Factor Authentication</h3>
                <p className="text-sm text-gray-500 mb-4">Add an extra layer of security to your account</p>
                <button className="btn-secondary">Enable 2FA</button>
              </div>
              <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <h3 className="font-medium mb-2">Active Sessions</h3>
                <p className="text-sm text-gray-500 mb-4">Manage your active login sessions</p>
                <button className="btn-secondary">View Sessions</button>
              </div>
              <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <h3 className="font-medium text-red-800 dark:text-red-200 mb-2">Danger Zone</h3>
                <p className="text-sm text-red-600 dark:text-red-400 mb-4">Once you delete your account, there is no going back. Please be certain.</p>
                <button className="btn-danger">Delete Account</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}