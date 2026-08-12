import type { ReactNode } from 'react'
import type { ReservationStatus } from '@/types'

interface BadgeProps {
  children: ReactNode
  variant?: 'neutral' | 'success' | 'warning' | 'danger' | 'info' | 'accent'
}

const variantClasses: Record<NonNullable<BadgeProps['variant']>, string> = {
  neutral: 'bg-[var(--color-surface-inset)] text-[var(--color-text-muted)] border-[var(--color-border)]',
  success: 'bg-[var(--color-pitch-100)] text-[var(--color-pitch-800)] border-[var(--color-pitch-300)]',
  warning: 'bg-orange-50 text-orange-800 border-orange-200',
  danger: 'bg-red-50 text-red-800 border-red-200',
  info: 'bg-blue-50 text-blue-800 border-blue-200',
  accent: 'bg-yellow-50 text-yellow-800 border-yellow-200',
}

export function Badge({ children, variant = 'neutral' }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-full border ${variantClasses[variant]}`}
    >
      {children}
    </span>
  )
}

const statusConfig: Record<ReservationStatus, { label: string; variant: BadgeProps['variant'] }> = {
  pending: { label: 'Pendiente', variant: 'warning' },
  confirmed: { label: 'Confirmada', variant: 'success' },
  rejected: { label: 'Rechazada', variant: 'danger' },
  cancelled_by_client: { label: 'Cancelada por cliente', variant: 'neutral' },
  cancelled_by_business: { label: 'Cancelada por negocio', variant: 'neutral' },
  expired: { label: 'Expirada', variant: 'neutral' },
  completed: { label: 'Completada', variant: 'info' },
}

export function StatusBadge({ status }: { status: ReservationStatus }) {
  const config = statusConfig[status]
  return <Badge variant={config.variant}>{config.label}</Badge>
}
