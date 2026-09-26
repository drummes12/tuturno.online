import { MetricsSheet } from '@/components/admin/metrics/sheet'
import { Button } from '@/components/common/button'
import { CheckIcon } from '@/components/common/icon'
import { PERIOD_OPTIONS } from '@/lib/metrics'
import type { DashboardPeriodKey } from '@/types'

export function FiltersSheet({
  period,
  onPeriodChange,
  resources,
  selectedResources,
  onToggleResource,
  onClearResources,
  rangeLabel,
  onClose
}: {
  period: DashboardPeriodKey
  onPeriodChange: (key: DashboardPeriodKey) => void
  resources: Array<{ id: string; name: string }>
  selectedResources: string[]
  onToggleResource: (id: string) => void
  onClearResources: () => void
  rangeLabel: string
  onClose: () => void
}) {
  return (
    <MetricsSheet title='Filtros' onClose={onClose}>
      <section>
        <h3 className='mb-2.5 text-[10.5px] font-semibold uppercase tracking-[0.16em] text-text-muted'>
          Periodo
        </h3>
        <div className='flex flex-col gap-1'>
          {PERIOD_OPTIONS.map((p) => (
            <button
              key={p.key}
              type='button'
              onClick={() => onPeriodChange(p.key)}
              className={`flex items-center justify-between rounded-xl px-4 py-3 text-left text-sm font-medium transition-colors touch-target ${
                period === p.key
                  ? 'bg-pitch-500/12 text-pitch-700 dark:bg-pitch-500/15 dark:text-pitch-300'
                  : 'hover:bg-surface-inset'
              }`}
            >
              {p.label}
              {period === p.key && <CheckIcon size={16} />}
            </button>
          ))}
        </div>
        <p className='mt-2 px-1 text-[11px] text-text-muted nums'>
          {rangeLabel}
        </p>
      </section>

      {resources.length > 1 && (
        <section className='mt-6'>
          <div className='mb-2.5 flex items-center justify-between'>
            <h3 className='text-[10.5px] font-semibold uppercase tracking-[0.16em] text-text-muted'>
              Recursos
            </h3>
            {selectedResources.length > 0 && (
              <button
                type='button'
                onClick={onClearResources}
                className='text-[11px] font-medium text-pitch-700 dark:text-pitch-300'
              >
                Todas
              </button>
            )}
          </div>
          <div className='flex flex-col gap-1'>
            {resources.map((r) => {
              const active = selectedResources.includes(r.id)
              return (
                <button
                  key={r.id}
                  type='button'
                  onClick={() => onToggleResource(r.id)}
                  aria-pressed={active}
                  className={`flex items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-medium transition-colors touch-target ${
                    active
                      ? 'bg-pitch-500/12 text-pitch-700 dark:bg-pitch-500/15 dark:text-pitch-300'
                      : 'hover:bg-surface-inset'
                  }`}
                >
                  <span
                    className={`flex h-5 w-5 items-center justify-center rounded-md border transition-colors ${
                      active
                        ? 'border-pitch-500 bg-pitch-500 text-white'
                        : 'border-border-strong'
                    }`}
                    aria-hidden
                  >
                    {active && <CheckIcon size={12} strokeWidth={3} />}
                  </span>
                  {r.name}
                </button>
              )
            })}
          </div>
        </section>
      )}

      <Button className='mt-6 w-full' onClick={onClose}>
        Aplicar
      </Button>
    </MetricsSheet>
  )
}
