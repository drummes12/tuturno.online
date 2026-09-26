import { useMemo } from 'react'
import { Card } from '@/components/common/card'
import { TrendUpIcon, TrendDownIcon } from '@/components/common/icon'
import type { DashboardTrendPoint } from '@/types'

/** Catmull-Rom → cubic bezier: la curva suave del mockup. */
function smoothPath(points: Array<{ x: number; y: number }>): string {
  if (points.length < 2) return ''
  let d = `M ${points[0].x} ${points[0].y}`
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(0, i - 1)]
    const p1 = points[i]
    const p2 = points[i + 1]
    const p3 = points[Math.min(points.length - 1, i + 2)]
    const c1x = p1.x + (p2.x - p0.x) / 6
    const c1y = p1.y + (p2.y - p0.y) / 6
    const c2x = p2.x - (p3.x - p1.x) / 6
    const c2y = p2.y - (p3.y - p1.y) / 6
    d += ` C ${c1x} ${c1y}, ${c2x} ${c2y}, ${p2.x} ${p2.y}`
  }
  return d
}

const W = 340
const H = 120
const PAD_X = 4
const PAD_TOP = 14
const PAD_BOTTOM = 8

export function ReservationsCard({
  trend,
  total,
  previous,
  periodLabel,
  rangeLabel
}: {
  trend: DashboardTrendPoint[]
  total: number
  previous: number
  periodLabel: string
  rangeLabel: string
}) {
  const delta =
    previous > 0 ? Math.round(((total - previous) / previous) * 100) : null
  const hasPrev = trend.some((p) => p.prev > 0)

  const { areaPath, linePath, prevPath } = useMemo(() => {
    if (trend.length === 0) return { areaPath: '', linePath: '', prevPath: '' }
    const all = trend.flatMap((p) => [p.n, p.prev])
    const max = Math.max(...all, 1)
    const x = (i: number) =>
      PAD_X + (i / Math.max(trend.length - 1, 1)) * (W - PAD_X * 2)
    const y = (v: number) =>
      PAD_TOP + (1 - v / max) * (H - PAD_TOP - PAD_BOTTOM)
    const cur = trend.map((p, i) => ({ x: x(i), y: y(p.n) }))
    const line = smoothPath(cur)
    const area = `${line} L ${cur[cur.length - 1].x} ${H} L ${cur[0].x} ${H} Z`
    const prev = hasPrev
      ? smoothPath(trend.map((p, i) => ({ x: x(i), y: y(p.prev) })))
      : ''
    return { areaPath: area, linePath: line, prevPath: prev }
  }, [trend, hasPrev])

  return (
    <Card className='relative overflow-hidden'>
      {/* Glow de marca sobre la curva, como el radial del mockup */}
      <div
        className='pointer-events-none absolute -top-16 right-0 h-44 w-44 rounded-full opacity-60 dark:opacity-40'
        style={{
          background:
            'radial-gradient(circle, rgba(52,211,153,0.18), transparent 70%)'
        }}
        aria-hidden
      />
      <div className='relative'>
        <div className='flex items-start justify-between gap-3 px-5 pt-5'>
          <div>
            <div className='flex items-baseline gap-2'>
              {/* Número hero — degradado de marca, único acento grande */}
              <span
                className='nums text-[38px] font-bold leading-none tracking-tight'
                style={{
                  background:
                    'linear-gradient(135deg, var(--color-pitch-600), var(--color-pitch-400))',
                  WebkitBackgroundClip: 'text',
                  backgroundClip: 'text',
                  color: 'transparent'
                }}
              >
                {total}
              </span>
              {delta !== null && (
                <span
                  className={`flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[11px] font-semibold nums ${
                    delta >= 0
                      ? 'bg-pitch-500/15 text-pitch-700 dark:bg-pitch-500/20 dark:text-pitch-300'
                      : 'bg-signal-red/10 text-signal-red'
                  }`}
                >
                  {delta >= 0 ? (
                    <TrendUpIcon size={12} strokeWidth={2.25} />
                  ) : (
                    <TrendDownIcon size={12} strokeWidth={2.25} />
                  )}
                  {delta >= 0 ? '+' : ''}
                  {delta}%
                </span>
              )}
            </div>
            <p className='mt-1.5 text-[13px] font-medium text-text-muted'>
              reservas en el periodo
            </p>
          </div>
          <span className='rounded-full border border-border bg-surface-inset/80 px-2.5 py-1 text-[10px] font-medium uppercase tracking-widest text-text-muted nums backdrop-blur-sm'>
            {periodLabel}
          </span>
        </div>

        <svg
          viewBox={`0 0 ${W} ${H}`}
          className='mt-1 block h-28 w-full'
          preserveAspectRatio='none'
          aria-hidden
        >
          <defs>
            <linearGradient id='trend-fill' x1='0' y1='0' x2='0' y2='1'>
              <stop
                offset='0%'
                stopColor='var(--color-pitch-400)'
                stopOpacity='0.35'
              />
              <stop
                offset='100%'
                stopColor='var(--color-pitch-400)'
                stopOpacity='0.02'
              />
            </linearGradient>
          </defs>
          {areaPath && <path d={areaPath} fill='url(#trend-fill)' />}
          {linePath && (
            <path
              d={linePath}
              fill='none'
              stroke='var(--color-pitch-500)'
              strokeWidth='2.5'
              strokeLinecap='round'
            />
          )}
          {/* La comparación va encima: si coincide con la actual, se sigue viendo */}
          {prevPath && (
            <path
              d={prevPath}
              fill='none'
              stroke='var(--color-graphite-500)'
              strokeWidth='1.5'
              strokeDasharray='3 4'
              opacity='0.85'
            />
          )}
        </svg>

        <div className='flex items-center justify-between gap-2 px-5 pb-4'>
          <span className='text-[11px] text-text-muted nums'>{rangeLabel}</span>
          {hasPrev ? (
            <span className='flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-text-muted'>
              <svg width='16' height='4' aria-hidden className='shrink-0'>
                <line
                  x1='0'
                  y1='2'
                  x2='16'
                  y2='2'
                  stroke='var(--color-graphite-500)'
                  strokeWidth='1.5'
                  strokeDasharray='3 4'
                />
              </svg>
              periodo anterior
            </span>
          ) : (
            <span className='text-[10px] uppercase tracking-widest text-text-muted'>
              sin datos del periodo anterior
            </span>
          )}
        </div>
      </div>
    </Card>
  )
}
