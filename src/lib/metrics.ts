import { format, startOfMonth, startOfWeek, subDays } from 'date-fns'
import { es } from 'date-fns/locale'
import { toZonedTime } from 'date-fns-tz'
import { BUSINESS_TIMEZONE } from '@/lib/time'
import type { DashboardPeriodKey } from '@/types'

export const PERIOD_OPTIONS: Array<{
  key: DashboardPeriodKey
  label: string
}> = [
  { key: 'week', label: 'Esta semana' },
  { key: '7d', label: 'Últimos 7 días' },
  { key: '30d', label: 'Últimos 30 días' },
  { key: 'month', label: 'Este mes' },
  { key: '90d', label: 'Últimos 90 días' }
]

/** Rango local [from, to] inclusivo según el preset elegido. */
export function metricsRange(key: DashboardPeriodKey): {
  from: string
  to: string
} {
  const now = toZonedTime(new Date(), BUSINESS_TIMEZONE)
  const fmt = (d: Date) => format(d, 'yyyy-MM-dd')
  switch (key) {
    case 'week':
      return { from: fmt(startOfWeek(now, { weekStartsOn: 1 })), to: fmt(now) }
    case '7d':
      return { from: fmt(subDays(now, 6)), to: fmt(now) }
    case 'month':
      return { from: fmt(startOfMonth(now)), to: fmt(now) }
    case '90d':
      return { from: fmt(subDays(now, 89)), to: fmt(now) }
    default:
      return { from: fmt(subDays(now, 29)), to: fmt(now) }
  }
}

/** "28 ago – 26 sep 2026" */
export function metricsRangeLabel(from: string, to: string): string {
  const f = format(new Date(`${from}T12:00:00`), 'd MMM', { locale: es })
  const t = format(new Date(`${to}T12:00:00`), 'd MMM yyyy', { locale: es })
  return `${f} – ${t}`
}
