import type { ReactNode } from 'react'
import type { ReservationStatus } from '@/types'

interface BadgeProps {
  children: ReactNode
  variant?: 'neutral' | 'success' | 'warning' | 'danger' | 'info' | 'accent'
  /** Versión compacta para contextos densos (bandejas, metadatos). */
  compact?: boolean
}

const variantClasses: Record<NonNullable<BadgeProps['variant']>, string> = {
  neutral: 'bg-surface-inset text-text-muted border-border',
  success:
    'bg-pitch-500/10 text-pitch-700 border-pitch-500/40 dark:bg-pitch-400/10 dark:text-pitch-300 dark:border-pitch-400/30',
  warning:
    'bg-orange-500/10 text-orange-700 border-orange-500/40 dark:bg-orange-400/10 dark:text-orange-300 dark:border-orange-400/30',
  danger:
    'bg-signal-red/10 text-signal-red border-signal-red/40 dark:bg-red-400/10 dark:text-red-300 dark:border-red-400/30',
  info: 'bg-signal-blue/10 text-signal-blue border-signal-blue/40 dark:bg-blue-400/10 dark:text-blue-300 dark:border-blue-400/30',
  accent:
    'bg-flood-500/10 text-yellow-700 border-flood-500/40 dark:bg-flood-400/10 dark:text-flood-300 dark:border-flood-400/30'
}

export function Badge({ children, variant = 'neutral', compact }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full border font-medium ${
        compact
          ? 'gap-1 px-2 py-0.5 text-[10px]'
          : 'gap-1.5 px-2.5 py-1 text-xs'
      } ${variantClasses[variant]}`}
    >
      {children}
    </span>
  )
}

/* Status dot — small semantic indicator */
function StatusDot({ className }: { className: string }) {
  return <span className={`w-1.5 h-1.5 rounded-full ${className}`} aria-hidden="true" />
}

const statusConfig: Record<ReservationStatus, { label: string; variant: BadgeProps['variant']; dot: string }> = {
  pending: { label: 'Pendiente', variant: 'warning', dot: 'bg-orange-500' },
  confirmed: { label: 'Confirmada', variant: 'success', dot: 'bg-pitch-600' },
  rejected: { label: 'Rechazada', variant: 'danger', dot: 'bg-red-500' },
  cancelled_by_client: { label: 'Cancelada por cliente', variant: 'neutral', dot: 'bg-graphite-400' },
  cancelled_by_business: { label: 'Cancelada por negocio', variant: 'neutral', dot: 'bg-graphite-400' },
  expired: { label: 'Expirada', variant: 'neutral', dot: 'bg-graphite-400' },
  completed: { label: 'Completada', variant: 'info', dot: 'bg-blue-500' },
}

export function StatusBadge({
  status,
  compact
}: {
  status: ReservationStatus
  compact?: boolean
}) {
  const config = statusConfig[status]
  return (
    <Badge variant={config.variant} compact={compact}>
      <StatusDot className={config.dot} />
      {config.label}
    </Badge>
  )
}
