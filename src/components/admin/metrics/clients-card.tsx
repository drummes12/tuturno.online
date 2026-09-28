import { useCallback, useEffect, useRef, useState } from 'react'
import { Card } from '@/components/common/card'
import { Button } from '@/components/common/button'
import { Input } from '@/components/common/input'
import {
  UsersIcon,
  ChevronLeftIcon,
  ChevronRightIcon
} from '@/components/common/icon'
import { MetricsSheet } from '@/components/admin/metrics/sheet'
import { ChartDetail } from '@/components/admin/metrics/chart-detail'
import { useChartDetail } from '@/components/admin/metrics/use-chart-detail'
import { fetchDashboardClients } from '@/services/metrics'
import { formatLocal } from '@/lib/time'
import type { DashboardClientListRow } from '@/types'

const PAGE_SIZE = 20

/**
 * Desglose por cliente en 4 grupos — mismos colores que la barra de origen.
 * `cancelled` de la RPC agrupa rechazadas, expiradas y canceladas.
 */
const BUCKETS = [
  {
    key: 'completed',
    label: 'Completadas',
    one: 'completada',
    cls: 'bg-pitch-600'
  },
  {
    key: 'confirmed',
    label: 'Confirmadas',
    one: 'confirmada',
    cls: 'bg-pitch-300'
  },
  {
    key: 'pending',
    label: 'Pendientes',
    one: 'pendiente',
    cls: 'bg-signal-orange/80'
  },
  { key: 'lost', label: 'Perdidas', one: 'perdida', cls: 'bg-signal-red/70' }
] as const

type BucketKey = (typeof BUCKETS)[number]['key']

type ClientCounts = Pick<
  DashboardClientListRow,
  'reservations' | 'confirmed' | 'completed' | 'cancelled'
>

function clientBuckets(c: ClientCounts): Record<BucketKey, number> {
  return {
    completed: c.completed,
    confirmed: c.confirmed,
    pending: Math.max(
      0,
      c.reservations - c.confirmed - c.completed - c.cancelled
    ),
    lost: c.cancelled
  }
}

function clientSummary(client: DashboardClientListRow): string {
  const counts = clientBuckets(client)
  const parts = BUCKETS.filter((b) => counts[b.key] > 0).map(
    (b) =>
      `${counts[b.key]} ${counts[b.key] === 1 ? b.one : b.label.toLowerCase()}`
  )
  return `${client.reservations} reservas · ${parts.join(' · ')}`
}

function StatusBar({
  counts,
  active
}: {
  counts: Record<BucketKey, number>
  active?: boolean
}) {
  const total = BUCKETS.reduce((acc, b) => acc + counts[b.key], 0)
  if (total === 0) return null
  return (
    <div
      className={`mt-1.5 flex h-1.5 w-full overflow-hidden rounded-full bg-surface-inset transition-shadow group-hover:shadow-(--shadow-glow) ${
        active ? 'shadow-(--shadow-glow)' : ''
      }`}
      aria-hidden
    >
      {BUCKETS.map((b) =>
        counts[b.key] > 0 ? (
          <span
            key={b.key}
            className={`${b.cls} h-full`}
            style={{ width: `${(counts[b.key] / total) * 100}%` }}
          />
        ) : null
      )}
    </div>
  )
}

function ClientRow({
  client,
  bind,
  isActive
}: {
  client: DashboardClientListRow
  bind?: ReturnType<typeof useChartDetail>['bind']
  isActive?: (key: string) => boolean
}) {
  const key = `client-${client.client_id}`
  const active = isActive?.(key) ?? false
  const counts = clientBuckets(client)

  const content = (
    <>
      <span className='flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-pitch-500/15 text-xs font-semibold text-pitch-700 dark:bg-pitch-500/20 dark:text-pitch-300'>
        {client.name.slice(0, 2).toUpperCase()}
      </span>
      <div className='min-w-0 flex-1'>
        <p className='truncate text-sm font-medium'>{client.name}</p>
        <p className='truncate text-[11px] text-text-muted'>
          cliente desde{' '}
          {formatLocal(`${client.client_since}T12:00:00`, 'd MMM yyyy')}
        </p>
        <StatusBar counts={counts} active={active} />
      </div>
      <div className='shrink-0 text-right'>
        <p className='nums text-sm font-bold'>
          {client.completed}
          <span className='font-normal text-text-muted'>
            /{client.reservations}
          </span>
        </p>
        <p className='text-[9px] uppercase tracking-wide text-text-muted'>
          completadas
        </p>
      </div>
    </>
  )

  if (!bind) {
    return <li className='flex w-full items-center gap-3 py-2.5'>{content}</li>
  }

  return (
    <li>
      <button
        type='button'
        {...bind(key, client.name, clientSummary(client))}
        className={`group -mx-2 flex w-[calc(100%+1rem)] items-center gap-3 rounded-lg px-2 py-2.5 text-left transition-colors hover:bg-surface-inset/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--color-primary) ${
          active ? 'bg-surface-inset' : ''
        }`}
      >
        {content}
      </button>
    </li>
  )
}

