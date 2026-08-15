import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  fetchAvailabilityExceptions,
  createAvailabilityException,
  deleteAvailabilityException,
  countOverlappingReservations
} from '@/services/availability-exceptions'
import { fetchAllCourts } from '@/services/courts'
import { useAuthStore } from '@/stores/auth'
import { useBusinessId } from '@/hooks/use-business-id'
import { useCanEdit } from '@/hooks/use-can-edit'
import { Card } from '@/components/common/card'
import { Button } from '@/components/common/button'
import { Alert } from '@/components/common/alert'
import { Spinner } from '@/components/common/spinner'
import { ReadOnlyNotice } from '@/components/common/read-only-notice'
import {
  LockIcon,
  TrashIcon,
  PlusIcon,
  AlertIcon,
  CalendarIcon
} from '@/components/common/icon'
import type { AvailabilityException, Court } from '@/types'
import { formatLocal, BUSINESS_TIMEZONE } from '@/lib/time'
import { fromZonedTime } from 'date-fns-tz'
import { format } from 'date-fns'

type Scope = 'business' | 'court'

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
  const { user } = useAuthStore()

  const [exceptions, setExceptions] = useState<AvailabilityException[]>([])
  const [courts, setCourts] = useState<Court[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  // Formulario
  const [scope, setScope] = useState<Scope>('business')
  const [selectedCourtId, setSelectedCourtId] = useState<string>('')
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
      const [excData, courtData] = await Promise.all([
        fetchAvailabilityExceptions(businessId),
        fetchAllCourts()
      ])
      setExceptions(excData)
      setCourts(courtData)
      if (courtData.length > 0 && !selectedCourtId) {
        setSelectedCourtId(courtData[0].id)
      }
    } catch (err) {
      setError('Error al cargar las excepciones: ' + (err as Error).message)
    } finally {
      setLoading(false)
    }
  }, [businessId, selectedCourtId])

  useEffect(() => {
    load()
  }, [load])

  // Validar formulario
  const validationError = useMemo(() => {
    if (!businessId) return 'No se pudo determinar el negocio.'
    if (scope === 'court' && !selectedCourtId) return 'Selecciona una cancha.'
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
    selectedCourtId,
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
      courtId: scope === 'court' ? selectedCourtId : null,
      startsAt: interval.start,
      endsAt: interval.end
    })
      .then((count) => setAffectedCount(count))
      .catch(() => setAffectedCount(null))
      .finally(() => setCheckingOverlap(false))
  }, [interval, businessId, scope, selectedCourtId])

  async function handleCreate() {
    if (validationError || !interval || !businessId) return
    if (affectedCount !== null && affectedCount > 0 && !confirmedCreate) return

    setSaving(true)
    setError(null)
    setSaved(false)

    try {
      await createAvailabilityException({
        businessId,
        courtId: scope === 'court' ? selectedCourtId : null,
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
    if (!confirm('¿Seguro que quieres eliminar este cierre?')) return
    setDeletingId(id)
    setError(null)
    try {
      await deleteAvailabilityException(id)
      await load()
    } catch (err) {
      setError('Error al eliminar: ' + (err as Error).message)
    } finally {
      setDeletingId(null)
    }
  }

  // Separar excepciones futuras/activas de pasadas
  const now = new Date()
  const upcomingExceptions = exceptions.filter((e) => new Date(e.ends_at) > now)
  const pastExceptions = exceptions.filter((e) => new Date(e.ends_at) <= now)

  function courtName(courtId: string | null): string {
    if (!courtId) return 'Todo el negocio'
    return courts.find((c) => c.id === courtId)?.name ?? 'Cancha'
  }

  function formatRange(start: string, end: string): string {
    const s = formatLocal(start, "EEE d 'de' MMM, HH:mm")
    const e = formatLocal(end, "EEE d 'de' MMM, HH:mm")
    return `${s} → ${e}`
  }

  if (loading) {
    return <Spinner size='lg' />
  }

  const canSubmit =
    canEdit &&
    !validationError &&
    !saving &&
    !checkingOverlap &&
    (affectedCount === null || affectedCount === 0 || confirmedCreate)

  return (
    <div className='flex flex-col gap-5 max-w-3xl mx-auto'>
      {/* Header */}
      <div className='animate-fade-up'>
        <h1 className='text-2xl font-bold tracking-tight'>
          Cierres temporales
        </h1>
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
          <h2 className='font-semibold text-sm tracking-tight'>Nuevo cierre</h2>
        </div>

        <div className='flex flex-col gap-4'>
          {/* Alcance */}
          <div className='flex flex-col gap-2'>
            <label className='text-sm font-medium text-(--color-text)'>
              Alcance
            </label>
            <div className='flex gap-2'>
              <button
                type='button'
                onClick={() => setScope('business')}
                disabled={!canEdit}
                className={`flex-1 rounded-xl border px-4 py-3 text-sm font-medium transition-all touch-target ${
                  scope === 'business'
                    ? 'bg-(--color-primary) text-white border-(--color-primary)'
                    : 'bg-surface-elevated text-(--color-text-muted) border-border hover:border-graphite-300'
                } disabled:opacity-60`}
              >
                Todo el negocio
              </button>
              <button
                type='button'
                onClick={() => setScope('court')}
                disabled={!canEdit || courts.length === 0}
                className={`flex-1 rounded-xl border px-4 py-3 text-sm font-medium transition-all touch-target ${
                  scope === 'court'
                    ? 'bg-(--color-primary) text-white border-(--color-primary)'
                    : 'bg-surface-elevated text-(--color-text-muted) border-border hover:border-graphite-300'
                } disabled:opacity-60`}
              >
                Cancha específica
              </button>
            </div>
          </div>

          {/* Selector de cancha */}
          {scope === 'court' && (
            <div className='flex flex-col gap-2'>
              <label
                htmlFor='exception-court'
                className='text-sm font-medium text-(--color-text)'
              >
                Cancha
              </label>
              <select
                id='exception-court'
                value={selectedCourtId}
                onChange={(e) => setSelectedCourtId(e.target.value)}
                disabled={!canEdit}
                className='w-full rounded-xl border border-border bg-surface-inset px-4 py-3 text-sm focus:border-(--color-primary) focus:outline-none disabled:opacity-60 touch-target'
              >
                {courts.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Fechas */}
          <div className='grid grid-cols-2 gap-3'>
            <div className='flex flex-col gap-2'>
              <label
                htmlFor='exception-start-date'
                className='text-sm font-medium text-(--color-text)'
              >
                Fecha inicio
              </label>
              <input
                id='exception-start-date'
                type='date'
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                disabled={!canEdit}
                className='w-full rounded-xl border border-border bg-surface-inset px-4 py-3 text-sm nums focus:border-(--color-primary) focus:outline-none disabled:opacity-60 touch-target'
              />
            </div>
            <div className='flex flex-col gap-2'>
              <label
                htmlFor='exception-end-date'
                className='text-sm font-medium text-(--color-text)'
              >
                Fecha fin
              </label>
              <input
                id='exception-end-date'
                type='date'
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                disabled={!canEdit}
                className='w-full rounded-xl border border-border bg-surface-inset px-4 py-3 text-sm nums focus:border-(--color-primary) focus:outline-none disabled:opacity-60 touch-target'
              />
            </div>
          </div>

          {/* Todo el día */}
          <label className='flex items-center gap-3 cursor-pointer'>
            <input
              type='checkbox'
              checked={allDay}
              onChange={(e) => setAllDay(e.target.checked)}
              disabled={!canEdit}
              className='w-5 h-5 rounded border-border text-(--color-primary) focus:ring-(--color-primary)/15 disabled:opacity-60'
            />
            <span className='text-sm font-medium text-(--color-text)'>
              Todo el día
            </span>
          </label>

          {/* Horas (si no es todo el día) */}
          {!allDay && (
            <div className='grid grid-cols-2 gap-3'>
              <div className='flex flex-col gap-2'>
                <label
                  htmlFor='exception-start-time'
                  className='text-sm font-medium text-(--color-text)'
                >
                  Hora inicio
                </label>
                <input
                  id='exception-start-time'
                  type='time'
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  disabled={!canEdit}
                  className='w-full rounded-xl border border-border bg-surface-inset px-4 py-3 text-sm nums focus:border-(--color-primary) focus:outline-none disabled:opacity-60 touch-target'
                />
              </div>
              <div className='flex flex-col gap-2'>
                <label
                  htmlFor='exception-end-time'
                  className='text-sm font-medium text-(--color-text)'
                >
                  Hora fin
                </label>
                <input
                  id='exception-end-time'
                  type='time'
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  disabled={!canEdit}
                  className='w-full rounded-xl border border-border bg-surface-inset px-4 py-3 text-sm nums focus:border-(--color-primary) focus:outline-none disabled:opacity-60 touch-target'
                />
              </div>
            </div>
          )}

          {/* Motivo */}
          <div className='flex flex-col gap-2'>
            <label
              htmlFor='exception-reason'
              className='text-sm font-medium text-(--color-text)'
            >
              Motivo (opcional)
            </label>
            <input
              id='exception-reason'
              type='text'
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              disabled={!canEdit}
              placeholder='Ej: Festivo, mantenimiento, evento privado'
              maxLength={200}
              className='w-full rounded-xl border border-border bg-surface-inset px-4 py-3 text-sm focus:border-(--color-primary) focus:outline-none disabled:opacity-60 touch-target'
            />
          </div>

          {/* Validación */}
          {validationError && (
            <Alert variant='warning'>{validationError}</Alert>
          )}

          {/* Advertencia de reservas afectadas */}
          {affectedCount !== null && affectedCount > 0 && !validationError && (
            <Alert variant='warning'>
              <div className='flex items-start gap-2'>
                <AlertIcon size={18} className='shrink-0 mt-0.5' />
                <div>
                  <p className='font-medium'>
                    {affectedCount} reserva{affectedCount !== 1 ? 's' : ''}{' '}
                    {affectedCount !== 1 ? 'afectadas' : 'afectada'}
                  </p>
                  <p className='text-sm mt-1'>
                    Este cierre bloquea nuevas reservas pero no cancela las
                    existentes. Revisa y contacta a los clientes manualmente si
                    es necesario.
                  </p>
                  <label className='flex items-center gap-2 mt-2 cursor-pointer'>
                    <input
                      type='checkbox'
                      checked={confirmedCreate}
                      onChange={(e) => setConfirmedCreate(e.target.checked)}
                      disabled={!canEdit}
                      className='w-4 h-4 rounded border-border text-(--color-primary) focus:ring-(--color-primary)/15'
                    />
                    <span className='text-sm'>
                      Entiendo y quiero crear el cierre de todas formas
                    </span>
                  </label>
                </div>
              </div>
            </Alert>
          )}

          {/* Botón crear */}
          <Button
            onClick={handleCreate}
            loading={saving}
            disabled={!canSubmit}
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
        <h2 className='font-semibold text-sm tracking-tight mb-3 flex items-center gap-2'>
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
          <div className='flex flex-col gap-2'>
            {upcomingExceptions.map((exc) => (
              <Card
                key={exc.id}
                className='p-4 flex items-start justify-between gap-3'
              >
                <div className='min-w-0 flex-1'>
                  <div className='flex items-center gap-2 mb-1'>
                    <span
                      className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                        exc.court_id
                          ? 'bg-pitch-100 text-pitch-700'
                          : 'bg-blue-50 text-blue-700'
                      }`}
                    >
                      {courtName(exc.court_id)}
                    </span>
                  </div>
                  <p className='text-sm font-medium text-(--color-text) nums'>
                    {formatRange(exc.starts_at, exc.ends_at)}
                  </p>
                  {exc.reason && (
                    <p className='text-xs text-text-muted mt-1 italic'>
                      {exc.reason}
                    </p>
                  )}
                </div>
                {canEdit && (
                  <button
                    onClick={() => handleDelete(exc.id)}
                    disabled={deletingId === exc.id}
                    className='flex items-center justify-center w-10 h-10 text-text-muted hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors touch-target shrink-0 disabled:opacity-50'
                    aria-label='Eliminar cierre'
                    title='Eliminar cierre'
                  >
                    {deletingId === exc.id ? (
                      <Spinner size='sm' />
                    ) : (
                      <TrashIcon size={17} />
                    )}
                  </button>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Excepciones pasadas (colapsadas) */}
      {pastExceptions.length > 0 && (
        <details className='animate-fade-up' style={{ animationDelay: '80ms' }}>
          <summary className='cursor-pointer text-sm font-medium text-text-muted hover:text-text transition-colors py-2'>
            Cierres pasados ({pastExceptions.length})
          </summary>
          <div className='flex flex-col gap-2 mt-2'>
            {pastExceptions.map((exc) => (
              <Card
                key={exc.id}
                className='p-3 flex items-start justify-between gap-3 opacity-60'
              >
                <div className='min-w-0 flex-1'>
                  <span className='text-xs font-medium text-text-muted'>
                    {courtName(exc.court_id)}
                  </span>
                  <p className='text-sm text-text-muted nums'>
                    {formatRange(exc.starts_at, exc.ends_at)}
                  </p>
                  {exc.reason && (
                    <p className='text-xs text-text-muted mt-0.5 italic'>
                      {exc.reason}
                    </p>
                  )}
                </div>
                {canEdit && (
                  <button
                    onClick={() => handleDelete(exc.id)}
                    disabled={deletingId === exc.id}
                    className='flex items-center justify-center w-9 h-9 text-text-muted hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors touch-target shrink-0 disabled:opacity-50'
                    aria-label='Eliminar cierre pasado'
                  >
                    <TrashIcon size={16} />
                  </button>
                )}
              </Card>
            ))}
          </div>
        </details>
      )}
    </div>
  )
}
