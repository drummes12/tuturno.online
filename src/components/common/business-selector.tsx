import { useAuthStore } from '@/stores/auth'
import { StoreIcon, CalendarPlusIcon } from '@/components/common/icon'

interface BusinessSelectorProps {
  inMenu?: boolean
}

type BusinessDisplayProps = {
  businessName: string
  role: 'owner' | 'manager'
  inMenu: boolean
}

function BusinessDisplay({ businessName, role, inMenu }: BusinessDisplayProps) {
  return (
    <div className='pointer-events-none flex min-w-0 items-center gap-2'>
      <StoreIcon
        size={16}
        className={
          inMenu ? 'shrink-0 text-text-muted' : 'shrink-0 text-white/60'
        }
      />
      <span className={`min-w-0 ${inMenu ? 'block' : 'hidden sm:block'}`}>
        <span
          className={`block truncate text-sm font-semibold leading-tight ${inMenu ? 'text-(--color-text)' : 'text-white'}`}
        >
          {businessName}
        </span>
        <span
          className={`mt-0.5 block truncate text-[11px] font-medium leading-tight ${inMenu ? 'text-text-muted' : 'text-white/60'}`}
        >
          {role === 'owner' ? 'Propietario' : 'Administrador'}
        </span>
      </span>
      <svg
        className={`ml-auto shrink-0 ${inMenu ? 'text-text-muted' : 'text-white/60'}`}
        width='12'
        height='12'
        viewBox='0 0 12 12'
        fill='none'
        aria-hidden='true'
      >
        <path
          d='M3 4.5L6 7.5L9 4.5'
          stroke='currentColor'
          strokeWidth='1.5'
          strokeLinecap='round'
          strokeLinejoin='round'
        />
      </svg>
    </div>
  )
}

export function BusinessSelector({ inMenu = false }: BusinessSelectorProps) {
  const { memberships, activeBusinessId, setActiveBusinessId } = useAuthStore()

  if (memberships.length === 0) return null

  const active =
    memberships.find((m) => m.businessId === activeBusinessId) ?? memberships[0]
  const hasMultiple = memberships.length > 1
  const shellClasses = inMenu
    ? 'w-full border-border-strong bg-surface'
    : 'w-11 border-white/15 bg-white/5 sm:w-auto sm:max-w-32 md:max-w-50'

  return (
    <div
      className={
        inMenu ? 'flex w-full items-center' : 'flex items-center gap-1 sm:gap-2'
      }
    >
      {hasMultiple ? (
        <div
          className={`relative min-w-0 rounded-lg border px-2.5 py-2 shadow-sm transition-colors focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-flood-400 ${shellClasses}`}
        >
          <select
            value={active.businessId}
            onChange={(event) =>
              setActiveBusinessId(event.target.value || null)
            }
            className='absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0'
            aria-label='Seleccionar negocio'
          >
            {memberships.map((membership) => (
              <option key={membership.businessId} value={membership.businessId}>
                {membership.businessName} ·{' '}
                {membership.role === 'owner' ? 'Propietario' : 'Administrador'}
              </option>
            ))}
          </select>
          <BusinessDisplay
            businessName={active.businessName}
            role={active.role}
            inMenu={inMenu}
          />
        </div>
      ) : (
        <div
          className={`min-w-0 rounded-lg border px-2.5 py-2 ${shellClasses}`}
        >
          <BusinessDisplay
            businessName={active.businessName}
            role={active.role}
            inMenu={inMenu}
          />
        </div>
      )}
    </div>
  )
}

export function NewReservationButton() {
  const { memberships, activeBusinessId } = useAuthStore()
  const active =
    memberships.find((m) => m.businessId === activeBusinessId) ?? memberships[0]

  if (!active) return null

  return (
    <a
      href={`${window.location.origin}/b/${active.slug}`}
      className='inline-flex min-w-0 max-w-24 md:max-w-none items-center justify-center gap-1.5 rounded-lg border border-white/15 bg-white/5 px-2.5 py-2 text-sm font-medium text-white/85 hover:border-white/30 hover:bg-white/15 hover:text-white transition-colors touch-target'
      aria-label={`Crear reserva en ${active.businessName}`}
      title={`Nueva reserva en ${active.businessName}`}
    >
      <CalendarPlusIcon size={16} className='shrink-0' />
      <span className='hidden min-w-0 max-w-16 truncate sm:inline md:max-w-none'>
        Nueva reserva
      </span>
    </a>
  )
}
