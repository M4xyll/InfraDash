'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';

const ROUTE_ORDER = [
  '/dashboard',
  '/dashboard/workspace',
  '/dashboard/servers',
  '/dashboard/vms',
  '/dashboard/disks',
  '/dashboard/ips',
  '/dashboard/network',
  '/dashboard/users',
  '/dashboard/backups',
  '/dashboard/audit-logs',
];

function getRouteIndex(pathname: string) {
  const index = ROUTE_ORDER.indexOf(pathname);
  return index === -1 ? 0 : index;
}

type Pane = {
  key: string;
  node: React.ReactNode;
};

export function DashboardContentTransition({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const initialPane = useMemo<Pane>(() => ({ key: pathname, node: children }), []);
  const [currentPane, setCurrentPane] = useState<Pane>(initialPane);
  const [nextPane, setNextPane] = useState<Pane | null>(null);
  const [direction, setDirection] = useState<'forward' | 'backward'>('forward');
  const timeoutRef = useRef<number | null>(null);
  const latestChildrenRef = useRef(children);

  latestChildrenRef.current = children;

  useEffect(() => {
    if (pathname === currentPane.key) {
      setCurrentPane((pane) => ({ ...pane, node: children }));
      return;
    }

    if (timeoutRef.current) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    const previousIndex = getRouteIndex(currentPane.key);
    const nextIndex = getRouteIndex(pathname);
    setDirection(nextIndex >= previousIndex ? 'forward' : 'backward');
    setNextPane({ key: pathname, node: children });

    timeoutRef.current = window.setTimeout(() => {
      setCurrentPane({ key: pathname, node: latestChildrenRef.current });
      setNextPane(null);
      timeoutRef.current = null;
    }, 340);
  }, [children, currentPane.key, pathname]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
    };
  }, []);

  if (!nextPane) {
    return (
      <div className="route-shell">
        <div className="route-layer route-layer-rest">{currentPane.node}</div>
      </div>
    );
  }

  return (
    <div className="route-shell">
      <div
        className={
          direction === 'forward'
            ? 'route-layer route-layer-exit-left'
            : 'route-layer route-layer-exit-right'
        }
      >
        {currentPane.node}
      </div>
      <div
        className={
          direction === 'forward'
            ? 'route-layer route-layer-enter-right'
            : 'route-layer route-layer-enter-left'
        }
      >
        {nextPane.node}
      </div>
    </div>
  );
}
