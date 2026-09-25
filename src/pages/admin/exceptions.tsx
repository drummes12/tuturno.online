import {
  useState,
  useEffect,
  useCallback,
  useMemo,
  type CSSProperties
} from 'react'
import {
  fetchAvailabilityExceptions,
  createAvailabilityException,
  deleteAvailabilityException,
  countOverlappingReservations
} from '@/services/availability-exceptions'
import { fetchAllResources } from '@/services/resources'
import { fetchBusinessById } from '@/services/business'
import { useAuthStore } from '@/stores/auth'
import { useBusinessId } from '@/hooks/use-business-id'
import { useCanEdit } from '@/hooks/use-can-edit'
import { useIsOffline } from '@/hooks/use-connectivity'
import { Card } from '@/components/common/card'
import { Button } from '@/components/common/button'
import { Alert } from '@/components/common/alert'
import { PageLoader } from '@/components/common/spinner'
import { ReadOnlyNotice } from '@/components/common/read-only-notice'
import { BackLink } from '@/components/common/back-link'
import {
  LockIcon,
  TrashIcon,
  PlusIcon,
  CalendarIcon,
  ChevronDownIcon
} from '@/components/common/icon'
import type { AvailabilityException, Resource } from '@/types'
import { formatLocal, BUSINESS_TIMEZONE } from '@/lib/time'
import { fromZonedTime } from 'date-fns-tz'
import { format } from 'date-fns'
import { Page } from '@/components/layout/page'

type Scope = 'business' | 'resource'

function todayLocal(): string {
  return format(
    new Date(
      new Date().toLocaleString('en-US', { timeZone: BUSINESS_TIMEZONE })
    ),
    'yyyy-MM-dd'
  )
}

/** Construye un ISO UTC desde fecha + hora locales (zona horaria del negocio). */
function localToUtc(dateStr: string, timeStr: string): string {
  return fromZonedTime(
    `${dateStr}T${timeStr}:00`,
    BUSINESS_TIMEZONE
  ).toISOString()
}

/** Devuelve la fecha (YYYY-MM-DD) del día siguiente a dateStr, usando UTC. */
function nextDayStr(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  const next = new Date(Date.UTC(y, m - 1, d + 1))
  return `${next.getUTCFullYear()}-${String(next.getUTCMonth() + 1).padStart(2, '0')}-${String(next.getUTCDate()).padStart(2, '0')}`
}

/** Rango "Todo el día" en la zona horaria del negocio: 00:00 → día siguiente 00:00. */
function fullDayRange(dateStr: string): { start: string; end: string } {
  const nextStr = nextDayStr(dateStr)
  return {
    start: fromZonedTime(
      `${dateStr}T00:00:00`,
      BUSINESS_TIMEZONE
    ).toISOString(),
    end: fromZonedTime(`${nextStr}T00:00:00`, BUSINESS_TIMEZONE).toISOString()
  }
}

