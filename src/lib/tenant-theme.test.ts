import { describe, it, expect } from 'vitest'
import {
  processTenantTheme,
  contrastRatio,
  relativeLuminance,
  pickOnColor,
  hexToRgb,
  LIGHT_SURFACE,
  DARK_SURFACE
} from './tenant-theme'

describe('hexToRgb', () => {
  it('acepta formatos #rrggbb, rrggbb y #rgb', () => {
    expect(hexToRgb('#E30613')).toEqual({ r: 227, g: 6, b: 19 })
    expect(hexToRgb('0f7a4a')).toEqual({ r: 15, g: 122, b: 74 })
    expect(hexToRgb('#fff')).toEqual({ r: 255, g: 255, b: 255 })
  })
  it('rechaza entradas inválidas', () => {
    expect(hexToRgb('rojo')).toBeNull()
    expect(hexToRgb('#12345')).toBeNull()
  })
})

describe('luminancia y contraste', () => {
  it('blanco/negro dan los extremos', () => {
    expect(relativeLuminance('#ffffff')).toBeCloseTo(1)
    expect(relativeLuminance('#000000')).toBeCloseTo(0)
    expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21)
    expect(contrastRatio('#0f7a4a', '#0f7a4a')).toBeCloseTo(1)
  })
})

describe('processTenantTheme', () => {
  it('verde TuTurno: on-primary blanco, AA en claro y sugiere tono en oscuro', () => {
    const t = processTenantTheme('#0F7A4A')
    expect(t.primary).toBe('#0f7a4a')
    expect(t.onPrimary).toBe('#ffffff')
    expect(t.contrast.light.passesAA).toBe(true)
    // El verde no alcanza AA sobre la superficie oscura: la variante
    // on-surface se aclara automáticamente (como hace el fallback CSS).
    expect(t.contrast.dark.passesAA).toBe(false)
    expect(contrastRatio(t.onSurface.dark, DARK_SURFACE)).toBeGreaterThanOrEqual(4.5)
    expect(t.onSurface.light).toBe('#0f7a4a')
  })

  it('rojo de marca: pasa en claro pero se aclara en oscuro', () => {
    const t = processTenantTheme('#E30613')
    expect(t.onPrimary).toBe('#ffffff')
    expect(t.contrast.light.passesAA).toBe(true)
    expect(t.contrast.dark.passesAA).toBe(false)
    expect(t.contrast.dark.suggested).toBeDefined()
    expect(contrastRatio(t.contrast.dark.suggested!, DARK_SURFACE)).toBeGreaterThanOrEqual(4.5)
    expect(t.onSurface.dark).toBe(t.contrast.dark.suggested)
  })

  it('amarillo/neón: on-primary negro y sugiere tono más oscuro en claro', () => {
    const t = processTenantTheme('#FFD400')
    expect(t.onPrimary).toBe('#000000')
    expect(t.contrast.light.passesAA).toBe(false)
    expect(contrastRatio(t.onSurface.light, LIGHT_SURFACE)).toBeGreaterThanOrEqual(4.5)
  })

  it('casi blanco: el fill oscuro sigue legible y el on-surface se ajusta', () => {
    const t = processTenantTheme('#fdfdfd')
    expect(t.fill.light).not.toBe('#fdfdfd')
    expect(contrastRatio(t.fill.light, LIGHT_SURFACE)).toBeGreaterThanOrEqual(3)
    expect(contrastRatio(t.onSurface.light, LIGHT_SURFACE)).toBeGreaterThanOrEqual(4.5)
  })

  it('casi negro en dark: sugiere tono aclarado', () => {
    const t = processTenantTheme('#0d0d0d')
    expect(t.contrast.dark.passesAA).toBe(false)
    expect(contrastRatio(t.onSurface.dark, DARK_SURFACE)).toBeGreaterThanOrEqual(4.5)
    expect(contrastRatio(t.fill.dark, DARK_SURFACE)).toBeGreaterThanOrEqual(3)
  })

  it('variantes color-mix listas para CSS', () => {
    const t = processTenantTheme('#FF5722')
    expect(t.primarySoft).toContain('color-mix')
    expect(t.primarySoft).toContain('15%')
    expect(t.hover).toContain('88%')
    expect(t.active).toContain('78%')
  })

  it('lanza error con hex inválido', () => {
    expect(() => processTenantTheme('azul')).toThrow()
  })
})

describe('pickOnColor', () => {
  it('elige el texto que mejor contrasta', () => {
    expect(pickOnColor('#111111')).toBe('#ffffff')
    expect(pickOnColor('#eeeeee')).toBe('#000000')
  })
})
