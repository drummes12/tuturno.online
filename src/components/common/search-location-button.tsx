import { useState } from 'react'
import { Button } from '@/components/common/button'
import { formatFullAddress } from '@/lib/address'

interface SearchLocationButtonProps {
  addressParts: {
    street?: string | null
    neighborhood?: string | null
    city?: string | null
    state?: string | null
    country?: string | null
  }
  onFound: (lat: number, lng: number) => void
}

/**
 * Botón que busca las coordenadas de una dirección usando Nominatim
 * (OpenStreetMap). No requiere API key.
 */
export function SearchLocationButton({
  addressParts,
  onFound
}: SearchLocationButtonProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fullAddress = formatFullAddress(addressParts)

  async function handleSearch() {
    if (!fullAddress) {
      setError('Primero completa al menos la calle y la ciudad.')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
        fullAddress
      )}&limit=1`

      const res = await fetch(url, {
        headers: { 'Accept-Language': 'es' }
      })

      if (!res.ok) throw new Error('No se pudo buscar la dirección.')

      const data = (await res.json()) as Array<{ lat: string; lon: string }>

      if (data.length === 0) {
        setError('No se encontró la dirección. Prueba con más detalles.')
        return
      }

      const lat = parseFloat(data[0].lat)
      const lng = parseFloat(data[0].lon)

      if (isNaN(lat) || isNaN(lng)) {
        setError('Coordenadas inválidas.')
        return
      }

      onFound(lat, lng)
    } catch {
      setError('Error al buscar la ubicación.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className='flex flex-col items-center gap-2'>
      <Button
        type='button'
        variant='secondary'
        size='sm'
        loading={loading}
        onClick={handleSearch}
        disabled={!fullAddress}
      >
        Buscar en el mapa
      </Button>
      {error && (
        <p className='text-xs text-(--color-danger)'>{error}</p>
      )}
    </div>
  )
}
