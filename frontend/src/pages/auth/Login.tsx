import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '@contexts/AuthContext';
import toast from 'react-hot-toast';
import {
  EnvelopeIcon,
  LockClosedIcon,
  ArrowRightIcon,
  EyeIcon,
  EyeSlashIcon,
} from '@heroicons/react/24/outline';

const loginSchema = z.object({
  email:    z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

type LoginForm = z.infer<typeof loginSchema>;

const GoogleIcon = () => (
  <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" aria-hidden="true">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
  </svg>
);

export function Login() {
  const navigate  = useNavigate();
  const { login } = useAuth();
  const [isLoading, setIsLoading]     = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginForm) => {
    setIsLoading(true);
    try {
      await login(data.email, data.password);
      toast.success('Welcome back!');
      navigate('/dashboard');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Invalid credentials');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    window.location.href = `${import.meta.env.VITE_API_URL || '/api/v1'}/auth/google`;
  };

  return (
    <div className="space-y-5">
      {/* Heading */}
      <div className="text-center mb-6">
        <h2 className="text-xl font-bold text-white">Welcome back</h2>
        <p className="text-sm text-slate-500 mt-1">Sign in to your account</p>
      </div>

      {/* Google OAuth */}
      <button
        type="button"
        onClick={handleGoogleLogin}
        className="btn-secondary w-full gap-2.5 py-2.5 justify-center"
      >
        <GoogleIcon />
        <span>Continue with Google</span>
      </button>

      {/* Divider */}
      <div className="divider-text text-[11px] text-slate-600">
        or sign in with email
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        {/* Email */}
        <div>
          <label htmlFor="email" className="label-normal">Email</label>
          <div className="input-group">
            <EnvelopeIcon className="input-group-icon" aria-hidden="true" />
            <input
              id="email"
              type="email"
              autoComplete="email"
              {...register('email')}
              className={`input pl-10 ${errors.email ? 'input-error' : ''}`}
              placeholder="you@example.com"
              aria-invalid={!!errors.email}
              aria-describedby={errors.email ? 'email-error' : undefined}
            />
          </div>
          {errors.email && (
            <p id="email-error" className="mt-1.5 text-xs text-error-400" role="alert">
              {errors.email.message}
            </p>
          )}
        </div>

        {/* Password */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label htmlFor="password" className="label-normal mb-0">Password</label>
            <Link
              to="/forgot-password"
              className="text-xs text-primary-400 hover:text-primary-300 transition-colors"
            >
              Forgot password?
            </Link>
          </div>
          <div className="input-group">
            <LockClosedIcon className="input-group-icon" aria-hidden="true" />
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              {...register('password')}
              className={`input pl-10 pr-10 ${errors.password ? 'input-error' : ''}`}
              placeholder="••••••••"
              aria-invalid={!!errors.password}
              aria-describedby={errors.password ? 'password-error' : undefined}
            />
            <button
              type="button"
              onClick={() => setShowPassword(s => !s)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword
                ? <EyeSlashIcon className="w-4 h-4" />
                : <EyeIcon className="w-4 h-4" />}
            </button>
          </div>
          {errors.password && (
            <p id="password-error" className="mt-1.5 text-xs text-error-400" role="alert">
              {errors.password.message}
            </p>
          )}
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={isLoading}
          className="btn-primary w-full py-2.5 mt-2 group"
        >
          {isLoading ? (
            <span className="flex items-center gap-2">
              <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
              </svg>
              Signing in...
            </span>
          ) : (
            <span className="flex items-center gap-2">
              Sign in
              <ArrowRightIcon className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" aria-hidden="true" />
            </span>
          )}
        </button>
      </form>

      {/* Register link */}
      <p className="text-center text-sm text-slate-500">
        Don&apos;t have an account?{' '}
        <Link to="/register" className="text-primary-400 hover:text-primary-300 font-medium transition-colors">
          Create account
        </Link>
      </p>
    </div>
  );
}
