import { describe, it, expect } from 'vitest'
import { waLink, resolveWhatsAppLink } from '@/lib/whatsapp'

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

describe('resolveWhatsAppLink', () => {
  it('usa whatsapp_link cuando está configurado (prioridad sobre phone)', () => {
    const result = resolveWhatsAppLink(
      'https://wa.me/573009876543',
      '3001234567'
    )
    expect(result).toBe('https://wa.me/573009876543')
  })

  it('cae al phone cuando whatsapp_link es null', () => {
    const result = resolveWhatsAppLink(null, '+57 300 123 4567')
    expect(result).toBe('https://wa.me/573001234567')
  })

  it('cae al phone cuando whatsapp_link es string vacío', () => {
    const result = resolveWhatsAppLink('', '3001234567')
    expect(result).toBe('https://wa.me/3001234567')
  })

  it('cae al phone cuando whatsapp_link es solo espacios', () => {
    const result = resolveWhatsAppLink('   ', '3001234567')
    expect(result).toBe('https://wa.me/3001234567')
  })

  it('retorna null cuando no hay phone ni whatsapp_link', () => {
    expect(resolveWhatsAppLink(null, null)).toBeNull()
  })

  it('acepta @username y lo normaliza a wa.me', () => {
    const result = resolveWhatsAppLink('@mi_negocio', null)
    expect(result).toBe('https://wa.me/mi_negocio')
  })

  it('acepta username sin @', () => {
    const result = resolveWhatsAppLink('mi_negocio', null)
    expect(result).toBe('https://wa.me/mi_negocio')
  })

  it('usa URL completa de wa.me tal cual', () => {
    const result = resolveWhatsAppLink('https://wa.me/573001234567', null)
    expect(result).toBe('https://wa.me/573001234567')
  })

  it('usa URL completa de whatsapp.com tal cual', () => {
    const result = resolveWhatsAppLink('https://chat.whatsapp.com/abc123', null)
    expect(result).toBe('https://chat.whatsapp.com/abc123')
  })

  it('añade mensaje a URL completa si no lo tiene', () => {
    const result = resolveWhatsAppLink(
      'https://wa.me/573001234567',
      null,
      'Hola'
    )
    expect(result).toBe('https://wa.me/573001234567?text=Hola')
  })

  it('no duplica mensaje si la URL ya lo tiene', () => {
    const result = resolveWhatsAppLink(
      'https://wa.me/573001234567?text=Ya+hay+mensaje',
      null,
      'Hola'
    )
    expect(result).toBe('https://wa.me/573001234567?text=Ya+hay+mensaje')
  })

  it('añade mensaje a username normalizado', () => {
    const result = resolveWhatsAppLink('@mi_negocio', null, 'Hola')
    expect(result).toBe('https://wa.me/mi_negocio?text=Hola')
  })
})
