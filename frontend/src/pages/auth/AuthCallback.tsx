import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@contexts/AuthContext';
import toast from 'react-hot-toast';
import { LoadingScreen } from '@components/ui/LoadingScreen';

export function AuthCallback() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { googleLogin } = useAuth();

  useEffect(() => {
    const handleCallback = async () => {
      const code = searchParams.get('code');
      const state = searchParams.get('state');
      const error = searchParams.get('error');

      if (error) {
        toast.error('Google authentication failed');
        navigate('/login');
        return;
      }

      if (!code) {
        toast.error('No authorization code received');
        navigate('/login');
        return;
      }

      try {
        // Exchange code for tokens via backend
        const response = await fetch(`${import.meta.env.VITE_API_URL || '/api/v1'}/auth/google/callback`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ code, state }),
        });

        if (!response.ok) throw new Error('Authentication failed');

        const data = await response.json();
        
        localStorage.setItem('accessToken', data.accessToken);
        localStorage.setItem('refreshToken', data.refreshToken);
        
        await googleLogin(data);
        toast.success('Successfully connected with Google!');
        navigate('/dashboard');
      } catch {
        toast.error('Failed to authenticate with Google');
        navigate('/login');
      }
    };

    handleCallback();
  }, [searchParams, navigate, googleLogin]);

  return <LoadingScreen />;
}