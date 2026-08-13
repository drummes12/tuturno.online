import { describe, it, expect } from 'vitest'
import { waLink } from '@/lib/whatsapp'

describe('waLink', () => {
  it('retorna null para phone null', () => {
    expect(waLink(null)).toBeNull()
  })

  it('retorna null para phone undefined', () => {
    expect(waLink(undefined)).toBeNull()
  })

  it('retorna null para string vacío', () => {
    expect(waLink('')).toBeNull()
  })

  it('retorna null para string sin dígitos', () => {
    expect(waLink('---')).toBeNull()
  })

  it('limpia formato +57 300 123 4567', () => {
    expect(waLink('+57 300 123 4567')).toBe('https://wa.me/573001234567')
  })

  it('acepta solo dígitos', () => {
    expect(waLink('573001234567')).toBe('https://wa.me/573001234567')
  })

  it('acepta número local sin código de país', () => {
    expect(waLink('3001234567')).toBe('https://wa.me/3001234567')
  })

  it('filtra letras y símbolos', () => {
    expect(waLink('call: (57) 300-abc-1234')).toBe('https://wa.me/573001234')
  })

  it('incluye mensaje codificado cuando se proporciona', () => {
    const result = waLink('573001234567', 'Hola, quiero reservar')
    expect(result).toBe('https://wa.me/573001234567?text=Hola%2C%20quiero%20reservar')
  })

  it('codifica caracteres especiales en el mensaje', () => {
    const result = waLink('3001234567', '¿Hola & qué tal?')
    expect(result).toContain('?text=')
    expect(result).toContain('%26')
    expect(result).toContain('%C2%BF')
  })

  it('no incluye query string cuando no hay mensaje', () => {
    expect(waLink('3001234567')).not.toContain('?')
  })
})