function ClientsSheet({
  businessId,
  from,
  to,
  resourceIds,
  onClose
}: {
  businessId: string
  from: string
  to: string
  resourceIds?: string[]
  onClose: () => void
}) {
  const [rows, setRows] = useState<DashboardClientListRow[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(0)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null)

  const load = useCallback(
    async (pageIdx: number, q: string) => {
      setLoading(true)
      try {
        const res = await fetchDashboardClients(businessId, from, to, {
          resourceIds,
          search: q,
          limit: PAGE_SIZE,
          offset: pageIdx * PAGE_SIZE
        })
        setRows(res.rows)
        setTotal(res.total)
      } finally {
        setLoading(false)
      }
    },
    [businessId, from, to, resourceIds]
  )

  useEffect(() => {
    void load(0, '')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function handleSearch(value: string) {
    setSearch(value)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      setPage(0)
      void load(0, value)
    }, 350)
  }

  function goTo(pageIdx: number) {
    setPage(pageIdx)
    void load(pageIdx, search)
  }

  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  return (
    <MetricsSheet title='Todos los clientes' onClose={onClose}>
      <div data-autofocus>
        <Input
          label='Buscar'
          placeholder='Nombre o teléfono'
          value={search}
          onChange={(e) => handleSearch(e.target.value)}
        />
      </div>

      {loading ? (
        <p className='py-10 text-center text-sm text-text-muted'>Cargando…</p>
      ) : rows.length === 0 ? (
        <p className='py-10 text-center text-sm text-text-muted'>
          Sin clientes con reservas en el periodo.
        </p>
      ) : (
        <ul className='w-full divide-y divide-border'>
          {rows.map((c) => (
            <ClientRow key={c.client_id} client={c} />
          ))}
        </ul>
      )}

      {pages > 1 && (
        <div className='mt-4 flex items-center justify-between'>
          <Button
            variant='ghost'
            size='sm'
            disabled={page === 0 || loading}
            onClick={() => goTo(page - 1)}
          >
            <ChevronLeftIcon size={16} />
            Anterior
          </Button>
          <span className='nums text-[11px] text-text-muted'>
            {page + 1} / {pages} · {total} clientes
          </span>
          <Button
            variant='ghost'
            size='sm'
            disabled={page >= pages - 1 || loading}
            onClick={() => goTo(page + 1)}
          >
            Siguiente
            <ChevronRightIcon size={16} />
          </Button>
        </div>
      )}
    </MetricsSheet>
  )
}

export function ClientsCard({
  topClients,
  businessId,
  from,
  to,
  resourceIds
}: {
  topClients: DashboardClientListRow[]
  businessId: string
  from: string
  to: string
  resourceIds?: string[]
}) {
  const [sheetOpen, setSheetOpen] = useState(false)
  const { detail, bind, isActive } = useChartDetail()
  const presentBuckets = BUCKETS.filter((b) =>
    topClients.some((c) => clientBuckets(c)[b.key] > 0)
  )

  return (
    <>
      <Card className='h-full p-5'>
        <div className='flex items-center gap-2'>
          <UsersIcon size={16} className='shrink-0 text-text-muted' />
          <h2 className='min-w-0 flex-1 truncate text-xs font-medium uppercase tracking-[0.14em] text-text-muted'>
            Clientes top
          </h2>
          {topClients.length > 0 && (
            <Button
              variant='ghost'
              size='sm'
              className='shrink-0'
              onClick={() => setSheetOpen(true)}
            >
              Ver todos
              <ChevronRightIcon size={14} />
            </Button>
          )}
        </div>

        {topClients.length === 0 ? (
          <p className='py-8 text-center text-sm text-text-muted'>
            Sin clientes con reservas en el periodo.
          </p>
        ) : (
          <>
            <ul className='mt-2 divide-y divide-border'>
              {topClients.map((c) => (
                <ClientRow
                  key={c.client_id}
                  client={c}
                  bind={bind}
                  isActive={isActive}
                />
              ))}
            </ul>
            {presentBuckets.length > 1 && (
              <ul className='mt-3 flex flex-wrap gap-x-3 gap-y-1'>
                {presentBuckets.map((b) => (
                  <li
                    key={b.key}
                    className='flex items-center gap-1.5 text-[10px] text-text-muted'
                  >
                    <span
                      className={`h-2 w-2 rounded-full ${b.cls}`}
                      aria-hidden
                    />
                    {b.label}
                  </li>
                ))}
              </ul>
            )}
            <ChartDetail
              detail={detail}
              hint='Toca un cliente para ver el desglose de sus reservas'
            />
          </>
        )}
      </Card>

      {sheetOpen && (
        <ClientsSheet
          businessId={businessId}
          from={from}
          to={to}
          resourceIds={resourceIds}
          onClose={() => setSheetOpen(false)}
        />
      )}
    </>
  )
}
