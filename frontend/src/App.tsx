import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '@contexts/AuthContext';
import { DashboardLayout } from '@layouts/DashboardLayout';
import { AuthLayout } from '@layouts/AuthLayout';
import { Login } from '@pages/auth/Login';
import { Register } from '@pages/auth/Register';
import { AuthCallback } from '@pages/auth/AuthCallback';
import { Dashboard } from '@pages/dashboard/Dashboard';
import { Channels } from '@pages/channels/Channels';
import { ChannelDetail } from '@pages/channels/ChannelDetail';
import { Automations } from '@pages/automations/Automations';
import { AutomationBuilder } from '@pages/automations/AutomationBuilder';
import { AutomationDetail } from '@pages/automations/AutomationDetail';
import { ExecutionDetail } from '@pages/automations/ExecutionDetail';
import { Comments } from '@pages/comments/Comments';
import { EmailCaptures } from '@pages/emails/EmailCaptures';
import { EmailSequences } from '@pages/emails/EmailSequences';
import { LandingPages } from '@pages/landing-pages/LandingPages';
import { LandingPageBuilder } from '@pages/landing-pages/LandingPageBuilder';
import { LandingPagePublic } from '@pages/landing-pages/LandingPagePublic';
import { Analytics } from '@pages/analytics/Analytics';
import { Settings } from '@pages/settings/Settings';
import { AdminPanel } from '@pages/admin/AdminPanel';
import { LoadingScreen } from '@components/ui/LoadingScreen';

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <LoadingScreen />;
  }

  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <LoadingScreen />;
  }

  return isAuthenticated ? <Navigate to="/dashboard" replace /> : <>{children}</>;
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <LoadingScreen />;
  }

  return user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN' ? (
    <>{children}</>
  ) : (
    <Navigate to="/dashboard" replace />
  );
}

function App() {
  return (
    <Routes>
<Route path="/lp/:slug" element={<LandingPagePublic />} />
      
       
       <Route element={<AuthLayout />}>
        <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
        <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />
        <Route path="/auth/callback" element={<AuthCallback />} />
      </Route>

      <Route element={<PrivateRoute><DashboardLayout /></PrivateRoute>}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/channels" element={<Channels />} />
        <Route path="/channels/:id" element={<ChannelDetail />} />
        <Route path="/automations" element={<Automations />} />
        <Route path="/automations/new" element={<AutomationBuilder />} />
        <Route path="/automations/:id/edit" element={<AutomationBuilder />} />
        <Route path="/automations/:id" element={<AutomationDetail />} />
        <Route path="/automations/:id/executions/:executionId" element={<ExecutionDetail />} />
        <Route path="/comments" element={<Comments />} />
        <Route path="/emails/captures" element={<EmailCaptures />} />
        <Route path="/emails/sequences" element={<EmailSequences />} />
        <Route path="/landing-pages" element={<LandingPages />} />
        <Route path="/landing-pages/new" element={<LandingPageBuilder />} />
        <Route path="/landing-pages/:id/edit" element={<LandingPageBuilder />} />
        <Route path="/analytics" element={<Analytics />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/admin/*" element={<AdminRoute><AdminPanel /></AdminRoute>} />
      </Route>

      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

export default App;