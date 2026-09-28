import { useEffect, useRef } from 'react'
import { useLocation } from 'wouter'
import { supabase } from '@/lib/supabase'
import { isDemoPath } from '@/lib/demo'

/**
 * Hook para suscribirse a cambios en la tabla `reservations` vía Realtime.
 * Llama `onChange` cuando se inserta, actualiza o elimina una reserva.
 *
 * @param onChange Callback que se ejecuta cuando hay cambios
 * @param filter Filtro opcional (ej: `user_id=eq.xxx` o `business_id=eq.xxx`)
 */
export function useReservationsRealtime(
  onChange: () => void,
  filter?: string
) {
  const callbackRef = useRef(onChange)
  callbackRef.current = onChange
  const [location] = useLocation()

  useEffect(() => {
    // En /demo/* las reservas viven en memoria; no hay nada que escuchar.
    if (isDemoPath(location)) return

    const channel = supabase
      .channel('reservations-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'reservations',
          ...(filter ? { filter } : {})
        },
        () => {
          callbackRef.current()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [filter, location])
}
