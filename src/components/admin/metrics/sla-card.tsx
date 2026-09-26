import { Card } from '@/components/common/card'
import { TimerIcon } from '@/components/common/icon'
import type { DashboardSla } from '@/types'

function fmtMinutes(min: number | null): string {
  if (min === null) return '—'
  if (min < 60) return `${Math.round(min)} min`
  const h = min / 60
  return `${h >= 10 ? Math.round(h) : h.toFixed(1)} h`
}

function fmtHold(minutes: number): string {
  if (minutes < 60) return `${minutes} min`
  const h = minutes / 60
  return `${Number.isInteger(h) ? h : h.toFixed(1)} h`
}

/**
 * SLA de solicitudes del cliente: velocímetro del tiempo promedio de
 * respuesta contra el hold configurado + barra de desenlace.
 */
export function SlaCard({
  sla,
  holdMinutes
}: {
  sla: DashboardSla
  holdMinutes: number
}) {
  const answered = sla.confirmed + sla.rejected
  const pctOfHold =
    sla.avgResponseMinutes !== null && holdMinutes > 0
      ? Math.min(sla.avgResponseMinutes / holdMinutes, 1)
      : 0
  const onTimePct =
    answered + sla.expired > 0
      ? Math.round((sla.onTime / (answered + sla.expired)) * 100)
      : null

  // Semicírculo: arco de 180° — r=80 en un viewBox 180x100
  const R = 80
  const CX = 90
  const CY = 92
  const arcLen = Math.PI * R
  const fillLen = arcLen * pctOfHold
  // Ángulo del marcador (0=izquierda, π=derecha)
  const angle = Math.PI * (1 - pctOfHold)
  const mx = CX + R * Math.cos(angle)
  const my = CY - R * Math.sin(angle)

  const segments = [
    { key: 'Confirmadas', n: sla.confirmed, cls: 'bg-pitch-500' },
    { key: 'Rechazadas', n: sla.rejected, cls: 'bg-signal-orange' },
    { key: 'Vencidas', n: sla.expired, cls: 'bg-signal-red/70' }
  ]
  const total = segments.reduce((a, s) => a + s.n, 0)

  return (
    <Card className='p-5'>
      <div className='flex items-center gap-2'>
        <TimerIcon size={16} className='shrink-0 text-text-muted' />
        <h2 className='min-w-0 flex-1 truncate text-xs font-medium uppercase tracking-[0.14em] text-text-muted'>
          Respuesta a solicitudes
        </h2>
      </div>
      <p className='mt-1 text-[11px] text-text-muted'>
        Solo reservas creadas por clientes ({sla.requests} en el periodo).
      </p>

      <div className='mt-2 flex items-center gap-5'>
        {/* Velocímetro: consumo del hold configurado */}
        <svg
          viewBox='0 0 180 100'
          className='w-36 shrink-0'
          role='img'
          aria-label={`Tiempo promedio de respuesta: ${fmtMinutes(sla.avgResponseMinutes)} de un máximo de ${fmtHold(holdMinutes)}`}
        >
          <defs>
            <linearGradient id='gauge-fill' x1='0' y1='0' x2='1' y2='0'>
              <stop offset='0%' stopColor='var(--color-pitch-700)' />
              <stop offset='100%' stopColor='var(--color-pitch-400)' />
            </linearGradient>
          </defs>
          <path
            d={`M ${CX - R} ${CY} A ${R} ${R} 0 0 1 ${CX + R} ${CY}`}
            fill='none'
            stroke='var(--color-surface-inset)'
            strokeWidth='14'
            strokeLinecap='round'
          />
          {pctOfHold > 0 && (
            <path
              d={`M ${CX - R} ${CY} A ${R} ${R} 0 0 1 ${CX + R} ${CY}`}
              fill='none'
              stroke='url(#gauge-fill)'
              strokeWidth='14'
              strokeLinecap='round'
              strokeDasharray={`${fillLen} ${arcLen}`}
            />
          )}
          {sla.avgResponseMinutes !== null && (
            <circle
              cx={mx}
              cy={my}
              r='5'
              fill='var(--color-pitch-600)'
              stroke='var(--color-surface-elevated)'
              strokeWidth='2'
            />
          )}
          <text
            x={CX}
            y={CY - 18}
            textAnchor='middle'
            className='nums'
            fontSize='22'
            fontWeight='700'
            fill='var(--color-text)'
          >
            {fmtMinutes(sla.avgResponseMinutes)}
          </text>
          <text
            x={CX}
            y={CY - 2}
            textAnchor='middle'
            fontSize='9.5'
            fill='var(--color-text-muted)'
          >
            promedio · máx {fmtHold(holdMinutes)}
          </text>
        </svg>

        <div className='min-w-0 flex-1'>
          {onTimePct !== null && (
            <p className='text-sm'>
              <span className='nums text-2xl font-bold text-pitch-600 dark:text-pitch-400'>
                {onTimePct}%
              </span>{' '}
              <span className='text-text-muted'>a tiempo</span>
            </p>
          )}
          <p className='mt-1 text-[11px] leading-snug text-text-muted'>
            {sla.onTime} de {answered + sla.expired} respondidas antes de vencer
            {sla.prev.requests > 0 && sla.prev.avgResponseMinutes !== null && (
              <>
                {' '}
                · antes:{' '}
                <span className='whitespace-nowrap'>
                  {fmtMinutes(sla.prev.avgResponseMinutes)}
                </span>
              </>
            )}
          </p>
          {sla.pending > 0 && (
            <p className='mt-1 text-[11px] text-signal-orange nums'>
              {sla.pending} aún sin respuesta
            </p>
          )}
        </div>
      </div>

      {/* Barra de desenlace */}
      {total > 0 && (
        <div className='mt-4'>
          <div
            className='flex h-2.5 w-full overflow-hidden rounded-full bg-surface-inset'
            role='img'
            aria-label={segments.map((s) => `${s.key}: ${s.n}`).join(', ')}
          >
            {segments.map(
              (s) =>
                s.n > 0 && (
                  <div
                    key={s.key}
                    className={`${s.cls} h-full transition-all`}
                    style={{ width: `${(s.n / total) * 100}%` }}
                  />
                )
            )}
          </div>
          <ul className='mt-2 flex flex-wrap gap-x-4 gap-y-1'>
            {segments.map((s) => (
              <li
                key={s.key}
                className='flex items-center gap-1.5 text-[11px] text-text-muted'
              >
                <span className={`h-2 w-2 rounded-full ${s.cls}`} aria-hidden />
                {s.key}
                <span className='nums font-semibold text-(--color-text)'>
                  {s.n}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  )
}
