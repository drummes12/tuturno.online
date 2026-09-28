import { useLocation } from 'wouter'

/**
 * Panel de demostración pública (/demo/*).
 *
 * Las rutas /demo montan las páginas admin reales sin autenticación,
 * alimentadas por un dataset ficticio en memoria (demo-store.ts).
 * El punto de intercambio es `useBusinessId`, que devuelve
 * DEMO_BUSINESS_ID en estas rutas; los servicios reconocen ese
 * sentinel y las mutaciones se aplican sobre el store local.
 */

/** business_id sentinel que activa el modo demo en los servicios. */
export const DEMO_BUSINESS_ID = 'demo'

export function isDemoPath(path: string): boolean {
  return path === '/demo' || path.startsWith('/demo/')
}

export function isDemoBusinessId(id: string | null | undefined): boolean {
  return id === DEMO_BUSINESS_ID
}

/** Las entidades del demo llevan ids prefijados 'demo-'. */
export function isDemoEntityId(id: string | null | undefined): boolean {
  return typeof id === 'string' && id.startsWith('demo-')
}

/** '/demo/metricas' → '/admin/metricas' — para reutilizar lógica de rutas admin. */
export function demoToAdminPath(path: string): string {
  return path.replace(/^\/demo(?=\/|$)/, '/admin')
}

/** '/admin/metricas' → '/demo/metricas' — para links internos en modo demo. */
export function adminToDemoPath(path: string): string {
  return path.replace(/^\/admin(?=\/|$)/, '/demo')
}

/**
 * Base de navegación admin según contexto: '/demo' dentro de la
 * demostración, '/admin' en el panel real. Úsalo para links internos
 * (hub, "volver a Negocio", etc.).
 */
export function useAdminBase(): '/demo' | '/admin' {
  const [location] = useLocation()
  return isDemoPath(location) ? '/demo' : '/admin'
}
