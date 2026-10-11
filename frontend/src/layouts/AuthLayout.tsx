import { useEffect } from 'react';
import { Outlet, Link } from 'react-router-dom';

export function AuthLayout() {
  // Force dark mode on auth pages
  useEffect(() => {
    document.documentElement.classList.add('dark');
  }, []);

  return (
    <div className="app-scenic-background min-h-screen flex flex-col">

      {/* Content */}
      <div className="relative flex-1 flex flex-col items-center justify-center p-4 py-12">

        {/* Logo */}
        <Link to="/" className="group flex flex-col items-center gap-3 mb-8 focus-visible:outline-none" aria-label="YouTube Automation home">
          <div className="relative">
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-primary-500 to-accent-500 blur-lg opacity-40 group-hover:opacity-60 transition-opacity duration-300 animate-glow-pulse" />
            <div className="relative w-14 h-14 rounded-2xl bg-gradient-to-br from-primary-600 to-primary-500 flex items-center justify-center shadow-glow">
              <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M23.498 6.186a3.167 3.167 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.167 3.167 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.167 3.167 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.167 3.167 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814z"/>
                <path fill="white" d="M9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
              </svg>
            </div>
          </div>
          <div className="text-center">
            <h1 className="text-xl font-bold text-white leading-none">YouTube Automation</h1>
            <p className="text-sm text-slate-300 mt-1">Automate comments &amp; grow your channel</p>
          </div>
        </Link>

        {/* Auth card */}
        <div className="w-full max-w-md">
          <div className="glow-border card-glass p-6 rounded-2xl animate-fade-up">
            <Outlet />
          </div>

          {/* Feature pills */}
          <div className="flex flex-wrap justify-center gap-2 mt-6">
            {['Comment automation', 'Email capture', 'Landing pages', 'Analytics'].map(feat => (
              <span key={feat} className="badge-gray text-[11px]">{feat}</span>
            ))}
          </div>
        </div>

        {/* Footer */}
        <p className="mt-8 text-[11px] text-slate-600 text-center">
          &copy; {new Date().getFullYear()} YouTube Automation. All rights reserved.
        </p>
      </div>
    </div>
  );
}
