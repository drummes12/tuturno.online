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
import { fetchDashboardClients } from '@/services/metrics'
import { formatLocal } from '@/lib/time'
import type { DashboardClientListRow, DashboardClientRow } from '@/types'

const PAGE_SIZE = 20

function ClientRow({
  name,
  since,
  reservations,
  completed
}: {
  name: string
  since: string
  reservations: number
  completed: number
}) {
  return (
    <li className='w-full flex items-center gap-3 py-2.5'>
      <span className='flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-pitch-500/15 text-xs font-semibold text-pitch-700 dark:bg-pitch-500/20 dark:text-pitch-300'>
        {name.slice(0, 2).toUpperCase()}
      </span>
      <div className='min-w-0 flex-1'>
        <p className='truncate text-sm font-medium'>{name}</p>
        <p className='truncate text-[11px] text-text-muted'>
          cliente desde {formatLocal(`${since}T12:00:00`, 'd MMM yyyy')}
        </p>
      </div>
      <div className='shrink-0 text-right'>
        <p className='nums text-sm font-bold'>
          {completed}
          <span className='font-normal text-text-muted'>/{reservations}</span>
        </p>
        <p className='text-[9px] uppercase tracking-wide text-text-muted'>
          completadas
        </p>
      </div>
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
            <ClientRow
              key={c.client_id}
              name={c.name}
              since={c.client_since}
              reservations={c.reservations}
              completed={c.completed}
            />
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
  topClients: DashboardClientRow[]
  businessId: string
  from: string
  to: string
  resourceIds?: string[]
}) {
  const [sheetOpen, setSheetOpen] = useState(false)

  return (
    <>
      <Card className='p-5'>
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
          <ul className='mt-2 divide-y divide-border'>
            {topClients.map((c) => (
              <ClientRow
                key={c.id}
                name={c.name}
                since={c.client_since}
                reservations={c.reservations}
                completed={c.completed}
              />
            ))}
          </ul>
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
