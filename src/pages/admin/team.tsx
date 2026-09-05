import { useState, useEffect, useCallback } from 'react'
import { useBusinessId } from '@/hooks/use-business-id'
import { useCanEdit } from '@/hooks/use-can-edit'
import { useAuthStore } from '@/stores/auth'
import {
  fetchBusinessMembers,
  addBusinessMember,
  removeBusinessMember,
  findUserByEmailForInvite,
  type BusinessMember
} from '@/services/members'
import { Card } from '@/components/common/card'
import { Button } from '@/components/common/button'
import { Input } from '@/components/common/input'
import { Alert } from '@/components/common/alert'
import { Badge } from '@/components/common/badge'
import { Spinner } from '@/components/common/spinner'
import { ReadOnlyNotice } from '@/components/common/read-only-notice'
import { BackLink } from '@/components/common/back-link'
import {
  UserIcon,
  TrashIcon,
  SearchIcon,
  PlusIcon
} from '@/components/common/icon'
import { formatLocal } from '@/lib/time'

export function AdminTeamPage() {
  const canEdit = useCanEdit()
  const businessId = useBusinessId()
  const { user } = useAuthStore()
  const [members, setMembers] = useState<BusinessMember[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!businessId) return
    setLoading(true)
    setError(null)
    try {
      const data = await fetchBusinessMembers(businessId)
      setMembers(data)
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Error al cargar el equipo.'
      )
    } finally {
      setLoading(false)
    }
  }, [businessId])

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

  return (
    <div className='flex flex-col gap-6'>
      <div>
        <div className='flex items-center gap-1'>
          <BackLink href='/admin/negocio' label='Negocio' />
          <h1 className='text-2xl font-bold tracking-tight'>Equipo</h1>
        </div>
        <p className='text-sm text-(--color-text-muted) mt-1'>
          Gestiona quién puede administrar este negocio. Los managers pueden ver
          y gestionar reservas, recursos y horarios. Solo el owner puede añadir
          o eliminar miembros.
        </p>
      </div>

      {error && <Alert variant='error'>{error}</Alert>}

      {!canEdit && <ReadOnlyNotice />}

      {canEdit && (
        <div data-tour='admin-team-invite'>
          <InviteMemberForm businessId={businessId!} onDone={load} />
        </div>
      )}

      <section className='flex flex-col gap-3' data-tour='admin-team-members'>
        <h2 className='text-lg font-semibold tracking-tight'>
          Miembros ({members.length})
        </h2>
        {(() => {
          const ownerCount = members.filter((m) => m.role === 'owner').length
          let firstRemovableMarked = false
          return members.map((member) => {
            const isOnlyOwner = member.role === 'owner' && ownerCount === 1
            const isSelf = member.user_id === user?.id
            const isRemovable = canEdit && !isOnlyOwner && !isSelf
            const isFirstRemovable = isRemovable && !firstRemovableMarked
            if (isFirstRemovable) firstRemovableMarked = true
            return (
              <MemberCard
                key={member.user_id}
                member={member}
                isSelf={isSelf}
                canRemove={canEdit}
                isOnlyOwner={isOnlyOwner}
                isFirstRemovable={isFirstRemovable}
                onRemove={load}
                onError={setError}
              />
            )
          })
        })()}
      </section>
    </div>
  )
}

