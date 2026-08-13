import { describe, it, expect } from 'vitest'
import { dayRangeUtc, formatLocal, BUSINESS_TIMEZONE } from '@/lib/time'

describe('BUSINESS_TIMEZONE', () => {
  it('es America/Bogota', () => {
    expect(BUSINESS_TIMEZONE).toBe('America/Bogota')
  })
})

describe('dayRangeUtc', () => {
  it('retorna start y end como ISO strings', () => {
    const { start, end } = dayRangeUtc('2025-01-15')
    expect(typeof start).toBe('string')
    expect(typeof end).toBe('string')
    expect(start).toContain('T')
    expect(end).toContain('T')
  })

  it('start corresponde a 00:00:00 hora Bogotá', () => {
    // Bogotá es UTC-5, entonces 2025-01-15 00:00 Bogotá = 2025-01-15 05:00 UTC
    const { start } = dayRangeUtc('2025-01-15')
    expect(start).toBe('2025-01-15T05:00:00.000Z')
  })

  it('end corresponde a 23:59:59 hora Bogotá', () => {
    // 2025-01-15 23:59:59 Bogotá = 2025-01-16 04:59:59 UTC
    const { end } = dayRangeUtc('2025-01-15')
    expect(end).toBe('2025-01-16T04:59:59.000Z')
  })

  it('start es anterior a end', () => {
    const { start, end } = dayRangeUtc('2025-01-15')
    expect(new Date(start).getTime()).toBeLessThan(new Date(end).getTime())
  })

  it('el rango cubre casi 24 horas', () => {
    const { start, end } = dayRangeUtc('2025-01-15')
    const diffMs = new Date(end).getTime() - new Date(start).getTime()
    const diffHours = diffMs / (1000 * 60 * 60)
    // 23h 59m 59s ≈ 23.9997 horas
    expect(diffHours).toBeCloseTo(24 - 1 / 3600, 1)
  })

  it('maneja cambio de mes correctamente', () => {
    const { start, end } = dayRangeUtc('2025-01-31')
    expect(start).toBe('2025-01-31T05:00:00.000Z')
    expect(end).toBe('2025-02-01T04:59:59.000Z')
  })

  it('maneja año bisiesto (29 feb)', () => {
    const { start, end } = dayRangeUtc('2024-02-29')
    expect(start).toBe('2024-02-29T05:00:00.000Z')
    expect(end).toBe('2024-03-01T04:59:59.000Z')
  })
})

describe('formatLocal', () => {
  it('formatea una fecha UTC a hora local Bogotá', () => {
    // 2025-01-15T10:00:00Z = 2025-01-15 05:00 Bogotá
    expect(formatLocal('2025-01-15T10:00:00Z', 'HH:mm')).toBe('05:00')
  })

  it('acepta Date object', () => {
    const date = new Date('2025-01-15T10:00:00Z')
    expect(formatLocal(date, 'HH:mm')).toBe('05:00')
  })

  it('formatea fecha completa', () => {
    expect(formatLocal('2025-01-15T10:00:00Z', 'yyyy-MM-dd HH:mm')).toBe(
      '2025-01-15 05:00'
    )
  })

  it('maneja medianoche UTC correctamente', () => {
    // 2025-01-15T00:00:00Z = 2025-01-14 19:00 Bogotá (día anterior)
    expect(formatLocal('2025-01-15T00:00:00Z', 'yyyy-MM-dd HH:mm')).toBe(
      '2025-01-14 19:00'
    )
  })
})