export function AdminExceptionsPage() {
  const businessId = useBusinessId()
  const canEdit = useCanEdit()
  const offline = useIsOffline()
  const { user } = useAuthStore()

  const [exceptions, setExceptions] = useState<AvailabilityException[]>([])
  const [resources, setResources] = useState<Resource[]>([])
  const [resourceLabelSingular, setResourceLabelSingular] = useState('Recurso')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [confirmingId, setConfirmingId] = useState<string | null>(null)

  // Formulario
  const [scope, setScope] = useState<Scope>('business')
  const [selectedResourceId, setSelectedResourceId] = useState<string>('')
  const [startDate, setStartDate] = useState(todayLocal())
  const [endDate, setEndDate] = useState(todayLocal())
  const [allDay, setAllDay] = useState(true)
  const [startTime, setStartTime] = useState('08:00')
  const [endTime, setEndTime] = useState('22:00')
  const [reason, setReason] = useState('')

  // Advertencia de reservas afectadas
  const [affectedCount, setAffectedCount] = useState<number | null>(null)
  const [checkingOverlap, setCheckingOverlap] = useState(false)
  const [confirmedCreate, setConfirmedCreate] = useState(false)

  const load = useCallback(async () => {
    if (!businessId) return
    setLoading(true)
    try {
      const [excData, resourceData, business] = await Promise.all([
        fetchAvailabilityExceptions(businessId),
        fetchAllResources(businessId),
        fetchBusinessById(businessId)
      ])
      setExceptions(excData)
      setResources(resourceData)
      setResourceLabelSingular(business?.resource_label_singular || 'Recurso')
      if (resourceData.length > 0 && !selectedResourceId) {
        setSelectedResourceId(resourceData[0].id)
      }
    } catch (err) {
      setError('Error al cargar las excepciones: ' + (err as Error).message)
    } finally {
      setLoading(false)
    }
  }, [businessId, selectedResourceId])

  useEffect(() => {
    load()
  }, [load])

  // Validar formulario
  const validationError = useMemo(() => {
    if (!businessId) return 'No se pudo determinar el negocio.'
    if (scope === 'resource' && !selectedResourceId)
      return 'Selecciona un recurso.'
    if (!startDate || !endDate) return 'Indica fecha de inicio y fin.'
    if (!allDay && (!startTime || !endTime))
      return 'Indica hora de inicio y fin.'
    if (endDate < startDate)
      return 'La fecha de fin no puede ser anterior a la de inicio.'
    if (endDate === startDate && !allDay && endTime <= startTime) {
      return 'La hora de fin debe ser posterior a la de inicio.'
    }
    return null
  }, [
    businessId,
    scope,
    selectedResourceId,
    startDate,
    endDate,
    allDay,
    startTime,
    endTime
  ])

  // Calcular intervalo UTC según el formulario
  const interval = useMemo(() => {
    if (validationError) return null
    if (allDay) {
      if (endDate === startDate) {
        return fullDayRange(startDate)
      }
      // Rango multi-día: desde 00:00 del inicio hasta 00:00 del día siguiente al fin
      const nextStr = nextDayStr(endDate)
      return {
        start: fromZonedTime(
          `${startDate}T00:00:00`,
          BUSINESS_TIMEZONE
        ).toISOString(),
        end: fromZonedTime(
          `${nextStr}T00:00:00`,
          BUSINESS_TIMEZONE
        ).toISOString()
      }
    }
    return {
      start: localToUtc(startDate, startTime),
      end: localToUtc(endDate, endTime)
    }
  }, [validationError, allDay, startDate, endDate, startTime, endTime])

  // Consultar reservas afectadas cuando el intervalo cambia
  useEffect(() => {
    if (!interval || !businessId) {
      setAffectedCount(null)
      return
    }
    setCheckingOverlap(true)
    setConfirmedCreate(false)
    countOverlappingReservations({
      businessId,
      resourceId: scope === 'resource' ? selectedResourceId : null,
      startsAt: interval.start,
      endsAt: interval.end
    })
      .then((count) => setAffectedCount(count))
      .catch(() => setAffectedCount(null))
      .finally(() => setCheckingOverlap(false))
  }, [interval, businessId, scope, selectedResourceId])

  async function handleCreate() {
    if (validationError || !interval || !businessId) return
    if (affectedCount !== null && affectedCount > 0 && !confirmedCreate) return

    setSaving(true)
    setError(null)
    setSaved(false)

    try {
      await createAvailabilityException({
        businessId,
        resourceId: scope === 'resource' ? selectedResourceId : null,
        startsAt: interval.start,
        endsAt: interval.end,
        reason: reason.trim() || null,
        createdBy: user?.id ?? null
      })
      setSaved(true)
      setReason('')
      setConfirmedCreate(false)
      setAffectedCount(null)
      setTimeout(() => setSaved(false), 3000)
      await load()
    } catch (err) {
      setError('Error al crear el cierre: ' + (err as Error).message)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    setDeletingId(id)
    setError(null)
    try {
      await deleteAvailabilityException(id)
      await load()
    } catch (err) {
      setError('Error al eliminar: ' + (err as Error).message)
    } finally {
      setDeletingId(null)
      setConfirmingId(null)
    }
  }

  // Separar excepciones futuras/activas de pasadas
  const now = new Date()
  const upcomingExceptions = exceptions.filter((e) => new Date(e.ends_at) > now)
  const pastExceptions = exceptions.filter((e) => new Date(e.ends_at) <= now)

  function resourceName(resourceId: string | null): string {
    if (!resourceId) return 'Todo el negocio'
    return (
      resources.find((resource) => resource.id === resourceId)?.name ??
      resourceLabelSingular
    )
  }

  function formatPoint(iso: string): string {
    return formatLocal(iso, 'EEE d MMM · HH:mm').toUpperCase()
  }

  /** Si el cierre termina a medianoche (rango de día completo), muestra 23:59 del día anterior. */
  function formatEndPoint(iso: string): string {
    const d = new Date(iso)
    const local = new Date(
      d.toLocaleString('en-US', { timeZone: BUSINESS_TIMEZONE })
    )
    const isMidnight = local.getHours() === 0 && local.getMinutes() === 0
    return formatPoint(
      isMidnight ? new Date(d.getTime() - 60_000).toISOString() : iso
    )
  }

  if (loading) {
    return <PageLoader />
  }

  const canSubmit =
    canEdit &&
    !validationError &&
    !saving &&
    !checkingOverlap &&
    (affectedCount === null || affectedCount === 0 || confirmedCreate)

  return (
    <Page>
      {/* Header */}
      <div className='animate-fade-up'>
        <div className='flex items-center gap-1'>
          <BackLink href='/admin/negocio' label='Negocio' />
          <h1 className='text-2xl font-bold tracking-tight'>
            Cierres temporales
          </h1>
        </div>
        <p className='text-sm text-(--color-text-muted) mt-1'>
          Bloquea nuevas reservas en un intervalo específico. No cancela
          reservas existentes.
        </p>
      </div>

      {!canEdit && <ReadOnlyNotice />}

      {error && (
        <Alert variant='error' onDismiss={() => setError(null)}>
          {error}
        </Alert>
      )}
      {saved && <Alert variant='success'>Cierre creado correctamente.</Alert>}

      {/* Formulario */}
      <Card className='p-5 animate-fade-up' style={{ animationDelay: '40ms' }}>
        <div className='flex items-center gap-2 mb-4'>
          <div className='flex items-center justify-center w-8 h-8 rounded-lg bg-surface-inset text-text-muted'>
            <LockIcon size={18} />
          </div>
          <h2 className='text-xs font-medium uppercase tracking-[0.14em]'>
            Nuevo cierre
          </h2>
        </div>

        <div className='flex flex-col gap-4'>
          {/* Alcance */}
          <div className='flex flex-col gap-2'>
            <label className='text-[11px] font-medium uppercase tracking-[0.14em] text-(--color-text-muted)'>
              Alcance
            </label>
            <div className='flex gap-2'>
              <button
                type='button'
                onClick={() => setScope('business')}
                disabled={!canEdit || offline}
                className={`flex-1 rounded-xl border px-4 py-3 text-sm font-medium transition-all touch-target ${
                  scope === 'business'
                    ? 'bg-(--color-primary) text-on-primary border-(--color-primary)'
                    : 'bg-surface-elevated text-(--color-text-muted) border-border hover:border-graphite-300'
                } disabled:opacity-60`}
              >
                Todo el negocio
              </button>
              <button
                type='button'
                onClick={() => setScope('resource')}
                disabled={!canEdit || resources.length === 0 || offline}
                className={`flex-1 rounded-xl border px-4 py-3 text-sm font-medium transition-all touch-target ${
                  scope === 'resource'
                    ? 'bg-(--color-primary) text-on-primary border-(--color-primary)'
                    : 'bg-surface-elevated text-(--color-text-muted) border-border hover:border-graphite-300'
                } disabled:opacity-60`}
              >
                {resourceLabelSingular} específico
              </button>
            </div>
          </div>

          {/* Selector de recurso */}
          {scope === 'resource' && (
            <div className='flex flex-col gap-2'>
              <label
                htmlFor='exception-resource'
                className='text-[11px] font-medium uppercase tracking-[0.14em] text-(--color-text-muted)'
              >
                Recurso
              </label>
              <div className='relative'>
                <select
                  id='exception-resource'
                  value={selectedResourceId}
                  onChange={(e) => setSelectedResourceId(e.target.value)}
                  disabled={!canEdit || offline}
                  className='w-full appearance-none rounded-xl border border-border bg-surface-inset pl-4 pr-10 py-3 text-sm focus:border-(--color-primary)  disabled:opacity-60 touch-target'
                >
                  {resources.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
                <ChevronDownIcon
                  size={16}
                  className='pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-text-muted'
                />
              </div>
            </div>
          )}

          {/* Fechas */}
          <div className='flex flex-wrap gap-3'>
            <div className='flex-1 min-w-0 flex flex-col gap-2'>
              <label
                htmlFor='exception-start-date'
                className='text-[11px] font-medium uppercase tracking-[0.14em] text-(--color-text-muted)'
              >
                Fecha inicio
              </label>
              <input
                id='exception-start-date'
                type='date'
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                disabled={!canEdit || offline}
                className='w-full min-w-0 appearance-none rounded-xl border border-border bg-surface-inset px-4 py-3 text-base nums font-mono focus:border-(--color-primary)  disabled:opacity-60 touch-target'
              />
            </div>
            <div className='flex-1 min-w-0 flex flex-col gap-2'>
              <label
                htmlFor='exception-end-date'
                className='text-[11px] font-medium uppercase tracking-[0.14em] text-(--color-text-muted)'
              >
                Fecha fin
              </label>
              <input
                id='exception-end-date'
                type='date'
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                disabled={!canEdit || offline}
                className='w-full min-w-0 appearance-none rounded-xl border border-border bg-surface-inset px-4 py-3 text-base nums font-mono focus:border-(--color-primary)  disabled:opacity-60 touch-target'
              />
            </div>
          </div>

          {/* Todo el día */}
          <label className='flex items-center gap-3 cursor-pointer'>
            <input
              type='checkbox'
              checked={allDay}
              onChange={(e) => setAllDay(e.target.checked)}
              disabled={!canEdit || offline}
              className='w-5 h-5 rounded border-border text-(--color-primary) focus:ring-(--color-primary)/15 disabled:opacity-60'
            />
            <span className='text-[11px] font-medium uppercase tracking-[0.14em] text-(--color-text-muted)'>
              Todo el día
            </span>
          </label>

          {/* Horas (si no es todo el día) */}
          {!allDay && (
            <div className='flex flex-wrap gap-3'>
              <div className='flex-1 flex min-w-0 flex-col gap-2'>
                <label
                  htmlFor='exception-start-time'
                  className='text-[11px] font-medium uppercase tracking-[0.14em] text-(--color-text-muted)'
                >
                  Hora inicio
                </label>
                <input
                  id='exception-start-time'
                  type='time'
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  disabled={!canEdit || offline}
                  className='w-full min-w-0 appearance-none rounded-xl border border-border bg-surface-inset px-4 py-3 text-base nums font-mono focus:border-(--color-primary)  disabled:opacity-60 touch-target'
                />
              </div>
              <div className='flex-1 flex min-w-0 flex-col gap-2'>
                <label
                  htmlFor='exception-end-time'
                  className='text-[11px] font-medium uppercase tracking-[0.14em] text-(--color-text-muted)'
                >
                  Hora fin
                </label>
                <input
                  id='exception-end-time'
                  type='time'
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  disabled={!canEdit || offline}
                  className='w-full min-w-0 appearance-none rounded-xl border border-border bg-surface-inset px-4 py-3 text-base nums font-mono focus:border-(--color-primary)  disabled:opacity-60 touch-target'
                />
              </div>
            </div>
          )}

          {/* Motivo */}
          <div className='flex flex-col gap-2'>
            <label
              htmlFor='exception-reason'
              className='text-[11px] font-medium uppercase tracking-[0.14em] text-(--color-text-muted)'
            >
              Motivo (opcional)
            </label>
            <input
              id='exception-reason'
              type='text'
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              disabled={!canEdit || offline}
              placeholder='Ej: Festivo, mantenimiento, evento privado'
              maxLength={200}
              className='w-full rounded-xl border border-border bg-surface-inset px-4 py-3 text-sm focus:border-(--color-primary)  disabled:opacity-60 touch-target'
            />
          </div>

          {/* Validación */}
          {validationError && (
            <Alert variant='warning'>{validationError}</Alert>
          )}

          {/* Advertencia de reservas afectadas */}
          {affectedCount !== null && affectedCount > 0 && !validationError && (
            <Alert variant='warning'>
              <div>
                <p className='font-medium'>
                  {affectedCount} reserva{affectedCount !== 1 ? 's' : ''}{' '}
                  {affectedCount !== 1 ? 'afectadas' : 'afectada'}
                </p>
                <p className='text-sm mt-1'>
                  Este cierre bloquea nuevas reservas pero no cancela las
                  existentes. Revisa y contacta a los clientes manualmente si es
                  necesario.
                </p>
                <label className='flex items-center gap-2 mt-2 cursor-pointer'>
                  <input
                    type='checkbox'
                    checked={confirmedCreate}
                    onChange={(e) => setConfirmedCreate(e.target.checked)}
                    disabled={!canEdit || offline}
                    className='w-4 h-4 rounded border-border text-(--color-primary) focus:ring-(--color-primary)/15'
                  />
                  <span className='text-sm'>
                    Entiendo y quiero crear el cierre de todas formas
                  </span>
                </label>
              </div>
            </Alert>
          )}

          {/* Botón crear */}
          <Button
            onClick={handleCreate}
            loading={saving}
            disabled={!canSubmit || offline}
            size='lg'
            className='w-full'
          >
            <PlusIcon size={18} />
            Crear cierre
          </Button>
        </div>
      </Card>

      {/* Excepciones activas/futuras */}
      <div className='animate-fade-up' style={{ animationDelay: '60ms' }}>
        <h2 className='text-xs font-medium uppercase tracking-[0.14em] text-text-muted mb-3 flex items-center gap-2'>
          <CalendarIcon size={16} className='text-text-muted' />
          Cierres programados ({upcomingExceptions.length})
        </h2>
        {upcomingExceptions.length === 0 ? (
          <Card className='p-6 text-center'>
            <p className='text-sm text-text-muted'>
              No hay cierres programados.
            </p>
          </Card>
        ) : (
          <div className='overflow-hidden rounded-2xl border border-border bg-surface-elevated shadow-(--shadow-sm)'>
            <ul className='flex flex-col divide-y divide-border'>
              {upcomingExceptions.map((exc, index) => (
                <li
                  key={exc.id}
                  className='group relative flex animate-stagger flex-wrap items-center gap-3 px-5 py-3.5 sm:flex-nowrap'
                  style={{ '--index': index } as CSSProperties}
                >
                  <span className='flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-surface-inset text-text-muted'>
                    <LockIcon size={16} />
                  </span>
                  <div className='min-w-0 flex-1'>
                    <div className='flex flex-wrap items-center gap-x-2.5 gap-y-1'>
                      <div className='flex flex-col gap-0.5'>
                        <p className='text-[13px] font-semibold nums font-mono text-(--color-text)'>
                          <span className='mr-2 text-[10px] font-medium uppercase tracking-widest text-text-muted'>
                            Desde
                          </span>
                          {formatPoint(exc.starts_at)}
                        </p>
                        <p className='text-[13px] font-semibold nums font-mono text-(--color-text)'>
                          <span className='mr-2 text-[10px] font-medium uppercase tracking-widest text-text-muted'>
                            Hasta
                          </span>
                          {formatEndPoint(exc.ends_at)}
                        </p>
                      </div>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-widest ${
                          exc.resource_id
                            ? 'bg-pitch-100 text-pitch-700 dark:bg-pitch-500/15 dark:text-pitch-300'
                            : 'bg-signal-blue/10 text-signal-blue dark:bg-signal-blue/20 dark:text-blue-300'
                        }`}
                      >
                        {resourceName(exc.resource_id)}
                      </span>
                    </div>
                    {exc.reason && (
                      <p className='mt-0.5 text-xs italic text-text-muted'>
                        {exc.reason}
                      </p>
                    )}
                  </div>
                  {canEdit && (
                    <div className='ml-auto flex shrink-0 items-center gap-1.5'>
                      {confirmingId === exc.id ? (
                        <>
                          <Button
                            variant='danger'
                            size='sm'
                            onClick={() => handleDelete(exc.id)}
                            loading={deletingId === exc.id}
                            disabled={offline}
                          >
                            Confirmar
                          </Button>
                          <Button
                            variant='secondary'
                            size='sm'
                            onClick={() => setConfirmingId(null)}
                            disabled={deletingId === exc.id}
                          >
                            Cancelar
                          </Button>
                        </>
                      ) : (
                        <button
                          onClick={() => setConfirmingId(exc.id)}
                          disabled={offline}
                          className='flex items-center justify-center w-10 h-10 text-text-muted hover:text-danger hover:bg-danger/10 rounded-lg transition-colors touch-target shrink-0 disabled:opacity-40'
                          aria-label='Eliminar cierre'
                          title='Eliminar cierre'
                        >
                          <TrashIcon size={17} />
                        </button>
                      )}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Excepciones pasadas (colapsadas) */}
      {pastExceptions.length > 0 && (
        <details className='animate-fade-up' style={{ animationDelay: '80ms' }}>
          <summary className='cursor-pointer text-sm font-medium text-text-muted hover:text-text transition-colors py-2'>
            Cierres pasados ({pastExceptions.length})
          </summary>
          <div className='mt-2 overflow-hidden rounded-2xl border border-border bg-surface-elevated opacity-60'>
            <ul className='flex flex-col divide-y divide-border'>
              {pastExceptions.map((exc) => (
                <li
                  key={exc.id}
                  className='group relative flex items-center gap-3 px-5 py-3'
                >
                  <span className='flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-surface-inset text-text-muted'>
                    <LockIcon size={15} />
                  </span>
                  <div className='min-w-0 flex-1'>
                    <div className='flex flex-wrap items-center gap-x-2.5 gap-y-1'>
                      <div className='flex flex-col gap-0.5'>
                        <p className='text-xs font-medium nums font-mono text-text-muted'>
                          <span className='mr-2 text-[10px] uppercase tracking-widest'>
                            Desde
                          </span>
                          {formatPoint(exc.starts_at)}
                        </p>
                        <p className='text-xs font-medium nums font-mono text-text-muted'>
                          <span className='mr-2 text-[10px] uppercase tracking-widest'>
                            Hasta
                          </span>
                          {formatEndPoint(exc.ends_at)}
                        </p>
                      </div>
                      <span className='rounded-full bg-surface-inset px-2 py-0.5 text-[10px] font-medium uppercase tracking-widest text-text-muted'>
                        {resourceName(exc.resource_id)}
                      </span>
                    </div>
                    {exc.reason && (
                      <p className='mt-0.5 text-xs italic text-text-muted'>
                        {exc.reason}
                      </p>
                    )}
                  </div>
                  {canEdit && (
                    <button
                      onClick={() => handleDelete(exc.id)}
                      disabled={deletingId === exc.id || offline}
                      className='flex items-center justify-center w-10 h-10 text-text-muted hover:text-danger hover:bg-danger/10 rounded-lg transition-colors touch-target shrink-0 disabled:opacity-40'
                      aria-label='Eliminar cierre pasado'
                    >
                      <TrashIcon size={16} />
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </details>
      )}
    </Page>
  )
}
