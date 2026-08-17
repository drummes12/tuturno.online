import { useCallback, useEffect, useState } from 'react'
import {
  approveSignupRequest,
  fetchAuditLog,
  fetchBusinessOverview,
  fetchSignupRequests,
  findUserByEmail,
  rejectSignupRequest,
  setMemberRole
} from '@/services/platform'
import { Card } from '@/components/common/card'
import { Button } from '@/components/common/button'
import { Input } from '@/components/common/input'
import { Alert } from '@/components/common/alert'
import { Badge } from '@/components/common/badge'
import { Spinner } from '@/components/common/spinner'
import { CheckIcon, XIcon, StoreIcon, SearchIcon } from '@/components/common/icon'
import { formatLocal } from '@/lib/time'
import type {
  BusinessRole,
  PlatformAuditEntry,
  PlatformBusinessOverview,
  PlatformUser,
  SignupRequest,
  SignupRequestStatus
} from '@/types'

const STATUS_BADGE: Record<
  SignupRequestStatus,
  { label: string; variant: 'warning' | 'success' | 'danger' | 'neutral' }
> = {
  pending: { label: 'Pendiente', variant: 'warning' },
  approved: { label: 'Aprobada', variant: 'success' },
  rejected: { label: 'Rechazada', variant: 'danger' },
  cancelled: { label: 'Retirada', variant: 'neutral' }
}

export function PlatformDashboardPage() {
  const [requests, setRequests] = useState<SignupRequest[]>([])
  const [businesses, setBusinesses] = useState<PlatformBusinessOverview[]>([])
  const [audit, setAudit] = useState<PlatformAuditEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [requestData, businessData, auditData] = await Promise.all([
        fetchSignupRequests(),
        fetchBusinessOverview(),
        fetchAuditLog(20)
      ])
      setRequests(requestData)
      setBusinesses(businessData)
      setAudit(auditData)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  if (loading) {
    return (
      <div className='flex justify-center py-12'>
        <Spinner size='lg' />
      </div>
    )
  }

  const pending = requests.filter((r) => r.status === 'pending')
  const history = requests.filter((r) => r.status !== 'pending')

  return (
    <div className='mx-auto max-w-3xl px-4 py-6 flex flex-col gap-6'>
      <div>
        <h1 className='text-2xl font-bold tracking-tight'>Plataforma</h1>
        <p className='text-sm text-(--color-text-muted)'>
          Alta de negocios y accesos de emergencia. Cada acción queda en la
          bitácora.
        </p>
      </div>

      {error && <Alert variant='error'>{error}</Alert>}

      <section className='flex flex-col gap-3'>
        <h2 className='text-lg font-semibold tracking-tight'>
          Solicitudes pendientes ({pending.length})
        </h2>
        {pending.length === 0 && (
          <Card className='p-6 text-center text-sm text-(--color-text-muted)'>
            No hay solicitudes pendientes.
          </Card>
        )}
        {pending.map((request) => (
          <PendingRequestCard
            key={request.id}
            request={request}
            onDone={load}
            onError={setError}
          />
        ))}
      </section>

      <PromoteMemberSection businesses={businesses} onDone={load} />

      <section className='flex flex-col gap-3'>
        <h2 className='text-lg font-semibold tracking-tight'>Negocios</h2>
        {businesses.map((business) => (
          <Card key={business.business_id} className='p-4'>
            <div className='flex items-start justify-between gap-3'>
              <div>
                <p className='font-semibold flex items-center gap-2'>
                  <StoreIcon size={16} />
                  {business.name}
                  {business.is_demo && <Badge variant='info'>demo</Badge>}
                </p>
                <p className='text-xs text-(--color-text-muted)'>
                  /b/{business.slug}
                </p>
              </div>
              <div className='text-right text-xs text-(--color-text-muted)'>
                <p>{business.member_count} miembros</p>
                <p>{business.resource_count} espacios</p>
                <p>{business.reservation_count} reservas</p>
              </div>
            </div>
          </Card>
        ))}
      </section>

      {history.length > 0 && (
        <section className='flex flex-col gap-3'>
          <h2 className='text-lg font-semibold tracking-tight'>
            Solicitudes procesadas
          </h2>
          {history.map((request) => (
            <Card key={request.id} className='p-4'>
              <div className='flex items-center justify-between gap-3'>
                <div>
                  <p className='font-medium'>{request.business_name}</p>
                  <p className='text-xs text-(--color-text-muted)'>
                    /b/{request.desired_slug} ·{' '}
                    {formatLocal(request.created_at, 'd MMM yyyy, HH:mm')}
                  </p>
                  {request.rejection_reason && (
                    <p className='text-xs text-(--color-text-muted)'>
                      Motivo: {request.rejection_reason}
                    </p>
                  )}
                </div>
                <Badge variant={STATUS_BADGE[request.status].variant}>
                  {STATUS_BADGE[request.status].label}
                </Badge>
              </div>
            </Card>
          ))}
        </section>
      )}

      {audit.length > 0 && (
        <section className='flex flex-col gap-3'>
          <h2 className='text-lg font-semibold tracking-tight'>Bitácora</h2>
          <Card className='p-4 flex flex-col gap-2'>
            {audit.map((entry) => (
              <p key={entry.id} className='text-xs text-(--color-text-muted)'>
                <span className='font-mono'>{entry.action}</span> ·{' '}
                {entry.target_type} · {formatLocal(entry.created_at, 'd MMM yyyy, HH:mm')}
              </p>
            ))}
          </Card>
        </section>
      )}
    </div>
  )
}

