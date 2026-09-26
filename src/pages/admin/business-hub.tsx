import { Link } from 'wouter'
import { Card } from '@/components/common/card'
import {
  ScheduleIcon,
  StoreIcon,
  LockIcon,
  UsersIcon,
  SettingsIcon,
  ChevronRightIcon
} from '@/components/common/icon'
import { Page } from '@/components/layout/page'

type HubItem = {
  label: string
  description: string
  href: string
  icon: React.ReactNode
  tourKey?: string
}

const items: HubItem[] = [
  {
    label: 'Recursos',
    description: 'Crea y administra tus canchas, salas o mesas reservables.',
    href: '/admin/recursos',
    icon: <StoreIcon size={22} />
  },
  {
    label: 'Horarios',
    description: 'Define las franjas horarias en las que aceptas reservas.',
    href: '/admin/horarios',
    icon: <ScheduleIcon size={22} />,
    tourKey: 'business-hub-hours'
  },
  {
    label: 'Cierres',
    description:
      'Bloquea fechas u horarios puntuales (festivos, mantenimiento).',
    href: '/admin/excepciones',
    icon: <LockIcon size={22} />
  },
  {
    label: 'Equipo',
    description: 'Añade o quita managers que administran este negocio.',
    href: '/admin/equipo',
    icon: <UsersIcon size={22} />
  },
  {
    label: 'Configuración',
    description:
      'Duración de turnos, hold temporal, política de cancelación e instrucciones.',
    href: '/admin/configuracion',
    icon: <SettingsIcon size={22} />,
    tourKey: 'business-hub-config'
  }
]

/**
 * Hub de configuración del negocio. Agrupa las secciones que se
 * ajustan ocasionalmente (a diferencia de Operación/Reservas/Métricas,
 * de uso diario) para no sobrecargar el bottom nav en mobile.
 */
export function AdminBusinessHubPage() {
  return (
    <Page width='narrow'>
      <div>
        <h1 className='text-2xl font-bold tracking-tight'>Negocio</h1>
        <p className='text-sm text-text-muted mt-0.5'>
          Configuración y administración de tu negocio.
        </p>
      </div>

      <div className='flex flex-col gap-3'>
        {items.map((item, index) => (
          <Link key={item.href} href={item.href}>
            <Card
              data-tour={item.tourKey}
              className='group flex animate-stagger items-center gap-4 p-4 transition-all duration-200 ease-spring hover:-translate-y-0.5 hover:border-pitch-600/40 hover:shadow-(--shadow-sm) cursor-pointer touch-target'
              style={{ '--index': index } as React.CSSProperties}
            >
              <div className='flex items-center justify-center w-11 h-11 rounded-xl bg-pitch-100 text-pitch-700 dark:bg-pitch-500/15 dark:text-pitch-300 shrink-0'>
                {item.icon}
              </div>
              <div className='flex-1 min-w-0'>
                <h2 className='font-semibold text-sm tracking-tight'>
                  {item.label}
                </h2>
                <p className='text-xs text-text-muted mt-0.5'>
                  {item.description}
                </p>
              </div>
              <ChevronRightIcon
                size={18}
                className='text-text-muted shrink-0 transition-transform duration-200 group-hover:translate-x-0.5'
              />
            </Card>
          </Link>
        ))}
      </div>
    </Page>
  )
}
