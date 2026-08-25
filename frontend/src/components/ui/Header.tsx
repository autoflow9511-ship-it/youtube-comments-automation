import { useState, Fragment } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, Transition } from '@headlessui/react';
import {
  BellIcon,
  ArrowRightOnRectangleIcon,
  Cog6ToothIcon,
  UserCircleIcon,
  Bars3Icon,
  MagnifyingGlassIcon,
  SunIcon,
  MoonIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
} from '@heroicons/react/24/outline';
import { useAuth } from '@contexts/AuthContext';
import type { User } from '../../types';

interface HeaderProps {
  user: User | null;
  onMobileMenuOpen?: () => void;
  darkMode?: boolean;
  onToggleDarkMode?: () => void;
}

// Page title map
const pageTitles: Record<string, string> = {
  '/dashboard':        'Dashboard',
  '/channels':         'YouTube Channels',
  '/automations':      'Automations',
  '/comments':         'Comments',
  '/emails/captures':  'Email Captures',
  '/emails/sequences': 'Email Sequences',
  '/landing-pages':    'Landing Pages',
  '/analytics':        'Analytics',
  '/settings':         'Settings',
  '/admin':            'Admin Panel',
};

const mockNotifications = [
  { id: '1', type: 'success', title: 'Automation triggered',  message: '"PDF Link" replied to 3 comments', time: '2m ago', read: false },
  { id: '2', type: 'info',    title: 'Channel synced',        message: 'My Channel videos updated',        time: '15m ago', read: false },
  { id: '3', type: 'warning', title: 'Quota warning',         message: 'YouTube API at 80% daily limit',  time: '1h ago', read: true },
];

const notifIcon = (type: string) => {
  if (type === 'success') return <CheckCircleIcon className="w-4 h-4 text-success-400" />;
  if (type === 'warning') return <ExclamationTriangleIcon className="w-4 h-4 text-warning-400" />;
  return <InformationCircleIcon className="w-4 h-4 text-accent-400" />;
};

