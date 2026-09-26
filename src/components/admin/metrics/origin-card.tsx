import { Card } from '@/components/common/card'
import { UsersIcon } from '@/components/common/icon'
import type { DashboardData } from '@/types'

const SEGMENTS = [
  { key: 'completed', label: 'Completadas', cls: 'bg-pitch-600' },
  { key: 'confirmed', label: 'Confirmadas', cls: 'bg-pitch-300' },
  { key: 'pending', label: 'Pendientes', cls: 'bg-signal-orange/80' },
  { key: 'rejected', label: 'Rechazadas', cls: 'bg-signal-red/70' },
  { key: 'expired', label: 'Vencidas', cls: 'bg-graphite-600' },
  {
    key: 'cancelledByClient',
    label: 'Canceladas cliente',
    cls: 'bg-graphite-400'
  },
  {
    key: 'cancelledByBusiness',
    label: 'Canceladas negocio',
    cls: 'bg-graphite-200'
  }
] as const

type OriginKey = keyof DashboardData['origin']

function StackedBar({
  breakdown,
  label,
  total
}: {
  breakdown: DashboardData['origin'][OriginKey]
  label: string
  total: number
}) {
  if (breakdown.total === 0) return null
  return (
    <div>
      <p className='mb-1.5 flex items-baseline justify-between text-[11px]'>
        <span className='font-medium text-(--color-text)'>{label}</span>
        <span className='nums text-text-muted'>{breakdown.total}</span>
      </p>
      <div
        className='flex h-2.5 w-full overflow-hidden rounded-full bg-surface-inset'
        role='img'
        aria-label={SEGMENTS.map((s) => `${s.label}: ${breakdown[s.key]}`).join(
          ', '
        )}
      >
        {SEGMENTS.map(
          (s) =>
            breakdown[s.key] > 0 && (
              <div
                key={s.key}
                className={`${s.cls} h-full`}
                style={{
                  width: `${(breakdown[s.key] / total) * 100}%`
                }}
                title={`${s.label}: ${breakdown[s.key]}`}
              />
            )
        )}
      </div>
    </div>
  )
}

/**
 * Origen de las reservas: anillo cliente vs negocio + barras apiladas
 * con el desglose de estados por cada fuente.
 */
export function OriginCard({ origin }: { origin: DashboardData['origin'] }) {
  const total = origin.client.total + origin.business.total
  const clientPct =
    total > 0 ? Math.round((origin.client.total / total) * 100) : 0
  // Anillo: circunferencia 2πr, r=42
  const CIRC = 2 * Math.PI * 42
  const clientLen = total > 0 ? (origin.client.total / total) * CIRC : 0

  return (
    <Card className='p-5'>
      <div className='flex items-center gap-2'>
        <UsersIcon size={16} className='shrink-0 text-text-muted' />
        <h2 className='min-w-0 flex-1 truncate text-xs font-medium uppercase tracking-[0.14em] text-text-muted'>
          Origen de las reservas
        </h2>
      </div>

      <div className='mt-4 flex items-center gap-5'>
        <svg
          viewBox='0 0 100 100'
          className='w-28 shrink-0'
          role='img'
          aria-label={`${clientPct}% de las reservas las crea el cliente`}
        >
          <circle
            cx='50'
            cy='50'
            r='42'
            fill='none'
            stroke='var(--color-surface-inset)'
            strokeWidth='11'
          />
          {clientLen > 0 && (
            <circle
              cx='50'
              cy='50'
              r='42'
              fill='none'
              stroke='url(#origin-fill)'
              strokeWidth='11'
              strokeLinecap='round'
              strokeDasharray={`${clientLen} ${CIRC}`}
              transform='rotate(-90 50 50)'
            />
          )}
          <defs>
            <linearGradient id='origin-fill' x1='0' y1='0' x2='1' y2='1'>
              <stop offset='0%' stopColor='var(--color-pitch-600)' />
              <stop offset='100%' stopColor='var(--color-pitch-400)' />
            </linearGradient>
          </defs>
          <text
            x='50'
            y='48'
            textAnchor='middle'
            dominantBaseline='central'
            fontSize='18'
            fontWeight='700'
            fill='var(--color-text)'
            className='nums'
          >
            {clientPct}%
          </text>
          <text
            x='50'
            y='63'
            textAnchor='middle'
            fontSize='7.5'
            fill='var(--color-text-muted)'
          >
            del cliente
          </text>
        </svg>

        <ul className='flex flex-1 flex-col gap-2.5'>
          <li className='flex items-center gap-2.5'>
            <span
              className='h-2.5 w-2.5 rounded-full bg-pitch-500'
              aria-hidden
            />
            <span className='flex-1 text-sm'>Cliente</span>
            <span className='nums text-sm font-semibold'>
              {origin.client.total}
            </span>
            <span className='nums w-10 text-right text-xs text-text-muted'>
              {clientPct}%
            </span>
          </li>
          <li className='flex items-center gap-2.5'>
            <span
              className='h-2.5 w-2.5 rounded-full bg-graphite-300'
              aria-hidden
            />
            <span className='flex-1 text-sm'>Negocio</span>
            <span className='nums text-sm font-semibold'>
              {origin.business.total}
            </span>
            <span className='nums w-10 text-right text-xs text-text-muted'>
              {total > 0 ? 100 - clientPct : 0}%
            </span>
          </li>
        </ul>
      </div>

      <div className='mt-5 flex flex-col gap-3.5'>
        <StackedBar
          breakdown={origin.client}
          label='Creadas por el cliente'
          total={total}
        />
        <StackedBar
          breakdown={origin.business}
          label='Creadas por el negocio'
          total={total}
        />
      </div>

      <ul className='mt-3 flex flex-wrap gap-x-4 gap-y-1'>
        {SEGMENTS.filter(
          (s) => origin.client[s.key] + origin.business[s.key] > 0
        ).map((s) => (
          <li
            key={s.key}
            className='flex items-center gap-1.5 text-[10px] text-text-muted'
          >
            <span className={`h-2 w-2 rounded-full ${s.cls}`} aria-hidden />
            {s.label}
          </li>
        ))}
      </ul>
    </Card>
  )
}
