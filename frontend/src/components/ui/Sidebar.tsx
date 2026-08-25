import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@contexts/AuthContext';
import {
  HomeIcon,
  PlayCircleIcon,
  BoltIcon,
  ChatBubbleLeftRightIcon,
  EnvelopeOpenIcon,
  DocumentTextIcon,
  ChartBarIcon,
  Cog6ToothIcon,
  ShieldCheckIcon,
  ArrowRightOnRectangleIcon,
  GlobeAltIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline';

interface NavItem {
  name: string;
  href: string;
  icon: React.ElementType;
  roles: string[];
  badge?: string;
}

const navigation: NavItem[] = [
  { name: 'Dashboard',       href: '/dashboard',          icon: HomeIcon,                   roles: ['USER','ADMIN','SUPER_ADMIN'] },
  { name: 'Channels',        href: '/channels',            icon: PlayCircleIcon,             roles: ['USER','ADMIN','SUPER_ADMIN'] },
  { name: 'Automations',     href: '/automations',         icon: BoltIcon,                   roles: ['USER','ADMIN','SUPER_ADMIN'] },
  { name: 'Comments',        href: '/comments',            icon: ChatBubbleLeftRightIcon,    roles: ['USER','ADMIN','SUPER_ADMIN'] },
  { name: 'Email Captures',  href: '/emails/captures',     icon: EnvelopeOpenIcon,           roles: ['USER','ADMIN','SUPER_ADMIN'] },
  { name: 'Email Sequences', href: '/emails/sequences',    icon: DocumentTextIcon,           roles: ['USER','ADMIN','SUPER_ADMIN'] },
  { name: 'Landing Pages',   href: '/landing-pages',       icon: GlobeAltIcon,               roles: ['USER','ADMIN','SUPER_ADMIN'] },
  { name: 'Analytics',       href: '/analytics',           icon: ChartBarIcon,               roles: ['USER','ADMIN','SUPER_ADMIN'] },
  { name: 'Settings',        href: '/settings',            icon: Cog6ToothIcon,              roles: ['USER','ADMIN','SUPER_ADMIN'] },
  { name: 'Admin Panel',     href: '/admin',               icon: ShieldCheckIcon,            roles: ['ADMIN','SUPER_ADMIN'] },
];

interface SidebarProps {
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

export function Sidebar({ mobileOpen = false, onMobileClose }: SidebarProps) {
  const location = useLocation();
  const { user, logout } = useAuth();
  const [collapsed, setCollapsed] = useState(false);

  const filteredNav = navigation.filter(item =>
    item.roles.includes(user?.role || 'USER')
  );

  const isActive = (href: string) =>
    location.pathname === href ||
    (href !== '/dashboard' && location.pathname.startsWith(href));

  const tierColors: Record<string, string> = {
    FREE:       'text-slate-400',
    STARTER:    'text-accent-400',
    PRO:        'text-primary-400',
    ENTERPRISE: 'text-warning-400',
  };

  return (
    <>
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
          onClick={onMobileClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={[
          'fixed inset-y-0 left-0 z-50 flex flex-col',
          'bg-surface-800 border-r border-white/[0.06]',
          'transition-all duration-300 ease-smooth',
          collapsed ? 'w-16' : 'w-64',
          // Mobile: slide in/out
          mobileOpen ? 'translate-x-0' : '-translate-x-full',
          'lg:translate-x-0',
        ].join(' ')}
      >
        {/* ── Logo ── */}
        <div className={[
          'flex items-center h-16 border-b border-white/[0.06] flex-shrink-0',
          collapsed ? 'justify-center px-2' : 'justify-between px-4',
        ].join(' ')}>
          {!collapsed && (
            <Link to="/dashboard" className="flex items-center gap-2.5 group" aria-label="Go to dashboard">
              {/* Logo mark */}
              <div className="relative w-8 h-8 flex-shrink-0">
                <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-primary-500 to-accent-500 opacity-20 blur-sm group-hover:opacity-40 transition-opacity" />
                <div className="relative w-8 h-8 rounded-xl bg-gradient-to-br from-primary-600 to-primary-500 flex items-center justify-center shadow-glow-sm">
                  <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M23.498 6.186a3.167 3.167 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.167 3.167 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.167 3.167 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.167 3.167 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814z"/>
                    <path fill="white" d="M9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                  </svg>
                </div>
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold text-white leading-none truncate">YouTube Auto</p>
                <p className="text-[10px] text-slate-500 mt-0.5">Automation SaaS</p>
              </div>
            </Link>
          )}

          {collapsed && (
            <Link to="/dashboard" className="relative group" aria-label="Dashboard">
              <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-primary-500 to-accent-500 opacity-0 blur-sm group-hover:opacity-30 transition-opacity" />
              <div className="relative w-8 h-8 rounded-xl bg-gradient-to-br from-primary-600 to-primary-500 flex items-center justify-center">
                <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M23.498 6.186a3.167 3.167 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.167 3.167 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.167 3.167 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.167 3.167 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814z"/>
                  <path fill="white" d="M9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                </svg>
              </div>
            </Link>
          )}

          {/* Collapse toggle — desktop only */}
          <button
            onClick={() => setCollapsed(c => !c)}
            className="hidden lg:flex items-center justify-center w-6 h-6 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-white/5 transition-all duration-200 flex-shrink-0"
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed
              ? <ChevronRightIcon className="w-3.5 h-3.5" />
              : <ChevronLeftIcon className="w-3.5 h-3.5" />}
          </button>
        </div>

        {/* ── Navigation ── */}
        <nav
          className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto scrollbar-hide"
          aria-label="Main navigation"
        >
          {filteredNav.map(item => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.name}
                to={item.href}
                onClick={onMobileClose}
                title={collapsed ? item.name : undefined}
                aria-current={active ? 'page' : undefined}
                className={[
                  'group relative flex items-center rounded-xl text-sm font-medium',
                  'transition-all duration-200 cursor-pointer',
                  collapsed ? 'justify-center px-0 py-2.5 mx-1' : 'gap-3 px-3 py-2.5',
                  active
                    ? 'text-white bg-primary-500/10 border border-primary-500/20 shadow-glow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04] border border-transparent',
                ].join(' ')}
              >
                {/* Active glow dot */}
                {active && (
                  <span
                    className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-r-full bg-primary-400 shadow-[0_0_8px_theme(colors.primary.400)]"
                    aria-hidden="true"
                  />
                )}

                <item.icon
                  className={[
                    'w-4.5 h-4.5 flex-shrink-0 transition-colors',
                    active ? 'text-primary-400' : 'text-slate-500 group-hover:text-slate-300',
                  ].join(' ')}
                  aria-hidden="true"
                />

                {!collapsed && (
                  <>
                    <span className="flex-1 truncate">{item.name}</span>
                    {item.badge && (
                      <span className="badge-primary text-[10px] px-1.5 py-0.5">{item.badge}</span>
                    )}
                  </>
                )}

                {/* Collapsed tooltip */}
                {collapsed && (
                  <span
                    className="tooltip left-full ml-3 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
                    role="tooltip"
                  >
                    {item.name}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* ── Upgrade Banner (FREE users) ── */}
        {!collapsed && user?.subscriptionTier === 'FREE' && (
          <div className="mx-3 mb-3">
            <div className="relative rounded-xl bg-gradient-to-br from-primary-600/20 to-accent-500/10 border border-primary-500/20 p-3 overflow-hidden">
              <div className="absolute -top-4 -right-4 w-16 h-16 rounded-full bg-primary-500/10 blur-xl" aria-hidden="true" />
              <div className="flex items-start gap-2 relative">
                <SparklesIcon className="w-4 h-4 text-primary-400 mt-0.5 flex-shrink-0" aria-hidden="true" />
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-white">Upgrade to Pro</p>
                  <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">Unlock unlimited automations</p>
                </div>
              </div>
              <button className="mt-2.5 w-full btn-primary btn-sm text-[11px] py-1.5">
                Upgrade Now
              </button>
            </div>
          </div>
        )}

        {/* ── User footer ── */}
        <div className="border-t border-white/[0.06] p-2 flex-shrink-0">
          <div className={[
            'flex items-center rounded-xl transition-colors duration-200',
            'hover:bg-white/[0.04] cursor-default',
            collapsed ? 'justify-center p-2' : 'gap-3 px-3 py-2',
          ].join(' ')}>
            {/* Avatar */}
            <div className="relative flex-shrink-0">
              <div className="w-8 h-8 rounded-xl overflow-hidden ring-2 ring-white/10">
                {user?.avatar ? (
                  <img src={user.avatar} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-primary-600 to-accent-500 flex items-center justify-center">
                    <span className="text-xs font-bold text-white">
                      {user?.firstName?.[0] || user?.email?.[0]?.toUpperCase() || 'U'}
                    </span>
                  </div>
                )}
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-success-400 ring-2 ring-surface-800 shadow-[0_0_6px_theme(colors.success.400)]" aria-hidden="true" />
            </div>

            {!collapsed && (
              <>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-white truncate leading-none">
                    {user?.firstName && user?.lastName
                      ? `${user.firstName} ${user.lastName}`
                      : user?.email}
                  </p>
                  <p className={`text-[10px] mt-0.5 font-medium capitalize ${tierColors[user?.subscriptionTier || 'FREE']}`}>
                    {user?.subscriptionTier?.toLowerCase() || 'free'} plan
                  </p>
                </div>
                <button
                  onClick={logout}
                  className="flex-shrink-0 p-1.5 rounded-lg text-slate-500 hover:text-error-400 hover:bg-error-500/10 transition-all duration-200"
                  aria-label="Sign out"
                >
                  <ArrowRightOnRectangleIcon className="w-4 h-4" />
                </button>
              </>
            )}
          </div>
        </div>
      </aside>
    </>
  );
}
