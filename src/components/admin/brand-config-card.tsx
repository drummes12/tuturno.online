import { useMemo } from 'react'
import type { CSSProperties } from 'react'
import { Card } from '@/components/common/card'
import { Input } from '@/components/common/input'
import {
  CheckIcon,
  XIcon,
  SparklesIcon,
  ExternalLinkIcon
} from '@/components/common/icon'
import {
  processTenantTheme,
  hexToRgb,
  type TenantTheme
} from '@/lib/tenant-theme'
import { TENANT_BRAND_PRESETS, useTenantStore } from '@/stores/tenant'

/**
 * Configurador de marca del negocio (co-branding). Edita color HEX y
 * logo, valida el contraste en vivo y muestra una muestra acotada del
 * tema. El branding real solo se aplica en la página pública de
 * reservas (/b/{slug}) — este panel nunca se retiene.
 */

interface BrandConfigCardProps {
  /** HEX guardado en el draft del negocio (null = fallback verde). */
  color: string | null
  logoUrl: string | null
  /** Slug público para enlazar la vista de cliente. */
  slug: string
  onChange: (patch: {
    brand_color: string | null
    logo_url: string | null
  }) => void
  disabled?: boolean
  className?: string
}

/** Vars --tenant-* como estilos inline para acotar el tema a un contenedor. */
function tenantVarsStyle(theme: TenantTheme): CSSProperties {
  return {
    '--tenant-primary': theme.fill.light,
    '--tenant-on-primary': theme.onPrimary,
    '--tenant-primary-contrast': theme.onSurface.light,
    '--tenant-primary-dark': theme.fill.dark,
    '--tenant-on-primary-dark': theme.onPrimaryContrast.passesAA
      ? theme.onPrimary
      : '#ffffff',
    '--tenant-primary-contrast-dark': theme.onSurface.dark,
    /* Las vars indireccionadas (--color-primary: var(--tenant-primary)) se
       resuelven donde se declaran (:root, con el fallback); dentro de una
       vista acotada hay que reemitirlas con el valor ya calculado. */
    '--color-primary': theme.fill.light,
    '--color-on-primary': theme.onPrimary,
    '--color-tenant': theme.onSurface.light,
    '--tenant-primary-soft': theme.primarySoft,
    '--tenant-primary-hover': theme.hover,
    '--tenant-primary-active': theme.active,
    '--shadow-tenant': `0 4px 14px color-mix(in srgb, ${theme.fill.light} 20%, transparent)`
  } as CSSProperties
}

function ContrastRow({ label, ratio, passes }: { label: string; ratio: number; passes: boolean }) {
  return (
    <div className='flex items-center justify-between gap-2 text-sm'>
      <span className='text-(--color-text-muted)'>{label}</span>
      <span
        className={`nums inline-flex items-center gap-1.5 font-medium ${
          passes
            ? 'text-pitch-700 dark:text-pitch-300'
            : 'text-orange-800 dark:text-orange-300'
        }`}
      >
        {passes ? <CheckIcon size={13} /> : <XIcon size={13} />}
        {ratio.toFixed(2)}:1 {passes ? 'AA' : '(mín. 4.5)'}
      </span>
    </div>
  )
}

