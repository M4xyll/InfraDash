import * as React from 'react';
import { cn } from '@/lib/utils';

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={cn(
        'h-11 w-full rounded-2xl border bg-[var(--surface-strong)] px-4 text-sm text-[var(--text-color)] outline-none focus:border-[var(--accent-color)]',
        props.className,
      )}
    />
  );
}
