'use client';

import { useEffect, useMemo, useState } from 'react';
import { ActivityIcon } from '@/components/icons';

type PreloaderMode = 'loading' | 'redirecting';

const copyByMode: Record<PreloaderMode, { title: string; detail: string; target: number }> = {
  loading: {
    title: 'Preparing workspace',
    detail: 'Checking session, permissions, and dashboard state.',
    target: 88,
  },
  redirecting: {
    title: 'Opening panel',
    detail: 'Finalizing route handoff.',
    target: 100,
  },
};

export function AppPreloader({
  mode = 'loading',
}: {
  mode?: PreloaderMode;
}) {
  const config = copyByMode[mode];
  const [progress, setProgress] = useState(mode === 'redirecting' ? 92 : 18);

  useEffect(() => {
    setProgress((current) => (mode === 'redirecting' ? Math.max(current, 92) : current));
  }, [mode]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setProgress((current) => {
        if (current >= config.target) return current;

        const remaining = config.target - current;
        const step = mode === 'redirecting' ? Math.max(remaining / 2, 2) : Math.max(remaining / 7, 0.8);
        return Math.min(config.target, current + step);
      });
    }, 90);

    return () => window.clearInterval(timer);
  }, [config.target, mode]);

  const percentage = Math.round(progress);
  const ticks = useMemo(
    () => Array.from({ length: 10 }, (_, index) => percentage >= (index + 1) * 10),
    [percentage],
  );

  return (
    <div className="flex min-h-screen items-center justify-center px-6">
      <div className="w-full max-w-md rounded-[2rem] border bg-[var(--surface)] p-7 shadow-[var(--panel-shadow)] backdrop-blur-md">
        <div className="flex items-center justify-between">
          <div className="inline-flex items-center gap-3">
            <div className="rounded-2xl bg-[var(--text-color)] p-3 text-[var(--surface-strong)]">
              <ActivityIcon className="h-5 w-5" />
            </div>
            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-[var(--muted-text)]">InfraDash</p>
              <p className="mt-1 text-lg font-semibold text-[var(--text-color)]">{config.title}</p>
            </div>
          </div>
          <p className="font-mono text-sm text-[var(--muted-text)]">{percentage}%</p>
        </div>

        <p className="mt-4 text-sm leading-6 text-[var(--muted-text)]">{config.detail}</p>

        <div className="mt-6 overflow-hidden rounded-full border bg-[var(--surface-strong)] p-1">
          <div
            className="h-2.5 rounded-full bg-[var(--accent-color)] transition-[width] duration-200 ease-out"
            style={{ width: `${percentage}%` }}
          />
        </div>

        <div className="mt-4 grid grid-cols-10 gap-2">
          {ticks.map((active, index) => (
            <div
              key={index}
              className="h-1.5 rounded-full transition-colors duration-200"
              style={{
                backgroundColor: active ? 'var(--accent-color)' : 'var(--border-color)',
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