function PendingRequestCard({
  request,
  onDone,
  onError
}: {
  request: SignupRequest
  onDone: () => Promise<void>
  onError: (message: string | null) => void
}) {
  const [slug, setSlug] = useState(request.desired_slug)
  const [labelSingular, setLabelSingular] = useState('Espacio')
  const [labelPlural, setLabelPlural] = useState('Espacios')
  const [reason, setReason] = useState('')
  const [confirmSlug, setConfirmSlug] = useState('')
  const [working, setWorking] = useState(false)

  async function approve() {
    onError(null)
    setWorking(true)
    try {
      await approveSignupRequest(request.id, {
        slugOverride: slug,
        labelSingular,
        labelPlural
      })
      await onDone()
    } catch (err) {
      onError((err as Error).message)
    } finally {
      setWorking(false)
    }
  }

  async function reject() {
    onError(null)
    setWorking(true)
    try {
      await rejectSignupRequest(request.id, reason)
      await onDone()
    } catch (err) {
      onError((err as Error).message)
    } finally {
      setWorking(false)
    }
  }

  return (
    <Card className='p-4 flex flex-col gap-4'>
      <div className='flex items-start justify-between gap-3'>
        <div>
          <p className='font-semibold'>{request.business_name}</p>
          <p className='text-xs text-(--color-text-muted)'>
            {[request.business_type, request.city, request.contact_phone]
              .filter(Boolean)
              .join(' · ') || 'Sin detalles adicionales'}
          </p>
          <p className='text-xs text-(--color-text-muted)'>
            Solicitada {formatLocal(request.created_at, 'd MMM yyyy, HH:mm')}
          </p>
        </div>
        <Badge variant='warning'>Pendiente</Badge>
      </div>

      {request.notes && (
        <p className='text-sm text-(--color-text-muted) whitespace-pre-line'>
          {request.notes}
        </p>
      )}

      <div className='grid gap-3 sm:grid-cols-3'>
        <Input
          label='Enlace'
          value={slug}
          onChange={(e) => setSlug(e.target.value)}
        />
        <Input
          label='Etiqueta singular'
          value={labelSingular}
          onChange={(e) => setLabelSingular(e.target.value)}
        />
        <Input
          label='Etiqueta plural'
          value={labelPlural}
          onChange={(e) => setLabelPlural(e.target.value)}
        />
      </div>

      <Input
        label='Confirma el enlace para aprobar'
        value={confirmSlug}
        onChange={(e) => setConfirmSlug(e.target.value)}
        placeholder={slug}
        hint='Escribe el enlace exacto: evita aprobar la solicitud equivocada.'
      />

      <div className='flex flex-col sm:flex-row gap-2'>
        <Button
          onClick={approve}
          loading={working}
          disabled={confirmSlug !== slug}
          className='flex-1'
        >
          <CheckIcon size={16} /> Aprobar y crear negocio
        </Button>
      </div>

      <div className='flex flex-col sm:flex-row gap-2 border-t border-border pt-3'>
        <Input
          label='Motivo del rechazo'
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          wrapperClassName='flex-1'
        />
        <Button
          variant='danger'
          onClick={reject}
          loading={working}
          disabled={reason.trim().length < 3}
          className='sm:self-end'
        >
          <XIcon size={16} /> Rechazar
        </Button>
      </div>
    </Card>
  )
}