function InviteMemberForm({
  businessId,
  onDone
}: {
  businessId: string
  onDone: () => Promise<void>
}) {
  const [email, setEmail] = useState('')
  const [found, setFound] = useState<{
    user_id: string
    email: string
    full_name: string | null
  } | null>(null)
  const [searched, setSearched] = useState(false)
  const [working, setWorking] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function search() {
    setError(null)
    setMessage(null)
    setWorking(true)
    setFound(null)
    setSearched(false)
    try {
      const result = await findUserByEmailForInvite(email)
      setFound(result)
      setSearched(true)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setWorking(false)
    }
  }

  async function invite() {
    if (!found) return
    setError(null)
    setMessage(null)
    setWorking(true)
    try {
      await addBusinessMember(businessId, found.user_id)
      setMessage(`${found.email} fue añadido como manager.`)
      setEmail('')
      setFound(null)
      setSearched(false)
      await onDone()
    } catch (err) {
      const msg = (err as Error).message
      if (msg.includes('duplicate') || msg.includes('unique')) {
        setError('Este usuario ya es miembro del negocio.')
      } else {
        setError(msg)
      }
    } finally {
      setWorking(false)
    }
  }

  return (
    <section className='flex flex-col gap-3'>
      <h2 className='text-lg font-semibold tracking-tight'>Añadir manager</h2>
      <Card className='p-4 flex flex-col gap-3'>
        <p className='text-sm text-(--color-text-muted)'>
          Busca a una persona por su email. Debe tener cuenta creada en TuTurno.
          Se añadirá como <strong>manager</strong>.
        </p>

        <div className='flex flex-col sm:flex-row gap-2 sm:items-end'>
          <Input
            label='Email del usuario'
            type='email'
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            wrapperClassName='flex-1'
            placeholder='persona@email.com'
          />
          <Button
            variant='secondary'
            onClick={search}
            loading={working}
            disabled={!email.trim()}
            className='sm:self-end'
          >
            <SearchIcon size={16} /> Buscar
          </Button>
        </div>

        {searched && !found && (
          <Alert variant='warning'>
            No hay ninguna cuenta con ese email. Pídele que se registre primero
            en TuTurno.
          </Alert>
        )}

        {found && (
          <div className='flex flex-col gap-3'>
            <div className='flex items-center gap-3 p-3 rounded-xl bg-surface-inset'>
              <div className='w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary'>
                <UserIcon size={20} />
              </div>
              <div className='flex-1 min-w-0'>
                <p className='font-medium truncate'>
                  {found.full_name ?? 'Sin nombre'}
                </p>
                <p className='text-xs text-(--color-text-muted) truncate'>
                  {found.email}
                </p>
              </div>
            </div>
            <Button onClick={invite} loading={working}>
              <PlusIcon size={16} /> Añadir como manager
            </Button>
          </div>
        )}

        {message && <Alert variant='success'>{message}</Alert>}
        {error && <Alert variant='error'>{error}</Alert>}
      </Card>
    </section>
  )
}

function MemberCard({
  member,
  isSelf,
  canRemove,
  isOnlyOwner,
  onRemove,
  onError,
  isFirstRemovable
}: {
  member: BusinessMember
  isSelf: boolean
  canRemove: boolean
  isOnlyOwner: boolean
  onRemove: () => Promise<void>
  onError: (message: string | null) => void
  isFirstRemovable?: boolean
}) {
  const [working, setWorking] = useState(false)
  const [confirming, setConfirming] = useState(false)

  async function handleRemove() {
    setError(null)
    setWorking(true)
    try {
      await removeBusinessMember(member.business_id, member.user_id)
      await onRemove()
    } catch (err) {
      const msg = (err as Error).message
      if (msg.includes('único owner') || msg.includes('last owner')) {
        onError('No se puede eliminar: es el único owner del negocio.')
      } else {
        onError(msg)
      }
    } finally {
      setWorking(false)
      setConfirming(false)
    }
  }

  function setError(msg: string | null) {
    onError(msg)
  }

  const canDelete = canRemove && !isOnlyOwner && !isSelf

  return (
    <Card className='p-4'>
      <div className='flex items-center gap-3'>
        <div className='w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0'>
          <UserIcon size={20} />
        </div>
        <div className='flex-1 min-w-0'>
          <div className='flex items-center gap-2'>
            <p className='font-medium truncate'>
              {member.full_name ?? 'Sin nombre'}
            </p>
            <Badge variant={member.role === 'owner' ? 'info' : 'neutral'}>
              {member.role}
            </Badge>
            {isSelf && (
              <span className='text-xs text-(--color-text-muted)'>(tú)</span>
            )}
          </div>
          <p className='text-xs text-(--color-text-muted) truncate'>
            {member.email} · se unió{' '}
            {formatLocal(member.joined_at, 'd MMM yyyy')}
          </p>
        </div>

        {canDelete && (
          <div className='shrink-0'>
            {!confirming ? (
              <Button
                variant='danger'
                size='sm'
                data-tour={isFirstRemovable ? 'admin-team-remove' : undefined}
                onClick={() => setConfirming(true)}
                disabled={working}
              >
                <TrashIcon size={16} />
              </Button>
            ) : (
              <div className='flex items-center gap-2'>
                <Button
                  variant='danger'
                  size='sm'
                  onClick={handleRemove}
                  loading={working}
                >
                  Confirmar
                </Button>
                <Button
                  variant='secondary'
                  size='sm'
                  onClick={() => setConfirming(false)}
                  disabled={working}
                >
                  Cancelar
                </Button>
              </div>
            )}
          </div>
        )}

        {isOnlyOwner && (
          <span className='text-xs text-(--color-text-muted) shrink-0 text-right'>
            Único owner
          </span>
        )}
      </div>
    </Card>
  )
}
