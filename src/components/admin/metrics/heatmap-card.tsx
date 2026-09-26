import { useMemo, useState } from 'react'
import { Card } from '@/components/common/card'
import { Button } from '@/components/common/button'
import { ScheduleIcon, ExpandIcon } from '@/components/common/icon'
import { MetricsSheet } from '@/components/admin/metrics/sheet'
import type { DashboardBusinessHours, DashboardData } from '@/types'

type Heatmap = DashboardData['heatmap']
type Mode = 'day' | 'week' | 'month'

const DOW_LABEL = ['', 'L', 'M', 'X', 'J', 'V', 'S', 'D']
const MODE_LABEL: Record<Mode, string> = {
  day: 'Día',
  week: 'Semana',
  month: 'Mes'
}

/** ¿La hora `h` (0-23) está abierta el día `dow` (isodow)? */
function isOpen(hours: DashboardBusinessHours[], dow: number, h: number) {
  return hours.some(
    (b) => b.dow === dow && h >= parseInt(b.open) && h < parseInt(b.close)
  )
}

/** ¿La hora `h` está abierta al menos un día de la semana? */
function isOpenAnyDay(hours: DashboardBusinessHours[], h: number) {
  return hours.some((b) => h >= parseInt(b.open) && h < parseInt(b.close))
}

/**
 * Franja horaria del negocio: desde la apertura más temprana hasta el
 * cierre más tardío, horas contiguas. Los huecos internos (negocio que
 * cierra al mediodía) quedan dentro para mostrarse como "cerrado".
 */
function hourBand(hours: DashboardBusinessHours[]): number[] {
  if (hours.length === 0) return []
  const min = Math.min(...hours.map((b) => parseInt(b.open)))
  const max = Math.max(...hours.map((b) => parseInt(b.close)))
  return Array.from({ length: max - min }, (_, i) => min + i)
}

/** Intensidad 0-4 → verde marca con alpha creciente (sirve en ambos temas). */
function heatBg(level: number): string {
  return `rgba(52, 211, 153, ${[0.07, 0.16, 0.35, 0.6, 0.9][level]})`
}

function level(v: number, max: number): number {
  if (v <= 0 || max <= 0) return 0
  const r = v / max
  if (r < 0.25) return 1
  if (r < 0.5) return 2
  if (r < 0.75) return 3
  return 4
}

/**
 * "Cerrado" = trama diagonal neutra, claramente distinta de la escala
 * verde de intensidad: celda apagada/rayada, no "pocas reservas".
 */
const CLOSED_STYLE = {
  background:
    'repeating-linear-gradient(45deg, var(--color-surface-inset) 0px, var(--color-surface-inset) 3px, var(--color-border) 3px, var(--color-border) 4.5px)'
}

/** Leyenda compartida: escala de intensidad + muestra de "cerrado". */
function HeatLegend() {
  return (
    <div className='mt-3 flex items-center gap-2 text-[10px] text-text-muted'>
      <span>Menos</span>
      <span className='flex gap-0.5' aria-hidden>
        {[0, 1, 2, 3, 4].map((l) => (
          <span
            key={l}
            className='h-2.5 w-3.5 rounded-[3px]'
            style={{ background: heatBg(l) }}
          />
        ))}
      </span>
      <span>Más</span>
      <span className='ml-3 flex items-center gap-1.5'>
        <span
          className='h-2.5 w-3.5 rounded-[3px]'
          style={CLOSED_STYLE}
          aria-hidden
        />
        cerrado
      </span>
    </div>
  )
}

/**
 * Grid semanal (orientación del mockup): columnas = los 7 días,
 * filas = horas de la franja de atención. Todos los días aparecen;
 * los cerrados y los huecos sin reservas se muestran, no se ocultan.
 */
