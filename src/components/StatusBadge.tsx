import { cn } from '@/lib/utils';

type StatusType = 'success' | 'warning' | 'danger' | 'info' | 'muted';

interface StatusBadgeProps {
  status: StatusType;
  label: string;
  className?: string;
  dot?: boolean;
}

const statusStyles: Record<StatusType, string> = {
  success: 'status-verde',
  warning: 'status-amarelo',
  danger: 'status-vermelho',
  info: 'bg-primary/10 text-primary border border-primary/20',
  muted: 'bg-muted text-muted-foreground border border-border',
};

export function StatusBadge({ status, label, className, dot = true }: StatusBadgeProps) {
  return (
    <span className={cn(
      'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium',
      statusStyles[status],
      className
    )}>
      {dot && (
        <span className={cn(
          'w-1.5 h-1.5 rounded-full',
          status === 'success' && 'bg-success',
          status === 'warning' && 'bg-warning',
          status === 'danger' && 'bg-danger',
          status === 'info' && 'bg-primary',
          status === 'muted' && 'bg-muted-foreground',
        )} />
      )}
      {label}
    </span>
  );
}
