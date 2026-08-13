import { useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'

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

  useEffect(() => {
    const channel = supabase
      .channel('reservations-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'reservations',
          ...(filter ? { filter } : {}),
        },
        () => {
          callbackRef.current()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [filter])
}