function WeekGrid({
  week,
  hours,
  compact
}: {
  week: Heatmap['week']
  hours: DashboardBusinessHours[]
  compact?: boolean
}) {
  const band = hourBand(hours)
  const byCell = new Map(week.map((c) => [`${c.dow}-${c.hour}`, c]))
  const max = Math.max(...week.map((c) => c.avg), 0)

  if (band.length === 0) return null

  return (
    <div
      className='grid gap-1'
      style={{ gridTemplateColumns: 'auto repeat(7, minmax(0,1fr))' }}
      role='img'
      aria-label='Ocupación por día y hora'
    >
      <span />
      {[1, 2, 3, 4, 5, 6, 7].map((dow) => (
        <span
          key={dow}
          className='text-center text-[9.5px] font-semibold uppercase text-text-muted'
        >
          {DOW_LABEL[dow]}
        </span>
      ))}
      {band.map((h) => (
        <div key={h} className='contents'>
          <span className='nums flex items-center justify-end pr-1.5 text-[9px] text-text-muted'>
            {h}:00
          </span>
          {[1, 2, 3, 4, 5, 6, 7].map((dow) => {
            const open = isOpen(hours, dow, h)
            const cell = byCell.get(`${dow}-${h}`)
            const lv = open && cell ? level(cell.avg, max) : 0
            return (
              <div
                key={dow}
                title={
                  !open
                    ? `${DOW_LABEL[dow]} ${h}:00 — cerrado`
                    : cell
                      ? `${DOW_LABEL[dow]} ${h}:00 — ${cell.avg} reservas/jornada (${cell.total} total)`
                      : `${DOW_LABEL[dow]} ${h}:00 — sin reservas`
                }
                className={`${compact ? 'h-4' : 'h-7'} rounded`}
                style={open ? { background: heatBg(lv) } : CLOSED_STYLE}
              />
            )
          })}
        </div>
      ))}
    </div>
  )
}

/**
 * Vista Día: tira vertical dentro de la franja de atención (apertura
 * más temprana → cierre más tardío). Los huecos internos cerrados se
 * muestran en gris; solo se recorta lo que está fuera de la franja.
 */
function DayStrip({
  day,
  hours
}: {
  day: Heatmap['day']
  hours: DashboardBusinessHours[]
}) {
  const byHour = new Map(day.map((c) => [c.hour, c]))
  const max = Math.max(...day.map((c) => c.avg), 0)
  const band = hourBand(hours)
  if (band.length === 0) return null

  return (
    <ul className='flex flex-col gap-1'>
      {band.map((h) => {
        const open = isOpenAnyDay(hours, h)
        const cell = byHour.get(h)
        const lv = open && cell ? level(cell.avg, max) : 0
        return (
          <li key={h} className='flex items-center gap-3'>
            <span className='nums w-10 shrink-0 text-right text-[11px] text-text-muted'>
              {h}:00
            </span>
            <div
              title={
                !open
                  ? 'Cerrado'
                  : cell
                    ? `${cell.avg} reservas/jornada (${cell.total} total)`
                    : 'Sin reservas'
              }
              className='flex h-7 flex-1 items-center justify-end rounded-md px-2'
              style={open ? { background: heatBg(lv) } : CLOSED_STYLE}
            >
              {cell && open && (
                <span className='nums text-[10px] font-semibold text-graphite-900'>
                  {cell.avg}
                </span>
              )}
            </div>
          </li>
        )
      })}
    </ul>
  )
}

const fmtDate = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

/**
 * Vista Mes: siempre el mes calendario completo que contiene el fin del
 * periodo (del 1 al último día, con los días del mes anterior/siguiente
 * que completan las semanas, atenuados). Dentro del mes, los días fuera
 * del rango seleccionado quedan apagados — no son "sin reservas".
 */
