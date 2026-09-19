const RECENTS_KEY = 'tuturno:recent-businesses'
const MAX_RECENTS = 5

export type RecentBusiness = {
  slug: string
  name: string
}

/**
 * Negocios visitados recientemente en este dispositivo, más reciente
 * primero. Solo localStorage — sin cuenta ni sincronización.
 */
export function getRecentBusinesses(): RecentBusiness[] {
  try {
    const raw = localStorage.getItem(RECENTS_KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter(
      (item): item is RecentBusiness =>
        typeof item === 'object' &&
        item !== null &&
        typeof (item as RecentBusiness).slug === 'string' &&
        typeof (item as RecentBusiness).name === 'string'
    )
  } catch {
    return []
  }
}

export function recordBusinessVisit(slug: string, name: string) {
  try {
    const recents = getRecentBusinesses().filter((b) => b.slug !== slug)
    recents.unshift({ slug, name })
    localStorage.setItem(
      RECENTS_KEY,
      JSON.stringify(recents.slice(0, MAX_RECENTS))
    )
  } catch {
    // Storage lleno o navegación privada — los recientes son best-effort.
  }
}
