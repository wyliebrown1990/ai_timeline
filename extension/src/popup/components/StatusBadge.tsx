import { AlertCircle, CheckCircle, Clock, Search, Sparkles } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

const STATUS_MAP: Record<string, { Icon: LucideIcon; label: string; className: string; pulse?: boolean }> = {
  pending: {
    Icon: Clock,
    label: 'Pending',
    className: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  },
  screening: {
    Icon: Search,
    label: 'Screening',
    className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
    pulse: true,
  },
  generating: {
    Icon: Sparkles,
    label: 'Generating',
    className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
    pulse: true,
  },
  complete: {
    Icon: CheckCircle,
    label: 'Complete',
    className: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  },
  error: {
    Icon: AlertCircle,
    label: 'Error',
    className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  },
};

interface Props {
  status: string;
}

export function StatusBadge({ status }: Props) {
  const entry = STATUS_MAP[status] ?? STATUS_MAP.pending;
  const { Icon, label, className, pulse } = entry;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${className}`}
    >
      <Icon
        className={`h-3 w-3 ${pulse ? 'motion-safe:animate-pulse' : ''}`}
        aria-hidden="true"
      />
      <span>{label}</span>
    </span>
  );
}
