/**
 * Extract the tenant slug from a path like `/b/:slug/...`.
 * Returns null if the path is not a tenant route.
 */
export function extractSlugFromPath(path: string): string | null {
  const match = path.match(/^\/b\/([^/]+)/)
  return match ? decodeURIComponent(match[1]) : null
}

/** Extract the tenant slug from the current browser URL. */
export function getSlugFromUrl(): string | null {
  if (typeof window === 'undefined') return null
  return extractSlugFromPath(window.location.pathname)
}
