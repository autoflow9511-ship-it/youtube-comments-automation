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
  UserIcon,
  ArrowRightIcon,
  EyeIcon,
  EyeSlashIcon,
  CheckIcon,
} from '@heroicons/react/24/outline';

const registerSchema = z.object({
  firstName:       z.string().min(1, 'First name is required').max(50).optional(),
  lastName:        z.string().min(1, 'Last name is required').max(50).optional(),
  email:           z.string().email('Invalid email address'),
  password:        z.string().min(8, 'At least 8 characters'),
  confirmPassword: z.string(),
}).refine(d => d.password === d.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

type RegisterForm = z.infer<typeof registerSchema>;

const GoogleIcon = () => (
  <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" aria-hidden="true">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
  </svg>
);

// Password strength rules
const strengthRules = [
  { label: '8+ characters',   test: (p: string) => p.length >= 8 },
  { label: 'Uppercase',        test: (p: string) => /[A-Z]/.test(p) },
  { label: 'Number',           test: (p: string) => /[0-9]/.test(p) },
  { label: 'Special character',test: (p: string) => /[^A-Za-z0-9]/.test(p) },
];

const strengthLabel = ['', 'Weak', 'Fair', 'Good', 'Strong'];
const strengthColor  = ['', 'bg-error-500', 'bg-warning-400', 'bg-accent-400', 'bg-success-400'];

export function Register() {
  const navigate      = useNavigate();
  const { register: registerUser } = useAuth();
  const [isLoading, setIsLoading]     = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [password, setPassword]       = useState('');

  const { register, handleSubmit, watch, formState: { errors } } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
  });

  const watchedPassword = watch('password', '');
  const passedRules = strengthRules.filter(r => r.test(watchedPassword)).length;

  const onSubmit = async (data: RegisterForm) => {
    setIsLoading(true);
    try {
      await registerUser({
        email:     data.email,
        password:  data.password,
        firstName: data.firstName,
        lastName:  data.lastName,
      });
      toast.success('Account created! Welcome aboard.');
      navigate('/dashboard');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Registration failed');
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
        <h2 className="text-xl font-bold text-white">Create account</h2>
        <p className="text-sm text-slate-500 mt-1">Start automating your YouTube channel</p>
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
        or register with email
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>

        {/* Name row */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="firstName" className="label-normal">First name</label>
            <div className="input-group">
              <UserIcon className="input-group-icon" aria-hidden="true" />
              <input
                id="firstName"
                type="text"
                autoComplete="given-name"
                {...register('firstName')}
                className="input pl-10"
                placeholder="John"
              />
            </div>
          </div>
          <div>
            <label htmlFor="lastName" className="label-normal">Last name</label>
            <input
              id="lastName"
              type="text"
              autoComplete="family-name"
              {...register('lastName')}
              className="input"
              placeholder="Doe"
            />
          </div>
        </div>

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
              aria-describedby={errors.email ? 'reg-email-error' : undefined}
            />
          </div>
          {errors.email && (
            <p id="reg-email-error" className="mt-1.5 text-xs text-error-400" role="alert">
              {errors.email.message}
            </p>
          )}
        </div>

        {/* Password */}
        <div>
          <label htmlFor="reg-password" className="label-normal">Password</label>
          <div className="input-group">
            <LockClosedIcon className="input-group-icon" aria-hidden="true" />
            <input
              id="reg-password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              {...register('password')}
              className={`input pl-10 pr-10 ${errors.password ? 'input-error' : ''}`}
              placeholder="••••••••"
              aria-invalid={!!errors.password}
              aria-describedby="password-strength"
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
            <p className="mt-1.5 text-xs text-error-400" role="alert">{errors.password.message}</p>
          )}

          {/* Strength meter */}
          {watchedPassword && (
            <div id="password-strength" className="mt-2 space-y-1.5" aria-live="polite">
              {/* Bar */}
              <div className="flex gap-1" role="progressbar" aria-valuenow={passedRules} aria-valuemin={0} aria-valuemax={4} aria-label={`Password strength: ${strengthLabel[passedRules]}`}>
                {[1,2,3,4].map(i => (
                  <div
                    key={i}
                    className={`flex-1 h-1 rounded-full transition-all duration-300 ${
                      i <= passedRules ? strengthColor[passedRules] : 'bg-white/10'
                    }`}
                  />
                ))}
              </div>
              {/* Label + rules */}
              <div className="flex items-center justify-between">
                <p className={`text-[11px] font-medium ${
                  passedRules <= 1 ? 'text-error-400'
                  : passedRules === 2 ? 'text-warning-400'
                  : passedRules === 3 ? 'text-accent-400'
                  : 'text-success-400'
                }`}>
                  {strengthLabel[passedRules] || 'Too short'}
                </p>
                <div className="flex gap-2">
                  {strengthRules.map(rule => (
                    <span
                      key={rule.label}
                      title={rule.label}
                      className={`w-1.5 h-1.5 rounded-full transition-colors ${
                        rule.test(watchedPassword) ? 'bg-success-400' : 'bg-white/10'
                      }`}
                      aria-hidden="true"
                    />
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Confirm password */}
        <div>
          <label htmlFor="confirmPassword" className="label-normal">Confirm password</label>
          <div className="input-group">
            <LockClosedIcon className="input-group-icon" aria-hidden="true" />
            <input
              id="confirmPassword"
              type="password"
              autoComplete="new-password"
              {...register('confirmPassword')}
              className={`input pl-10 ${errors.confirmPassword ? 'input-error' : ''}`}
              placeholder="••••••••"
              aria-invalid={!!errors.confirmPassword}
              aria-describedby={errors.confirmPassword ? 'confirm-error' : undefined}
            />
          </div>
          {errors.confirmPassword && (
            <p id="confirm-error" className="mt-1.5 text-xs text-error-400" role="alert">
              {errors.confirmPassword.message}
            </p>
          )}
        </div>

        {/* Terms */}
        <label className="flex items-start gap-2.5 cursor-pointer group">
          <input
            type="checkbox"
            required
            className="mt-0.5 w-4 h-4 rounded border-white/20 bg-white/5 text-primary-500 focus:ring-primary-500/50 cursor-pointer"
          />
          <span className="text-xs text-slate-500 leading-relaxed group-hover:text-slate-400 transition-colors">
            I agree to the{' '}
            <Link to="/terms" className="text-primary-400 hover:text-primary-300">Terms of Service</Link>
            {' '}and{' '}
            <Link to="/privacy" className="text-primary-400 hover:text-primary-300">Privacy Policy</Link>
          </span>
        </label>

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
              Creating account...
            </span>
          ) : (
            <span className="flex items-center gap-2">
              Create account
              <ArrowRightIcon className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" aria-hidden="true" />
            </span>
          )}
        </button>
      </form>

      {/* Login link */}
      <p className="text-center text-sm text-slate-500">
        Already have an account?{' '}
        <Link to="/login" className="text-primary-400 hover:text-primary-300 font-medium transition-colors">
          Sign in
        </Link>
      </p>
    </div>
  );
}
