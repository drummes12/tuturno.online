import { useEffect, useState } from 'react'
import { MapPinIcon } from '@/components/common/icon'
import { fetchBusinessContactById } from '@/services/business'
import { getSlugFromUrl } from '@/lib/slug'
import { useTenant } from '@/hooks/use-tenant'
import { googleMapsLink } from '@/lib/address'

type GoogleMapsFabProps = {
  /** Explicit business ID. If not provided, resolves from URL slug. */
  businessId?: string
}

/**
 * Botón flotante para abrir la ubicación del negocio en Google Maps.
 * No usa API key: genera un enlace a partir de la dirección textual.
 */
export function GoogleMapsFab({ businessId }: GoogleMapsFabProps = {}) {
  const slug = getSlugFromUrl() ?? undefined
  const { business: tenantBusiness } = useTenant(businessId ? undefined : slug)
  const resolvedBusinessId = businessId ?? tenantBusiness?.id ?? null

  const [address, setAddress] = useState<{
    street: string | null
    neighborhood: string | null
    city: string | null
    state: string | null
    country: string | null
  } | null>(null)

  useEffect(() => {
    if (!resolvedBusinessId) return
    let mounted = true

    fetchBusinessContactById(resolvedBusinessId)
      .then((data) => {
        if (!mounted || !data) return
        setAddress({
          street: data.street,
          neighborhood: data.neighborhood,
          city: data.city,
          state: data.state,
          country: data.country
        })
      })
      .catch(() => {
        // La ubicación es opcional y no debe bloquear la aplicación.
      })

    return () => {
      mounted = false
    }
  }, [resolvedBusinessId])

  if (!address) return null

  const hasAddress = Object.values(address).some(Boolean)
  if (!hasAddress) return null

  return (
    <a
      href={googleMapsLink(address)}
      target='_blank'
      rel='noopener noreferrer'
      className='flex items-center justify-center w-12 h-12 rounded-full bg-(--color-primary) text-white shadow-lg hover:bg-(--color-primary-hover) hover:shadow-xl active:scale-95 transition-all duration-200 ease-spring md:hidden'
      aria-label='Abrir ubicación en Google Maps'
      title='Cómo llegar'
    >
      <span className='relative'>
        <MapPinIcon size={24} />
      </span>
    </a>
  )
}
