/**
 * Persistencia y configuración del tutorial guiado del panel admin (Driver.js).
 *
 * Claves versionadas: si el contenido del tutorial cambia en una versión
 * futura, basta con incrementar ADMIN_TUTORIAL_VERSION para volver a
 * mostrarlo automáticamente a quienes ya lo vieron.
 */

const ADMIN_TUTORIAL_VERSION = 1

function userKey(userId: string): string {
  return `tuturno:admin-tutorial:user:${userId}:v${ADMIN_TUTORIAL_VERSION}`
}

function stageKey(): string {
  return `tuturno:admin-tutorial:stage:v${ADMIN_TUTORIAL_VERSION}`
}

/** ¿El usuario admin ya vio el tutorial automático? */
export function hasAdminSeenTutorial(userId: string): boolean {
  try {
    return localStorage.getItem(userKey(userId)) === '1'
  } catch {
    return false
  }
}

/** Marca el tutorial automático como visto para el usuario admin. */
export function markAdminTutorialSeen(userId: string): void {
  try {
    localStorage.setItem(userKey(userId), '1')
  } catch {
    // Silencioso: storage puede estar bloqueado
  }
}

export type AdminTutorialStage =
  | 'admin-dashboard'
  | 'admin-resources'
  | 'admin-hours'
  | 'admin-config'
  | 'admin-reservations'
  | 'admin-team'

/** Guarda la etapa activa del tutorial entre navegaciones. */
export function setAdminTutorialStage(stage: AdminTutorialStage | null): void {
  try {
    if (stage) {
      sessionStorage.setItem(stageKey(), stage)
    } else {
      sessionStorage.removeItem(stageKey())
    }
  } catch {
    // Silencioso
  }
}

/** Recupera la etapa activa del tutorial, si existe. */
export function getAdminTutorialStage(): AdminTutorialStage | null {
  try {
    return (sessionStorage.getItem(stageKey()) as AdminTutorialStage) ?? null
  } catch {
    return null
  }
}

/** Limpia la etapa activa. */
export function clearAdminTutorialStage(): void {
  setAdminTutorialStage(null)
}

/**
 * Determina si el tutorial automático debe iniciarse para el contexto actual.
 * Solo aplica a usuarios admin autenticados que no lo hayan visto antes.
 */
export function shouldAutoStartAdmin(opts: {
  userId: string | null
  isAdmin: boolean
}): boolean {
  if (!opts.isAdmin || !opts.userId) return false
  return !hasAdminSeenTutorial(opts.userId)
}
