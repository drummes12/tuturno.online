import { useEffect, useState } from 'react'
import { MapPinIcon } from '@/components/common/icon'
import { fetchBusinessContact } from '@/services/business'
import { googleMapsLink } from '@/lib/address'

/**
 * Botón flotante para abrir la ubicación del negocio en Google Maps.
 * No usa API key: genera un enlace a partir de la dirección textual.
 */
export function GoogleMapsFab() {
  const [address, setAddress] = useState<{
    street: string | null
    neighborhood: string | null
    city: string | null
    state: string | null
    country: string | null
  } | null>(null)

  useEffect(() => {
    let mounted = true

    fetchBusinessContact()
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
  }, [])

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
