import { useCallback, useEffect, useMemo, useState } from 'react'
import { Page } from '@/components/layout/page'
import { Alert } from '@/components/common/alert'
import { Button } from '@/components/common/button'
import { Card } from '@/components/common/card'
import { FilterIcon, ChartIcon } from '@/components/common/icon'
import { useBusinessId } from '@/hooks/use-business-id'
import { fetchDashboardMetrics } from '@/services/metrics'
import { metricsRange, metricsRangeLabel, PERIOD_OPTIONS } from '@/lib/metrics'
import { ReservationsCard } from '@/components/admin/metrics/reservations-card'
import { SlaCard } from '@/components/admin/metrics/sla-card'
import { HeatmapCard } from '@/components/admin/metrics/heatmap-card'
import { OriginCard } from '@/components/admin/metrics/origin-card'
import { ClientsCard } from '@/components/admin/metrics/clients-card'
import { FiltersSheet } from '@/components/admin/metrics/filters-sheet'
import type { DashboardData, DashboardPeriodKey } from '@/types'

type Section = 'reservas' | 'clientes'

export function AdminMetricsPage() {
  const businessId = useBusinessId()
  const [period, setPeriod] = useState<DashboardPeriodKey>('30d')
  const [resourceIds, setResourceIds] = useState<string[]>([])
  const [section, setSection] = useState<Section>('reservas')
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const range = useMemo(() => metricsRange(period), [period])
  const periodLabel =
    PERIOD_OPTIONS.find((p) => p.key === period)?.label ?? period

  const load = useCallback(async () => {
    if (!businessId) return
    setLoading(true)
    setError(null)
    try {
      const d = await fetchDashboardMetrics(
        businessId,
        range.from,
        range.to,
        resourceIds
      )
      setData(d)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar métricas')
    }
    setLoading(false)
  }, [businessId, range, resourceIds])

  useEffect(() => {
    void load()
  }, [load])

  function toggleResource(id: string) {
    setResourceIds((prev) =>
      prev.includes(id) ? prev.filter((r) => r !== id) : [...prev, id]
    )
  }

  const resourceSummary = useMemo(() => {
    if (!data) return ''
    if (resourceIds.length === 0) return 'Todos los recursos'
    if (data.resources.length <= 1) return data.resources[0]?.name ?? ''
    const names = data.resources
      .filter((r) => resourceIds.includes(r.id))
      .map((r) => r.name)
    return names.join(', ')
  }, [data, resourceIds])

  return (
    <Page>
      {/* Header */}
      <div className='animate-fade-up'>
        <div className='flex items-center gap-2'>
          <ChartIcon size={20} className='text-pitch-600 dark:text-pitch-400' />
          <h1 className='text-2xl font-bold tracking-tight'>Métricas</h1>
        </div>
        <p className='text-sm text-(--color-text-muted) mt-0.5'>
          Cómo se mueve el negocio en el periodo.
        </p>
      </div>

      {/* Barra de contexto: rango visible + recursos + filtros */}
      <div className='flex items-center gap-2 rounded-xl border border-border bg-surface-elevated px-4 py-2.5 shadow-(--shadow-xs)'>
        <div className='min-w-0 flex-1'>
          <p className='nums truncate text-[13px] font-medium'>
            {metricsRangeLabel(range.from, range.to)}
          </p>
          <p className='truncate text-[11px] text-text-muted'>
            {periodLabel}
            {resourceSummary && ` · ${resourceSummary}`}
          </p>
        </div>
        <Button
          variant='secondary'
          size='sm'
          className='shrink-0'
          onClick={() => setFiltersOpen(true)}
        >
          <FilterIcon size={14} />
          Filtros
        </Button>
      </div>

      {/* Toggle de sección — solo mobile; en desktop se apilan */}
      <div
        className='flex gap-1 rounded-full bg-surface-inset p-1 sm:hidden'
        role='tablist'
      >
        {(
          [
            ['reservas', 'Reservas'],
            ['clientes', 'Clientes']
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            role='tab'
            aria-selected={section === key}
            onClick={() => setSection(key)}
            className={`flex-1 rounded-full px-3 py-2 text-sm font-medium transition-colors touch-target ${
              section === key
                ? 'bg-surface-elevated text-(--color-text) shadow-(--shadow-xs)'
                : 'text-text-muted'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {error && (
        <Alert variant='error' onDismiss={() => setError(null)}>
          {error}
        </Alert>
      )}

      {loading && (
        <div className='flex flex-col gap-4'>
          <div className='h-44 skeleton rounded-xl' />
          <div className='h-40 skeleton rounded-xl' />
          <div className='h-56 skeleton rounded-xl' />
        </div>
      )}

      {!loading && data && (
        <>
          {/* ── Reservas ─────────────────────────────────────────── */}
          <section
            className={`flex flex-col gap-4 ${
              section === 'reservas' ? '' : 'hidden sm:flex'
            }`}
          >
            <h2 className='hidden text-xs font-medium uppercase tracking-[0.14em] text-text-muted sm:block'>
              Reservas
            </h2>
            <div className='grid gap-4 lg:grid-cols-2'>
              <ReservationsCard
                trend={data.trend}
                total={data.totals.current}
                previous={data.totals.previous}
                periodLabel={periodLabel}
                rangeLabel={metricsRangeLabel(range.from, range.to)}
              />
              <SlaCard sla={data.sla} holdMinutes={data.period.holdMinutes} />
            </div>
            <HeatmapCard
              heatmap={data.heatmap}
              businessHours={data.businessHours}
              periodFrom={range.from}
              periodTo={range.to}
            />
          </section>

          {/* ── Clientes ─────────────────────────────────────────── */}
          <section
            className={`flex flex-col gap-4 ${
              section === 'clientes' ? '' : 'hidden sm:flex'
            }`}
          >
            <h2 className='hidden text-xs font-medium uppercase tracking-[0.14em] text-text-muted sm:block'>
              Clientes
            </h2>
            <div className='grid items-start gap-4 lg:grid-cols-2'>
              <ClientsCard
                topClients={data.topClients}
                businessId={businessId!}
                from={range.from}
                to={range.to}
                resourceIds={resourceIds}
              />
              <OriginCard origin={data.origin} />
            </div>
          </section>
        </>
      )}

      {!loading && !data && !error && (
        <Card className='p-8 text-center text-sm text-text-muted'>
          Sin datos para mostrar.
        </Card>
      )}

      {filtersOpen && (
        <FiltersSheet
          period={period}
          onPeriodChange={setPeriod}
          resources={data?.resources ?? []}
          selectedResources={resourceIds}
          onToggleResource={toggleResource}
          onClearResources={() => setResourceIds([])}
          rangeLabel={metricsRangeLabel(range.from, range.to)}
          onClose={() => setFiltersOpen(false)}
        />
      )}
    </Page>
  )
}