function MonthCalendar({
  month,
  hours,
  from,
  to
}: {
  month: Heatmap['month']
  hours: DashboardBusinessHours[]
  from: string
  to: string
}) {
  const byDate = new Map(month.map((c) => [c.date, c.total]))
  const max = Math.max(...month.map((c) => c.total), 0)
  const openDows = new Set(hours.map((b) => b.dow))

  const cells = useMemo(() => {
    const end = new Date(`${to}T12:00:00`)
    const first = new Date(end.getFullYear(), end.getMonth(), 1, 12)
    const last = new Date(end.getFullYear(), end.getMonth() + 1, 0, 12)
    // Relleno para completar semanas (lunes=0 … domingo=6)
    const lead = (first.getDay() + 6) % 7
    const trail = (7 - ((last.getDay() + 6) % 7) - 1) % 7
    const out: Array<{ date: string; inMonth: boolean }> = []
    for (let i = lead; i > 0; i--) {
      const d = new Date(first)
      d.setDate(d.getDate() - i)
      out.push({ date: fmtDate(d), inMonth: false })
    }
    for (let d = new Date(first); d <= last; d.setDate(d.getDate() + 1))
      out.push({ date: fmtDate(d), inMonth: true })
    for (let i = 1; i <= trail; i++) {
      const d = new Date(last)
      d.setDate(d.getDate() + i)
      out.push({ date: fmtDate(d), inMonth: false })
    }
    return out
  }, [to])

  return (
    <div>
      <div className='grid grid-cols-7 gap-1 text-center text-[9.5px] font-semibold uppercase text-text-muted'>
        {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map((d) => (
          <span key={d}>{d}</span>
        ))}
      </div>
      <div className='mt-1 grid grid-cols-7 gap-1'>
        {cells.map(({ date: d, inMonth }) => {
          const inRange = d >= from && d <= to
          const dow = ((new Date(`${d}T12:00:00`).getDay() + 6) % 7) + 1
          const open = openDows.has(dow)
          const total = inRange ? byDate.get(d) : undefined
          const lv = inRange && open && total ? level(total, max) : 0
          const muted = !inRange
          return (
            <div
              key={d}
              title={
                !inRange
                  ? `${d} — fuera del periodo`
                  : !open
                    ? `${d} — cerrado`
                    : total
                      ? `${d}: ${total} reservas`
                      : `${d} — sin reservas`
              }
              className={`flex h-8 items-center justify-center rounded-md nums text-[10px] font-semibold ${
                muted
                  ? 'text-text-muted/40'
                  : !open
                    ? 'text-text-muted/60'
                    : lv >= 3
                      ? 'text-white'
                      : 'text-graphite-900'
              } ${!inMonth ? 'opacity-70' : ''}`}
              style={
                muted
                  ? undefined
                  : open
                    ? { background: heatBg(lv) }
                    : CLOSED_STYLE
              }
            >
              {parseInt(d.slice(8))}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export function HeatmapCard({
  heatmap,
  businessHours,
  periodFrom,
  periodTo
}: {
  heatmap: Heatmap
  businessHours: DashboardBusinessHours[]
  periodFrom: string
  periodTo: string
}) {
  const [open, setOpen] = useState(false)
  const [mode, setMode] = useState<Mode>('week')
  const empty =
    heatmap.day.length + heatmap.week.length + heatmap.month.length === 0

  return (
    <>
      <Card className='p-5'>
        <div className='flex items-center gap-2'>
          <ScheduleIcon size={16} className='shrink-0 text-text-muted' />
          <h2 className='min-w-0 flex-1 truncate text-xs font-medium uppercase tracking-[0.14em] text-text-muted'>
            Ocupación por horario
          </h2>
          {!empty && (
            <Button
              variant='ghost'
              size='sm'
              className='shrink-0'
              onClick={() => setOpen(true)}
            >
              <ExpandIcon size={14} />
              <span className='hidden sm:inline'>Ampliar</span>
            </Button>
          )}
        </div>
        <p className='mt-1 text-[11px] text-text-muted'>
          Solo confirmadas y completadas · horario de atención.
        </p>
        {empty ? (
          <p className='py-8 text-center text-sm text-text-muted'>
            Sin reservas confirmadas en el periodo.
          </p>
        ) : (
          <div className='mt-4'>
            <WeekGrid week={heatmap.week} hours={businessHours} compact />
            <HeatLegend />
          </div>
        )}
      </Card>

      {open && (
        <MetricsSheet
          title='Ocupación por horario'
          onClose={() => setOpen(false)}
        >
          <div
            className='mb-4 flex gap-1 rounded-full bg-surface-inset p-1'
            role='tablist'
          >
            {(Object.keys(MODE_LABEL) as Mode[]).map((m) => (
              <button
                key={m}
                role='tab'
                aria-selected={mode === m}
                onClick={() => setMode(m)}
                className={`flex-1 rounded-full px-3 py-1.5 text-xs font-medium transition-colors touch-target ${
                  mode === m
                    ? 'bg-surface-elevated text-(--color-text) shadow-(--shadow-xs)'
                    : 'text-text-muted hover:text-(--color-text)'
                }`}
              >
                {MODE_LABEL[m]}
              </button>
            ))}
          </div>

          {mode === 'day' && (
            <>
              <DayStrip day={heatmap.day} hours={businessHours} />
              <HeatLegend />
              <p className='mt-4 text-[11px] leading-snug text-text-muted'>
                Promedio de reservas por hora sobre todas las jornadas del
                periodo — las horas calientes sin importar el día.
              </p>
            </>
          )}
          {mode === 'week' && (
            <>
              <WeekGrid week={heatmap.week} hours={businessHours} />
              <HeatLegend />
              <p className='mt-4 text-[11px] leading-snug text-text-muted'>
                Promedio por día de la semana y hora en el periodo.
              </p>
            </>
          )}
          {mode === 'month' && (
            <>
              <MonthCalendar
                month={heatmap.month}
                hours={businessHours}
                from={periodFrom}
                to={periodTo}
              />
              <HeatLegend />
              <p className='mt-4 text-[11px] leading-snug text-text-muted'>
                Mes completo del calendario · los días atenuados están fuera del
                periodo seleccionado.
              </p>
            </>
          )}
        </MetricsSheet>
      )}
    </>
  )
}
