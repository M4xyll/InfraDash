'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/use-auth';
import { useTheme } from '@/hooks/use-theme';
import { authApi } from '@/lib/api';
import { AppPreloader } from '@/components/app-preloader';
import { DashboardContentTransition } from '@/components/dashboard-content-transition';
import { UndoDeleteStack } from '@/components/undo-delete-card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { usePendingDeleteOverlay } from '@/hooks/use-deferred-delete';
import {
  ActivityIcon,
  DashboardIcon,
  DatabaseExportDataIcon,
  DiskIcon,
  GlobeNetworkIcon,
  LogoutIcon,
  MoonThemeIcon,
  NetworkIcon,
  RouteIcon,
  ServerIcon,
  SunIcon,
  UserSingleIcon,
  UsersIcon,
  VmIcon,
} from '@/components/icons';
import { cn } from '@/lib/utils';

const navigation = [
  { href: '/dashboard', label: 'Overview', icon: DashboardIcon },
  { href: '/dashboard/workspace', label: 'Workspace', icon: RouteIcon },
  { href: '/dashboard/servers', label: 'Servers', icon: ServerIcon },
  { href: '/dashboard/vms', label: 'VMs', icon: VmIcon },
  { href: '/dashboard/disks', label: 'Disks', icon: DiskIcon },
  { href: '/dashboard/ips', label: 'IPs', icon: GlobeNetworkIcon },
  { href: '/dashboard/network', label: 'Network', icon: NetworkIcon },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading, logout, isAdmin } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { items: pendingDeleteItems } = usePendingDeleteOverlay();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const setupStatus = useQuery({
    queryKey: ['setup-status'],
    queryFn: () => authApi.getSetupStatus(),
  });

  useEffect(() => {
    if (loading || setupStatus.isLoading || !setupStatus.data) return;
    if (setupStatus.data.data.needsSetup) {
      router.replace('/setup');
      return;
    }
    if (!user) router.replace('/login');
  }, [loading, router, setupStatus.data, setupStatus.isLoading, user]);

  useEffect(() => {
    setMobileNavOpen(false);
  }, [pathname]);

  if (loading || setupStatus.isLoading || !user) {
    return <AppPreloader mode={loading ? 'loading' : 'redirecting'} />;
  }

  const adminLinks = isAdmin
    ? [
        { href: '/dashboard/users', label: 'Users', icon: UsersIcon },
        { href: '/dashboard/backups', label: 'Backups', icon: DatabaseExportDataIcon },
        { href: '/dashboard/audit-logs', label: 'Audit logs', icon: ActivityIcon },
      ]
    : [];
  const allNavigation = [...navigation, ...adminLinks];

  return (
    <main className="shell space-y-5">
      <header className="masthead sticky top-3 z-20">
        <div className="flex items-start justify-between gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <div className="topbar-chip pr-4">
              <span className="font-mono text-[11px] uppercase tracking-[0.22em] text-[var(--text-color)]">InfraDash</span>
              <span className="hidden text-[var(--border-color)] sm:inline">/</span>
              <span className="hidden sm:inline">Ops panel</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              className="mobile-menu-button md:hidden"
              onClick={() => setMobileNavOpen((value) => !value)}
              aria-label={mobileNavOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={mobileNavOpen}
            >
              <span className={cn('mobile-menu-line', mobileNavOpen && 'mobile-menu-line-open-top')} />
              <span className={cn('mobile-menu-line', mobileNavOpen && 'mobile-menu-line-open-middle')} />
              <span className={cn('mobile-menu-line', mobileNavOpen && 'mobile-menu-line-open-bottom')} />
            </button>
            <div className="hidden flex-col gap-2 md:flex md:flex-row md:flex-wrap md:items-center">
              <div className="user-identity-chip">
                <div className="user-identity-avatar">
                  <UserSingleIcon className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-[var(--text-color)]">{user.name}</p>
                  <p className="hidden truncate text-xs text-[var(--muted-text)] sm:block">{user.email}</p>
                </div>
                <Badge tone="accent">{user.role}</Badge>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="theme-toggle"
                  onClick={toggleTheme}
                  aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} theme`}
                >
                  <span className="theme-toggle-thumb" />
                  <span className={cn('theme-toggle-option', theme === 'light' && 'theme-toggle-option-active')}>
                    <SunIcon className="h-4 w-4" />
                  </span>
                  <span className={cn('theme-toggle-option', theme === 'dark' && 'theme-toggle-option-active')}>
                    <MoonThemeIcon className="h-4 w-4" />
                  </span>
                </button>
                <Button
                  variant="ghost"
                  className="h-10 px-3 hover:translate-y-0 sm:px-4"
                  onClick={() => {
                    logout();
                    router.push('/login');
                  }}
                >
                  <LogoutIcon className="h-4 w-4 sm:mr-2" />
                  <span className="hidden sm:inline">Logout</span>
                </Button>
              </div>
            </div>
          </div>
        </div>

        <div className="nav-scroller mt-3 hidden md:flex">
          {allNavigation.map((item) => (
            <Link key={item.href} href={item.href} className={cn('nav-pill', pathname === item.href && 'nav-pill-active')}>
              <span className="inline-flex items-center gap-2">
                <item.icon className="h-4 w-4" />
                {item.label}
              </span>
            </Link>
          ))}
        </div>

        {mobileNavOpen ? (
          <div className="mobile-nav-panel md:hidden">
            <div className="user-identity-chip">
              <div className="user-identity-avatar">
                <UserSingleIcon className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-[var(--text-color)]">{user.name}</p>
                <p className="truncate text-xs text-[var(--muted-text)]">{user.email}</p>
              </div>
              <Badge tone="accent">{user.role}</Badge>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="theme-toggle"
                onClick={toggleTheme}
                aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} theme`}
              >
                <span className="theme-toggle-thumb" />
                <span className={cn('theme-toggle-option', theme === 'light' && 'theme-toggle-option-active')}>
                  <SunIcon className="h-4 w-4" />
                </span>
                <span className={cn('theme-toggle-option', theme === 'dark' && 'theme-toggle-option-active')}>
                  <MoonThemeIcon className="h-4 w-4" />
                </span>
              </button>
              <Button
                variant="ghost"
                className="h-10 px-3 hover:translate-y-0 sm:px-4"
                onClick={() => {
                  logout();
                  router.push('/login');
                }}
              >
                <LogoutIcon className="h-4 w-4 sm:mr-2" />
                Logout
              </Button>
            </div>
            <nav className="mobile-nav-list">
              {allNavigation.map((item) => (
                <Link key={item.href} href={item.href} className={cn('mobile-nav-link', pathname === item.href && 'mobile-nav-link-active')}>
                  <span className="inline-flex items-center gap-3">
                    <item.icon className="h-4 w-4" />
                    {item.label}
                  </span>
                </Link>
              ))}
            </nav>
          </div>
        ) : null}
      </header>

      <DashboardContentTransition>{children}</DashboardContentTransition>
      {pendingDeleteItems.length ? <UndoDeleteStack items={pendingDeleteItems} /> : null}
    </main>
  );
}
