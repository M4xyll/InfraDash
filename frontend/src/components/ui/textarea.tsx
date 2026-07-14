import * as React from 'react';
import { cn } from '@/lib/utils';

export function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={cn(
        'min-h-28 w-full rounded-3xl border bg-[var(--surface-strong)] px-4 py-3 text-sm text-[var(--text-color)] outline-none placeholder:text-[var(--muted-text)] focus:border-[var(--accent-color)]',
        props.className,
      )}
    />
  );
}
