import { create } from 'zustand'
import { persist } from 'zustand/middleware'

/**
 * Tenant activo — branding del negocio que está viendo el usuario.
 *
 * `business` lo alimenta useTenant (rutas /b/:slug) o el hook
 * useTenantBranding (contexto admin/demo). `override` es la
 * previsualización local del Admin/Demo: se persiste en localStorage
 * y gana sobre el branding del negocio sin tocar el backend.
 */

export interface TenantBusinessInfo {
  id: string
  name: string
  slug: string
  brandColor: string | null
  logoUrl: string | null
}

export interface TenantBrandingOverride {
  /** HEX de marca a previsualizar (null = sin override de color). */
  brandColor: string | null
  /** URL del logo a previsualizar (null = sin override de logo). */
  logoUrl: string | null
}

/** Marcas de ejemplo para probar el co-branding sin backend. */
export const TENANT_BRAND_PRESETS = [
  {
    id: 'tuturno',
    name: 'TuTurno Original',
    brandColor: '#0F7A4A',
    logoUrl: '/logo-mark.svg'
  },
  {
    id: 'ungim',
    name: 'UnGim',
    brandColor: '#FF9078',
    logoUrl: '/brand-presets/ungim.svg'
  }
] as const

export type TenantBrandPreset = (typeof TENANT_BRAND_PRESETS)[number]

interface TenantState {
  business: TenantBusinessInfo | null
  override: TenantBrandingOverride | null
  setBusiness: (business: TenantBusinessInfo | null) => void
  setOverride: (override: TenantBrandingOverride | null) => void
}

export const useTenantStore = create<TenantState>()(
  persist(
    (set) => ({
      business: null,
      override: null,
      setBusiness: (business) => set({ business }),
      setOverride: (override) => set({ override })
    }),
    {
      name: 'tuturno:tenant-override',
      partialize: (state) => ({ override: state.override })
    }
  )
)
