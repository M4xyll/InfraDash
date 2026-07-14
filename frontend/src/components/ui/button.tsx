import * as React from 'react';
import { cn } from '@/lib/utils';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary: 'bg-[var(--text-color)] text-[var(--surface-strong)] hover:-translate-y-0.5 hover:opacity-92',
  secondary: 'bg-[var(--accent-color)] text-white hover:-translate-y-0.5 hover:bg-[var(--accent-strong)]',
  ghost: 'border border-[var(--border-color)] bg-[var(--surface-strong)] text-[var(--text-color)] hover:-translate-y-0.5 hover:bg-[var(--surface-soft)]',
  danger: 'bg-[var(--danger-color)] text-white hover:-translate-y-0.5 hover:opacity-90',
};

export function Button({ className, variant = 'primary', ...props }: ButtonProps) {
  return (
    <button
      className={cn(
        'inline-flex h-11 items-center justify-center rounded-full px-5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50',
        variantClasses[variant],
        className,
      )}
      {...props}
    />
  );
}
