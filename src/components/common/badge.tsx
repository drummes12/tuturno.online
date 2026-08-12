import type { ReactNode } from 'react'
import type { ReservationStatus } from '@/types'

interface BadgeProps {
  children: ReactNode
  variant?: 'neutral' | 'success' | 'warning' | 'danger' | 'info' | 'accent'
}

const variantClasses: Record<NonNullable<BadgeProps['variant']>, string> = {
  neutral: 'bg-surface-inset text-text-muted border-border',
  success: 'bg-pitch-100 text-pitch-800 border-pitch-300',
  warning: 'bg-orange-50 text-orange-800 border-orange-200',
  danger: 'bg-red-50 text-red-800 border-red-200',
  info: 'bg-blue-50 text-blue-800 border-blue-200',
  accent: 'bg-yellow-50 text-yellow-800 border-yellow-200',
}

export function Badge({ children, variant = 'neutral' }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full border ${variantClasses[variant]}`}
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

export function StatusBadge({ status }: { status: ReservationStatus }) {
  const config = statusConfig[status]
  return (
    <Badge variant={config.variant}>
      <StatusDot className={config.dot} />
      {config.label}
    </Badge>
  )
}