export function Header({ user, onMobileMenuOpen, darkMode, onToggleDarkMode }: HeaderProps) {
  const { logout } = useAuth();
  const location = useLocation();
  const [searchOpen, setSearchOpen] = useState(false);

  const unreadCount = mockNotifications.filter(n => !n.read).length;

  // Resolve page title
  const pageTitle = Object.entries(pageTitles).find(([path]) =>
    location.pathname === path || (path !== '/dashboard' && location.pathname.startsWith(path))
  )?.[1] ?? 'Dashboard';

  return (
    <header className="sticky top-0 z-40 h-16 flex items-center border-b border-white/[0.06] bg-surface-800/80 backdrop-blur-xl px-4 gap-3">

      {/* Mobile menu button */}
      <button
        onClick={onMobileMenuOpen}
        className="lg:hidden btn-icon btn-ghost text-slate-400"
        aria-label="Open menu"
      >
        <Bars3Icon className="w-5 h-5" />
      </button>

      {/* Page title */}
      <div className="flex-1 min-w-0">
        {!searchOpen && (
          <h1 className="text-sm font-semibold text-white truncate animate-fade-in">
            {pageTitle}
          </h1>
        )}

        {/* Search bar */}
        {searchOpen && (
          <div className="relative animate-fade-in">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" aria-hidden="true" />
            <input
              type="search"
              autoFocus
              placeholder="Search automations, comments..."
              className="input pl-9 py-1.5 text-sm max-w-sm"
              onBlur={() => setSearchOpen(false)}
              aria-label="Search"
            />
          </div>
        )}
      </div>

      {/* Right actions */}
      <div className="flex items-center gap-1.5 flex-shrink-0">

        {/* Search toggle */}
        <button
          onClick={() => setSearchOpen(o => !o)}
          className="btn-icon btn-ghost text-slate-400 hover:text-slate-200"
          aria-label="Search"
        >
          <MagnifyingGlassIcon className="w-4.5 h-4.5" aria-hidden="true" />
        </button>

        {/* Dark mode toggle */}
        {onToggleDarkMode && (
          <button
            onClick={onToggleDarkMode}
            className="btn-icon btn-ghost text-slate-400 hover:text-slate-200"
            aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {darkMode
              ? <SunIcon className="w-4.5 h-4.5" aria-hidden="true" />
              : <MoonIcon className="w-4.5 h-4.5" aria-hidden="true" />}
          </button>
        )}

        {/* Notifications */}
        <Menu as="div" className="relative">
          <Menu.Button
            className="btn-icon btn-ghost text-slate-400 hover:text-slate-200 relative"
            aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ''}`}
          >
            <BellIcon className="w-4.5 h-4.5" aria-hidden="true" />
            {unreadCount > 0 && (
              <span
                className="absolute top-1 right-1 w-2 h-2 rounded-full bg-primary-500 shadow-glow-sm ring-2 ring-surface-800"
                aria-hidden="true"
              />
            )}
          </Menu.Button>

          <Transition
            as={Fragment}
            enter="transition ease-out duration-150"
            enterFrom="opacity-0 scale-95 translate-y-1"
            enterTo="opacity-100 scale-100 translate-y-0"
            leave="transition ease-in duration-100"
            leaveFrom="opacity-100 scale-100"
            leaveTo="opacity-0 scale-95"
          >
            <Menu.Items className="absolute right-0 mt-2 w-80 card-glass focus:outline-none animate-fade-up">
              <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
                <h3 className="text-sm font-semibold text-white">Notifications</h3>
                {unreadCount > 0 && (
                  <span className="badge-primary text-[10px]">{unreadCount} new</span>
                )}
              </div>

              <ul className="max-h-72 overflow-y-auto scrollbar-hide divide-y divide-white/[0.04]" role="list">
                {mockNotifications.length === 0 ? (
                  <li className="py-8 text-center text-sm text-slate-500">No notifications</li>
                ) : (
                  mockNotifications.map(n => (
                    <li key={n.id}>
                      <Menu.Item>
                        {({ active }) => (
                          <button
                            className={[
                              'w-full flex items-start gap-3 px-4 py-3 text-left transition-colors duration-150',
                              active ? 'bg-white/[0.04]' : '',
                              !n.read ? 'bg-primary-500/[0.03]' : '',
                            ].join(' ')}
                          >
                            <span className="mt-0.5 flex-shrink-0">{notifIcon(n.type)}</span>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-semibold text-white truncate">{n.title}</p>
                              <p className="text-[11px] text-slate-500 mt-0.5 truncate">{n.message}</p>
                            </div>
                            <span className="text-[10px] text-slate-600 flex-shrink-0 mt-0.5">{n.time}</span>
                            {!n.read && (
                              <span className="w-1.5 h-1.5 rounded-full bg-primary-500 mt-1.5 flex-shrink-0" aria-hidden="true" />
                            )}
                          </button>
                        )}
                      </Menu.Item>
                    </li>
                  ))
                )}
              </ul>

              <div className="px-4 py-2.5 border-t border-white/[0.06]">
                <Menu.Item>
                  {({ active }) => (
                    <button className={`w-full text-center text-xs font-medium transition-colors ${active ? 'text-primary-400' : 'text-slate-500 hover:text-slate-300'}`}>
                      View all notifications
                    </button>
                  )}
                </Menu.Item>
              </div>
            </Menu.Items>
          </Transition>
        </Menu>

        {/* Divider */}
        <div className="w-px h-5 bg-white/[0.08] mx-1" aria-hidden="true" />

        {/* User menu */}
        <Menu as="div" className="relative">
          <Menu.Button
            className="flex items-center gap-2 pl-1 pr-2 py-1 rounded-xl hover:bg-white/[0.04] transition-all duration-200 group"
            aria-label="User menu"
          >
            {/* Avatar */}
            <div className="relative w-7 h-7 rounded-lg overflow-hidden ring-1 ring-white/10 group-hover:ring-primary-500/30 transition-all">
              {user?.avatar ? (
                <img src={user.avatar} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-primary-600 to-accent-500 flex items-center justify-center">
                  <span className="text-[10px] font-bold text-white">
                    {user?.firstName?.[0] || user?.email?.[0]?.toUpperCase() || 'U'}
                  </span>
                </div>
              )}
            </div>
            <span className="hidden md:block text-xs font-medium text-slate-300 group-hover:text-white transition-colors max-w-[100px] truncate">
              {user?.firstName || user?.email?.split('@')[0] || 'User'}
            </span>
          </Menu.Button>

          <Transition
            as={Fragment}
            enter="transition ease-out duration-150"
            enterFrom="opacity-0 scale-95 translate-y-1"
            enterTo="opacity-100 scale-100 translate-y-0"
            leave="transition ease-in duration-100"
            leaveFrom="opacity-100 scale-100"
            leaveTo="opacity-0 scale-95"
          >
            <Menu.Items className="absolute right-0 mt-2 w-52 card-glass focus:outline-none animate-fade-up">
              {/* User info */}
              <div className="px-4 py-3 border-b border-white/[0.06]">
                <p className="text-xs font-semibold text-white truncate">
                  {user?.firstName && user?.lastName
                    ? `${user.firstName} ${user.lastName}`
                    : user?.email}
                </p>
                <p className="text-[11px] text-slate-500 mt-0.5 truncate">{user?.email}</p>
              </div>

              <div className="py-1.5">
                <Menu.Item>
                  {({ active }) => (
                    <Link
                      to="/settings"
                      className={`flex items-center gap-2.5 px-4 py-2 text-sm transition-colors ${active ? 'text-white bg-white/[0.04]' : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'}`}
                    >
                      <Cog6ToothIcon className="w-4 h-4" aria-hidden="true" />
                      Settings
                    </Link>
                  )}
                </Menu.Item>
                <Menu.Item>
                  {({ active }) => (
                    <Link
                      to="/settings"
                      className={`flex items-center gap-2.5 px-4 py-2 text-sm transition-colors ${active ? 'text-white bg-white/[0.04]' : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'}`}
                    >
                      <UserCircleIcon className="w-4 h-4" aria-hidden="true" />
                      Profile
                    </Link>
                  )}
                </Menu.Item>
              </div>

              <div className="py-1.5 border-t border-white/[0.06]">
                <Menu.Item>
                  {({ active }) => (
                    <button
                      onClick={logout}
                      className={`w-full flex items-center gap-2.5 px-4 py-2 text-sm transition-colors ${active ? 'text-error-400 bg-error-500/10' : 'text-slate-400 hover:text-error-400 hover:bg-error-500/10'}`}
                    >
                      <ArrowRightOnRectangleIcon className="w-4 h-4" aria-hidden="true" />
                      Sign out
                    </button>
                  )}
                </Menu.Item>
              </div>
            </Menu.Items>
          </Transition>
        </Menu>
      </div>
    </header>
  );
}
