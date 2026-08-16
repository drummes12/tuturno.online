/**
 * Extract the tenant slug from a path like `/b/:slug/...`.
 * Returns null if the path is not a tenant route.
 */
export function extractSlugFromPath(path: string): string | null {
  const match = path.match(/^\/b\/([^/]+)/)
  return match ? decodeURIComponent(match[1]) : null
}

/**
 * Build a URL-safe slug from a free-form business name.
 * Mirrors the server-side rule: lowercase, digits and single hyphens.
 */
export function slugify(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)
    .replace(/-+$/g, '')
}

/** Extract the tenant slug from the current browser URL. */
export function getSlugFromUrl(): string | null {
  if (typeof window === 'undefined') return null
  return extractSlugFromPath(window.location.pathname)
}
