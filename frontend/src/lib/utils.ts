import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatBytes(gigabytes: number) {
  if (gigabytes < 1000) return `${gigabytes} GB`;
  return `${(gigabytes / 1000).toFixed(1)} TB`;
}

export function formatBandwidth(mbps: number) {
  if (mbps < 1000) return `${mbps} Mbps`;
  return `${(mbps / 1000).toFixed(1)} Gbps`;
}

export function formatDate(value?: string) {
  if (!value) return '-';
  return new Intl.DateTimeFormat('en', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(new Date(value));
}

export function formatDuration(seconds?: number) {
  if (seconds === undefined || seconds === null) return '-';
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}
