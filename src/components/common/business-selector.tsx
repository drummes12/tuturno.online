import { Link } from 'wouter'
import { useAuthStore } from '@/stores/auth'
import {
  StoreIcon,
  CalendarPlusIcon,
  CheckIcon
} from '@/components/common/icon'

interface BusinessSelectorProps {
  inMenu?: boolean
  onSelect?: () => void
}

type BusinessDisplayProps = {
  businessName: string
  role: 'owner' | 'manager'
  inMenu: boolean
  interactive: boolean
}

function BusinessDisplay({
  businessName,
  role,
  inMenu,
  interactive
}: BusinessDisplayProps) {
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
      {interactive && (
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
      )}
    </div>
  )
}

export function BusinessSelector({
  inMenu = false,
  onSelect
}: BusinessSelectorProps) {
  const { memberships, activeBusinessId, setActiveBusinessId } = useAuthStore()

  if (memberships.length === 0) return null

  const active =
    memberships.find((m) => m.businessId === activeBusinessId) ?? memberships[0]
  const hasMultiple = memberships.length > 1

  // Dentro del menú: lista real de opciones en vez de un <select> invisible,
  // que no es fiable como hit-target dentro de un popover.
  if (inMenu && hasMultiple) {
    return (
      <ul className='flex w-full flex-col gap-0.5'>
        {memberships.map((membership) => {
          const isActive = membership.businessId === active.businessId
          return (
            <li key={membership.businessId}>
              <button
                type='button'
                onClick={() => {
                  setActiveBusinessId(membership.businessId)
                  onSelect?.()
                }}
                className='flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left transition-colors hover:bg-surface-inset touch-target'
                aria-pressed={isActive}
              >
                <StoreIcon size={16} className='shrink-0 text-text-muted' />
                <span className='min-w-0 flex-1'>
                  <span className='block truncate text-sm font-semibold leading-tight text-(--color-text)'>
                    {membership.businessName}
                  </span>
                  <span className='mt-0.5 block truncate text-[11px] font-medium leading-tight text-text-muted'>
                    {membership.role === 'owner'
                      ? 'Propietario'
                      : 'Administrador'}
                  </span>
                </span>
                {isActive && (
                  <CheckIcon
                    size={16}
                    className='shrink-0 text-pitch-700 dark:text-pitch-300'
                  />
                )}
              </button>
            </li>
          )
        })}
      </ul>
    )
  }

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
            interactive
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
            interactive={false}
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
    <Link
      href={`/b/${active.slug}`}
      className='inline-flex min-w-0 max-w-24 md:max-w-none items-center justify-center gap-1.5 rounded-lg border border-white/15 bg-white/5 px-2.5 py-2 text-sm font-medium text-white/85 hover:border-white/30 hover:bg-white/15 hover:text-white transition-colors touch-target'
      aria-label={`Crear reserva en ${active.businessName}`}
      title={`Nueva reserva en ${active.businessName}`}
    >
      <CalendarPlusIcon size={16} className='shrink-0' />
      <span className='hidden min-w-0 max-w-16 truncate sm:inline md:max-w-none'>
        Nueva reserva
      </span>
    </Link>
  )
}
