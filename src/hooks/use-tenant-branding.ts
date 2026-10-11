import { useEffect } from 'react'
import { useLocation } from 'wouter'
import { useTenantStore, type TenantBusinessInfo } from '@/stores/tenant'
import { extractSlugFromPath } from '@/lib/slug'
import {
  applyTenantTheme,
  processTenantTheme,
  resetTenantTheme
} from '@/lib/tenant-theme'
import type { Business } from '@/types'

export function businessToTenantInfo(b: Business): TenantBusinessInfo {
  return {
    id: b.id,
    name: b.name,
    slug: b.slug,
    brandColor: b.brand_color,
    logoUrl: b.logo_url
  }
}

export interface TenantBranding {
  /** Nombre del negocio activo (null fuera de contexto tenant). */
  name: string | null
  slug: string | null
  /** Logo efectivo: override local o el del negocio. */
  logoUrl: string | null
  /** HEX efectivo aplicado a las vars --tenant-*. */
  brandColor: string | null
  /** true cuando el branding visible viene del override local. */
  isOverride: boolean
}

/**
 * Resuelve el branding del tenant activo y aplica las vars --tenant-*.
 * Vive en AppLayout pero solo actúa en el flujo de reservas del negocio
 * (rutas /b/:slug — disponibilidad, reserva, mis reservas y el modal de
 * detalle): el negocio lo alimenta useTenant (setBusiness) y el resto
 * de la app (admin, landing, auth, /demo/*) siempre queda en el
 * fallback verde TuTurno.
 */
export function useTenantBranding(): TenantBranding {
  const [location] = useLocation()
  const slug = extractSlugFromPath(location)
  const business = useTenantStore((s) => s.business)
  const override = useTenantStore((s) =>
    s.business ? (s.overrides[s.business.slug] ?? null) : null
  )
  const setBusiness = useTenantStore((s) => s.setBusiness)

  // Sin slug en la ruta no hay contexto tenant: limpiar el negocio
  // activo. Si el slug cambió a otro negocio, descartar el branding
  // viejo de inmediato.
  useEffect(() => {
    if (!slug && business) {
      setBusiness(null)
    } else if (slug && business && business.slug !== slug) {
      setBusiness(null)
    }
  }, [slug, business, setBusiness])

  const inTenant = Boolean(slug)
  const brandColor = inTenant
    ? (override?.brandColor ?? business?.brandColor ?? null)
    : null
  const logoUrl = inTenant
    ? (override?.logoUrl ?? business?.logoUrl ?? null)
    : null

  // Aplicar (o resetear) las vars --tenant-* al cambiar el color efectivo.
  useEffect(() => {
    if (!brandColor) {
      resetTenantTheme()
      return
    }
    try {
      applyTenantTheme(processTenantTheme(brandColor))
    } catch {
      resetTenantTheme()
    }
  }, [brandColor])

  return {
    name: inTenant ? (business?.name ?? null) : null,
    slug: inTenant ? (business?.slug ?? null) : null,
    logoUrl,
    brandColor,
    isOverride: inTenant && Boolean(override?.brandColor ?? override?.logoUrl)
  }
}
