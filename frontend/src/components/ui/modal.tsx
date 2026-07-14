'use client';

import { useEffect, useState } from 'react';
import { CloseIcon } from '@/components/icons';
import { cn } from '@/lib/utils';

export function Modal({
  open,
  title,
  description,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  description?: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const [mounted, setMounted] = useState(open);
  const [visible, setVisible] = useState(open);

  useEffect(() => {
    if (open) {
      setMounted(true);
      requestAnimationFrame(() => setVisible(true));
      return;
    }

    setVisible(false);
    const timeout = setTimeout(() => setMounted(false), 240);
    return () => clearTimeout(timeout);
  }, [open]);

  if (!mounted) return null;

  return (
    <div
      className={cn(
        'fixed inset-0 z-50 flex items-center justify-center p-4 transition-[background-color,backdrop-filter] duration-200',
        visible ? 'bg-black/30 backdrop-blur-sm' : 'bg-black/0 backdrop-blur-none',
      )}
    >
      <div className="absolute inset-0" onClick={onClose} />
      <div
        className={cn(
          'relative z-10 w-full max-w-2xl overflow-hidden rounded-[2rem] border bg-[var(--surface-strong)] shadow-[var(--panel-shadow)] transition duration-200 ease-out',
          visible ? 'translate-y-0 opacity-100' : 'translate-y-6 opacity-0',
        )}
      >
        <div className="flex items-start justify-between gap-6 border-b px-6 py-5">
          <div>
            <h3 className="text-xl font-semibold text-[var(--text-color)]">{title}</h3>
            {description ? <p className="mt-2 max-w-xl text-sm leading-6 text-[var(--muted-text)]">{description}</p> : null}
          </div>
          <button
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border bg-[var(--surface-soft)] text-[var(--muted-text)]"
            onClick={onClose}
            aria-label="Close dialog"
          >
            <CloseIcon className="h-4 w-4" />
          </button>
        </div>
        <div className="max-h-[78vh] overflow-y-auto px-6 py-5">{children}</div>
      </div>
    </div>
  );
}

export function ModalSection({
  title,
  copy,
  children,
  icon,
}: {
  title: string;
  copy?: string;
  children: React.ReactNode;
  icon?: React.ReactNode;
}) {
  return (
    <section className="rounded-[1.5rem] border bg-[var(--surface-soft)] p-4">
      <div className="mb-4">
        <p className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--muted-text)]">
          {icon}
          {title}
        </p>
        {copy ? <p className="mt-2 text-sm leading-6 text-[var(--muted-text)]">{copy}</p> : null}
      </div>
      {children}
    </section>
  );
}

export function ModalField({
  label,
  hint,
  children,
  icon,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
  icon?: React.ReactNode;
}) {
  return (
    <label className="space-y-2">
      <span className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--muted-text)]">
        {icon}
        {label}
      </span>
      {children}
      {hint ? <span className="block text-xs text-[var(--muted-text)]">{hint}</span> : null}
    </label>
  );
}

export function ModalFooter({ children }: { children: React.ReactNode }) {
  return <div className="sticky bottom-0 mt-5 flex justify-end gap-3 border-t bg-[var(--surface-strong)] px-1 pt-5">{children}</div>;
}
