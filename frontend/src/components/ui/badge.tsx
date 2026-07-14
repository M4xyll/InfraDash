import * as React from 'react';
import { cn } from '@/lib/utils';

const styles = {
  neutral: 'bg-[var(--badge-neutral-bg)] text-[var(--badge-neutral-text)]',
  accent: 'bg-[var(--badge-accent-bg)] text-[var(--badge-accent-text)]',
  signal: 'bg-[var(--badge-signal-bg)] text-[var(--badge-signal-text)]',
  danger: 'bg-[var(--badge-danger-bg)] text-[var(--badge-danger-text)]',
};

export function Badge({
  className,
  tone = 'neutral',
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & {
  tone?: keyof typeof styles;
}) {
  return (
    <span
      {...props}
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em]',
        styles[tone],
        className,
      )}
    />
  );
}