export function BrandConfigCard({
  color,
  logoUrl,
  slug,
  onChange,
  disabled = false,
  className = ''
}: BrandConfigCardProps) {
  const override = useTenantStore((s) => s.override)
  const setOverride = useTenantStore((s) => s.setOverride)

  // La vista previa sigue lo que realmente se vería en /b/:slug: el
  // override local (preset o edición) gana sobre el HEX del draft;
  // si no hay nada, se muestra el fallback verde TuTurno.
  const theme = useMemo(() => {
    const hex = (override?.brandColor ?? color ?? '#0F7A4A').trim()
    if (!hexToRgb(hex)) return null
    try {
      return processTenantTheme(hex)
    } catch {
      return null
    }
  }, [override?.brandColor, color])

  // Previsualización en vivo: cada edición se refleja al instante en
  // la página pública vía override local (localStorage). No escribe al
  // backend — al guardar, el override coincide con lo persistido. Solo
  // se sincroniza al editar, así no pisa un preset al montar la tarjeta.
  const handleChange = (patch: {
    brand_color: string | null
    logo_url: string | null
  }) => {
    onChange(patch)
    const hex = patch.brand_color?.trim() ?? null
    const validColor = hex && hexToRgb(hex) ? hex : null
    if (!validColor && !patch.logo_url) {
      setOverride(null)
    } else {
      setOverride({ brandColor: validColor, logoUrl: patch.logo_url })
    }
  }

  return (
    <Card className={`p-5 animate-fade-up ${className}`}>
      <div className='flex items-center gap-2 mb-1'>
        <div className='flex items-center justify-center w-8 h-8 rounded-lg bg-surface-inset text-text-muted'>
          <SparklesIcon size={18} />
        </div>
        <h2 className='text-xs font-medium uppercase tracking-[0.14em] text-(--color-text)'>
          Marca del negocio
        </h2>
      </div>
      <p className='text-xs text-(--color-text-muted) mb-4'>
        El color y el logo se ven en tu página pública de reservas, no en
        este panel.
      </p>

      <div className='flex flex-col gap-4'>
        {/* Color de marca — picker nativo + HEX */}
        <div className='flex items-end gap-3'>
          <input
            type='color'
            value={hexToRgb(color ?? '') ? (color ?? '#0F7A4A') : '#0F7A4A'}
            onChange={(e) =>
              handleChange({ brand_color: e.target.value, logo_url: logoUrl })
            }
            disabled={disabled}
            aria-label='Selector de color de marca'
            className='h-12 w-12 shrink-0 cursor-pointer rounded-lg border border-border bg-surface-inset p-1 touch-target disabled:cursor-not-allowed disabled:opacity-50'
          />
          <Input
            label='Color de marca (HEX)'
            value={color ?? ''}
            onChange={(e) =>
              handleChange({
                brand_color: e.target.value.trim() === '' ? null : e.target.value,
                logo_url: logoUrl
              })
            }
            placeholder='#0F7A4A'
            name='brand-color'
            wrapperClassName='flex-1'
            error={
              color && !theme
                ? 'Usa formato HEX: #RRGGBB o #RGB.'
                : null
            }
            hint='Si lo dejas vacío se usa el verde TuTurno.'
          />
        </div>

        {/* Presets de demostración — solo override local, no se guardan */}
        <div>
          <p className='mb-2 text-xs font-semibold uppercase tracking-wider text-(--color-text-muted)'>
            Marcas de ejemplo
          </p>
          <div className='flex flex-wrap gap-2'>
            {TENANT_BRAND_PRESETS.map((preset) => {
              const active = override?.brandColor === preset.brandColor
              return (
                <button
                  key={preset.id}
                  type='button'
                  disabled={disabled}
                  onClick={() =>
                    setOverride(
                      active
                        ? null
                        : {
                            brandColor: preset.brandColor,
                            logoUrl: preset.logoUrl
                          }
                    )
                  }
                  className={`inline-flex touch-target items-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium transition-colors ${
                    active
                      ? 'border-(--color-primary) bg-(--color-primary)/10 text-(--color-text)'
                      : 'border-border bg-surface-inset text-(--color-text-muted) hover:border-graphite-300 hover:text-(--color-text)'
                  }`}
                  aria-pressed={active}
                >
                  <img
                    src={preset.logoUrl}
                    alt=''
                    className='h-4 w-4 rounded object-contain'
                    aria-hidden='true'
                  />
                  {preset.name}
                </button>
              )
            })}
          </div>
          <p className='mt-2 text-[11px] leading-relaxed text-(--color-text-muted)'>
            Los cambios del formulario y las marcas de ejemplo se
            previsualizan al instante en este navegador (localStorage)
            sin guardar nada — ábrelo en{' '}
            <a
              href={`/b/${slug}`}
              className='font-medium text-tenant underline underline-offset-2'
            >
              tu página pública
            </a>
            . Si hay una marca de prueba activa, tap de nuevo para quitarla.
          </p>
        </div>

        {/* Logo */}
        <Input
          label='Logo del negocio (URL)'
          value={logoUrl ?? ''}
          onChange={(e) =>
            handleChange({
              brand_color: color,
              logo_url: e.target.value.trim() === '' ? null : e.target.value
            })
          }
          placeholder='https://…/logo.png'
          name='brand-logo'
          hint='Aparece junto al nombre TuTurno en el encabezado público.'
        />
        {logoUrl && (
          <div className='flex items-center gap-3 rounded-lg border border-border bg-surface-inset p-3'>
            <img
              src={logoUrl}
              alt='Vista previa del logo'
              className='h-10 w-10 rounded-lg bg-white object-contain p-1'
            />
            <a
              href={logoUrl}
              target='_blank'
              rel='noopener noreferrer'
              className='inline-flex items-center gap-1 text-xs font-medium text-tenant hover:underline'
            >
              <ExternalLinkIcon size={13} />
              Abrir imagen
            </a>
          </div>
        )}

        {/* Validación de contraste en vivo */}
        {theme && (
          <div className='rounded-lg border border-border bg-surface-inset p-3'>
            <p className='mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-(--color-text-muted)'>
              Accesibilidad (WCAG AA)
            </p>
            <ContrastRow
              label='Contraste en modo claro'
              ratio={theme.contrast.light.ratio}
              passes={theme.contrast.light.passesAA}
            />
            <ContrastRow
              label='Contraste en modo oscuro'
              ratio={theme.contrast.dark.ratio}
              passes={theme.contrast.dark.passesAA}
            />
            {(!theme.contrast.light.passesAA ||
              !theme.contrast.dark.passesAA) && (
              <p className='mt-2 text-[11px] leading-relaxed text-(--color-text-muted)'>
                Se usará el tono ajustado más cercano para textos y bordes:
                {!theme.contrast.light.passesAA &&
                  ` claro ${theme.contrast.light.suggested}`}
                {!theme.contrast.dark.passesAA &&
                  ` oscuro ${theme.contrast.dark.suggested}`}
                . El color de relleno conserva tu marca.
              </p>
            )}
          </div>
        )}

        {/* Muestra acotada — las vars --tenant-* solo viven en este div */}
        {theme && (
          <div
            style={tenantVarsStyle(theme)}
            className='rounded-xl border border-border bg-surface p-4'
          >
            <p className='mb-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-(--color-text-muted)'>
              Vista previa
            </p>
            <div className='flex flex-wrap items-center gap-2'>
              <span className='inline-flex items-center gap-1.5 rounded-lg bg-(--color-primary) px-3.5 py-2 text-sm font-medium text-on-primary shadow-(--shadow-tenant)'>
                <CheckIcon size={14} />
                Reservar
              </span>
              <span className='inline-flex items-center gap-1 rounded-full border border-tenant/40 bg-(--tenant-primary-soft) px-2.5 py-1 text-xs font-medium text-tenant'>
                <CheckIcon size={11} />
                Libre
              </span>
              <span className='text-sm font-medium text-tenant underline underline-offset-2'>
                Enlace de marca
              </span>
            </div>
          </div>
        )}
      </div>
    </Card>
  )
}
