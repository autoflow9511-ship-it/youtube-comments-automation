import { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from '@components/ui/Sidebar';
import { Header } from '@components/ui/Header';
import { useAuth } from '@contexts/AuthContext';

export function DashboardLayout() {
  const { user } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Dark mode — always dark by default for AI-Native theme
  useEffect(() => {
    document.documentElement.classList.add('dark');
  }, []);

  const toggleDarkMode = () => {
    setDarkMode(d => !d);
    document.documentElement.classList.toggle('dark');
  };

  // Close mobile sidebar on resize to desktop
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) setMobileOpen(false);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className="min-h-screen bg-surface-900 text-slate-100">
      {/* Sidebar */}
      <Sidebar
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
      />

      {/* Main content — offset by sidebar width on desktop */}
      <div
        className="lg:pl-64 flex flex-col min-h-screen transition-all duration-300"
      >
        {/* Header */}
        <Header
          user={user}
          onMobileMenuOpen={() => setMobileOpen(true)}
          darkMode={darkMode}
          onToggleDarkMode={toggleDarkMode}
        />

        {/* Page content */}
        <main className="flex-1 p-4 md:p-6 lg:p-8 max-w-[1600px] w-full mx-auto animate-fade-up">
          <Outlet />
        </main>

        {/* Footer */}
        <footer className="py-4 px-6 border-t border-white/[0.04] text-center">
          <p className="text-[11px] text-slate-600">
            YouTube Automation SaaS &copy; {new Date().getFullYear()}
          </p>
        </footer>
      </div>
    </div>
  );
}
