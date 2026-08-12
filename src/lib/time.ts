import { format } from 'date-fns'
import { toZonedTime, fromZonedTime } from 'date-fns-tz'

export const BUSINESS_TIMEZONE = 'America/Bogota'

/**
 * Devuelve el rango UTC [start, end] que cubre un día completo
 * (00:00→23:59:59) en la zona horaria del negocio.
 *
 * Las reservas se almacenan en UTC; filtrar por `${date}T00:00:00`
 * sin convertir a la zona del negocio descuadra los bordes del día.
 */
export function dayRangeUtc(dateStr: string): { start: string; end: string } {
  const startLocal = fromZonedTime(`${dateStr}T00:00:00`, BUSINESS_TIMEZONE)
  const endLocal = fromZonedTime(`${dateStr}T23:59:59`, BUSINESS_TIMEZONE)
  return {
    start: startLocal.toISOString(),
    end: endLocal.toISOString(),
  }
}

/**
 * Formatea una marca UTC en la zona horaria del negocio.
 */
export function formatLocal(
  date: Date | string,
  pattern: string,
): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return format(toZonedTime(d, BUSINESS_TIMEZONE), pattern)
}
