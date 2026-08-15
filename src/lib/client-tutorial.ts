/**
 * Persistencia y configuración del tutorial guiado (Driver.js).
 *
 * Claves versionadas: si el contenido del tutorial cambia en una versión
 * futura, basta con incrementar TUTORIAL_VERSION para volver a mostrarlo
 * automáticamente a quienes ya lo vieron.
 */

const TUTORIAL_VERSION = 1

function visitorKey(): string {
  return `tuturno:tutorial:visitor:v${TUTORIAL_VERSION}`
}

function userKey(userId: string): string {
  return `tuturno:tutorial:user:${userId}:v${TUTORIAL_VERSION}`
}

function stageKey(): string {
  return `tuturno:tutorial:stage:v${TUTORIAL_VERSION}`
}

/** ¿El visitante actual ya vio el tutorial automático? */
export function hasVisitorSeenTutorial(): boolean {
  try {
    return localStorage.getItem(visitorKey()) === '1'
  } catch {
    return false
  }
}

/** ¿El usuario autenticado ya vio el tutorial automático? */
export function hasUserSeenTutorial(userId: string): boolean {
  try {
    return localStorage.getItem(userKey(userId)) === '1'
  } catch {
    return false
  }
}

/** Marca el tutorial automático como visto para el visitante. */
export function markVisitorTutorialSeen(): void {
  try {
    localStorage.setItem(visitorKey(), '1')
  } catch {
    // Silencioso: storage puede estar bloqueado
  }
}

/** Marca el tutorial automático como visto para el usuario autenticado. */
export function markUserTutorialSeen(userId: string): void {
  try {
    localStorage.setItem(userKey(userId), '1')
  } catch {
    // Silencioso
  }
}

export type TutorialStage =
  | 'public-discovery'
  | 'auth'
  | 'reservation'
  | 'my-reservations'

/** Guarda la etapa activa del tutorial entre navegaciones. */
export function setTutorialStage(stage: TutorialStage | null): void {
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
export function getTutorialStage(): TutorialStage | null {
  try {
    return (sessionStorage.getItem(stageKey()) as TutorialStage) ?? null
  } catch {
    return null
  }
}

/** Limpia la etapa activa. */
export function clearTutorialStage(): void {
  setTutorialStage(null)
}

/**
 * Determina si el tutorial automático debe iniciarse para el contexto actual.
 * Retorna el tipo de tour que corresponde o null si ya se vio.
 */
export function shouldAutoStart(opts: {
  userId: string | null
  isAdmin: boolean
}): boolean {
  if (opts.isAdmin) return false
  if (opts.userId) {
    return !hasUserSeenTutorial(opts.userId)
  }
  return !hasVisitorSeenTutorial()
}

/**
 * Marca el tutorial como visto según el contexto.
 */
export function markSeen(opts: { userId: string | null }): void {
  if (opts.userId) {
    markUserTutorialSeen(opts.userId)
  } else {
    markVisitorTutorialSeen()
  }
}
