/**
 * Navegación con View Transitions nativas (mismo documento): el cambio de
 * ruta se envuelve en `document.startViewTransition` para un crossfade
 * suave en vez de un corte. Sin soporte del navegador o con
 * prefers-reduced-motion la navegación queda instantánea.
 */
export function navigateWithTransition(
  navigate: (to: string) => void,
  to: string
) {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  if (reduced || typeof document.startViewTransition !== 'function') {
    navigate(to)
    return
  }
  document.startViewTransition(() => navigate(to))
}