function PromoteMemberSection({
  businesses,
  onDone
}: {
  businesses: PlatformBusinessOverview[]
  onDone: () => Promise<void>
}) {
  const [email, setEmail] = useState('')
  const [found, setFound] = useState<PlatformUser | null>(null)
  const [searched, setSearched] = useState(false)
  const [businessId, setBusinessId] = useState('')
  const [role, setRole] = useState<BusinessRole>('manager')
  const [working, setWorking] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function search() {
    setError(null)
    setMessage(null)
    setWorking(true)
    try {
      setFound(await findUserByEmail(email))
      setSearched(true)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setWorking(false)
    }
  }

  async function promote() {
    if (!found || !businessId) return
    setError(null)
    setWorking(true)
    try {
      await setMemberRole(businessId, found.user_id, role)
      setMessage(`${found.email} ahora es ${role} del negocio.`)
      await onDone()
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setWorking(false)
    }
  }

  return (
    <section className='flex flex-col gap-3'>
      <h2 className='text-lg font-semibold tracking-tight'>
        Acceso de emergencia
      </h2>
      <Card className='p-4 flex flex-col gap-3'>
        <p className='text-sm text-(--color-text-muted)'>
          El alta de managers la hace cada owner desde su panel. Usa esto solo
          cuando un negocio perdió el acceso a su cuenta owner.
        </p>

        <div className='flex flex-col sm:flex-row gap-2 sm:items-end'>
          <Input
            label='Email del usuario'
            type='email'
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            wrapperClassName='flex-1'
          />
          <Button
            variant='secondary'
            onClick={search}
            loading={working}
            disabled={!email}
          >
            <SearchIcon size={16} /> Buscar
          </Button>
        </div>

        {searched && !found && (
          <Alert variant='warning'>
            No hay ninguna cuenta con ese email. El usuario debe registrarse
            primero.
          </Alert>
        )}

        {found && (
          <>
            <p className='text-sm'>
              {found.full_name ?? 'Sin nombre'} ·{' '}
              <span className='font-mono text-xs'>{found.email}</span>
            </p>
            <div className='grid gap-3 sm:grid-cols-2'>
              <label className='flex flex-col gap-1.5'>
                <span className='text-sm font-medium'>Negocio</span>
                <select
                  value={businessId}
                  onChange={(e) => setBusinessId(e.target.value)}
                  className='rounded-xl border border-border bg-surface-inset px-4 py-3 text-base'
                >
                  <option value=''>Selecciona…</option>
                  {businesses.map((b) => (
                    <option key={b.business_id} value={b.business_id}>
                      {b.name} (/b/{b.slug})
                    </option>
                  ))}
                </select>
              </label>
              <label className='flex flex-col gap-1.5'>
                <span className='text-sm font-medium'>Rol</span>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as BusinessRole)}
                  className='rounded-xl border border-border bg-surface-inset px-4 py-3 text-base'
                >
                  <option value='manager'>manager</option>
                  <option value='owner'>owner</option>
                </select>
              </label>
            </div>
            <Button
              onClick={promote}
              loading={working}
              disabled={!businessId}
              variant='secondary'
            >
              Asignar rol
            </Button>
          </>
        )}

        {message && <Alert variant='success'>{message}</Alert>}
        {error && <Alert variant='error'>{error}</Alert>}
      </Card>
    </section>
  )
}
