import { describe, it, expect } from 'vitest'
import {
  resolveWhatsAppLink,
  buildClientReservationMessage,
  buildClientPendingMessage,
  buildBusinessContactMessage,
  buildGeneralInquiryMessage,
  DEFAULT_RESOURCE_LABEL
} from '@/lib/whatsapp'

describe('resolveWhatsAppLink', () => {
  it('retorna null para phone null sin override', () => {
    expect(resolveWhatsAppLink(null, null)).toBeNull()
  })

  it('retorna null para phone undefined sin override', () => {
    expect(resolveWhatsAppLink(undefined, undefined)).toBeNull()
  })

  it('retorna null para strings vacíos', () => {
    expect(resolveWhatsAppLink('', '')).toBeNull()
  })

  it('retorna null para string sin dígitos', () => {
    expect(resolveWhatsAppLink(null, '---')).toBeNull()
  })

  it('limpia formato +57 300 123 4567', () => {
    expect(resolveWhatsAppLink(null, '+57 300 123 4567')).toBe(
      'https://wa.me/573001234567'
    )
  })

  it('acepta solo dígitos', () => {
    expect(resolveWhatsAppLink(null, '573001234567')).toBe(
      'https://wa.me/573001234567'
    )
  })

  it('acepta número local sin código de país', () => {
    expect(resolveWhatsAppLink(null, '3001234567')).toBe(
      'https://wa.me/3001234567'
    )
  })

  it('filtra letras y símbolos', () => {
    expect(resolveWhatsAppLink(null, 'call: (57) 300-abc-1234')).toBe(
      'https://wa.me/573001234'
    )
  })

  it('incluye mensaje codificado cuando se proporciona', () => {
    const result = resolveWhatsAppLink(
      null,
      '573001234567',
      'Hola, quiero reservar'
    )
    expect(result).toBe(
      'https://wa.me/573001234567?text=Hola%2C%20quiero%20reservar'
    )
  })

  it('codifica caracteres especiales en el mensaje', () => {
    const result = resolveWhatsAppLink(null, '3001234567', '¿Hola & qué tal?')
    expect(result).toContain('?text=')
    expect(result).toContain('%26')
    expect(result).toContain('%C2%BF')
  })

  it('no incluye query string cuando no hay mensaje', () => {
    expect(resolveWhatsAppLink(null, '3001234567')).not.toContain('?')
  })

  // Override (whatsapp_link)

  it('usa whatsapp_link cuando está configurado (prioridad sobre phone)', () => {
    expect(
      resolveWhatsAppLink('https://wa.me/573009876543', '3001234567')
    ).toBe('https://wa.me/573009876543')
  })

  it('cae al phone cuando whatsapp_link es null', () => {
    expect(resolveWhatsAppLink(null, '+57 300 123 4567')).toBe(
      'https://wa.me/573001234567'
    )
  })

  it('cae al phone cuando whatsapp_link es string vacío', () => {
    expect(resolveWhatsAppLink('', '3001234567')).toBe(
      'https://wa.me/3001234567'
    )
  })

  it('cae al phone cuando whatsapp_link es solo espacios', () => {
    expect(resolveWhatsAppLink('   ', '3001234567')).toBe(
      'https://wa.me/3001234567'
    )
  })

  it('acepta @username y lo normaliza a wa.me', () => {
    expect(resolveWhatsAppLink('@mi_negocio', null)).toBe(
      'https://wa.me/mi_negocio'
    )
  })

  it('acepta username sin @', () => {
    expect(resolveWhatsAppLink('mi_negocio', null)).toBe(
      'https://wa.me/mi_negocio'
    )
  })

  it('usa URL completa de wa.me tal cual', () => {
    expect(resolveWhatsAppLink('https://wa.me/573001234567', null)).toBe(
      'https://wa.me/573001234567'
    )
  })

  it('usa URL completa de whatsapp.com tal cual', () => {
    expect(resolveWhatsAppLink('https://chat.whatsapp.com/abc123', null)).toBe(
      'https://chat.whatsapp.com/abc123'
    )
  })

  it('añade mensaje a URL completa si no lo tiene', () => {
    expect(
      resolveWhatsAppLink('https://wa.me/573001234567', null, 'Hola')
    ).toBe('https://wa.me/573001234567?text=Hola')
  })

  it('no duplica mensaje si la URL ya lo tiene', () => {
    expect(
      resolveWhatsAppLink(
        'https://wa.me/573001234567?text=Ya+hay+mensaje',
        null,
        'Hola'
      )
    ).toBe('https://wa.me/573001234567?text=Ya+hay+mensaje')
  })

  it('añade mensaje a username normalizado', () => {
    expect(resolveWhatsAppLink('@mi_negocio', null, 'Hola')).toBe(
      'https://wa.me/mi_negocio?text=Hola'
    )
  })
})

describe('buildClientReservationMessage', () => {
  const baseOpts = {
    businessName: 'Cancha 5',
    resourceName: 'Cancha 1',
    resourceLabel: 'cancha',
    dateLabel: 'lunes 5 de agosto',
    timeLabel: '15:00',
    clientName: 'Juan Pérez'
  }

  it('incluye nombre del negocio y cliente', () => {
    const msg = buildClientReservationMessage(baseOpts)
    expect(msg).toContain('Hola Cancha 5')
    expect(msg).toContain('Juan Pérez')
  })

  it('usa el label custom capitalizado', () => {
    const msg = buildClientReservationMessage(baseOpts)
    expect(msg).toContain('Cancha: Cancha 1')
  })

  it('usa label neutral por defecto', () => {
    const msg = buildClientReservationMessage({
      ...baseOpts,
      resourceLabel: null,
      resourceName: null
    })
    expect(msg).toContain('Espacio: espacio')
  })

  it('incluye fecha y hora', () => {
    const msg = buildClientReservationMessage(baseOpts)
    expect(msg).toContain('lunes 5 de agosto')
    expect(msg).toContain('15:00')
  })

  it('omite fecha si no se proporciona', () => {
    const msg = buildClientReservationMessage({ ...baseOpts, dateLabel: null })
    expect(msg).not.toContain('Fecha:')
    expect(msg).toContain('Hora: 15:00')
  })
})

describe('buildClientPendingMessage', () => {
  it('menciona que la reserva está pendiente', () => {
    const msg = buildClientPendingMessage({
      businessName: 'TuTurno',
      resourceName: 'Sala A',
      resourceLabel: 'sala',
      dateLabel: 'martes 6 de agosto',
      timeLabel: '10:00',
      clientName: 'María'
    })
    expect(msg).toContain('pendiente')
    expect(msg).toContain('Sala: Sala A')
    expect(msg).toContain('María')
  })
})

describe('buildBusinessContactMessage', () => {
  it('incluye nombre del cliente y contexto de la reserva', () => {
    const msg = buildBusinessContactMessage({
      clientName: 'Carlos',
      resourceName: 'Cancha 2',
      dateLabel: 'viernes 9 de agosto',
      timeLabel: '16:00'
    })
    expect(msg).toContain('Hola Carlos')
    expect(msg).toContain('Cancha 2')
    expect(msg).toContain('viernes 9 de agosto')
    expect(msg).toContain('16:00')
  })

  it('funciona sin resource name', () => {
    const msg = buildBusinessContactMessage({
      clientName: 'Ana',
      dateLabel: 'viernes 9',
      timeLabel: '16:00'
    })
    expect(msg).toContain('Hola Ana')
    expect(msg).toContain('viernes 9')
    expect(msg).toContain('16:00')
  })

  it('funciona solo con nombre del cliente', () => {
    const msg = buildBusinessContactMessage({ clientName: 'Pedro' })
    expect(msg).toContain('Hola Pedro')
    expect(msg).toContain('reserva')
  })
})

describe('buildGeneralInquiryMessage', () => {
  it('incluye nombre del negocio', () => {
    const msg = buildGeneralInquiryMessage('Mi Negocio')
    expect(msg).toContain('Mi Negocio')
    expect(msg).toContain('consulta')
  })
})

describe('DEFAULT_RESOURCE_LABEL', () => {
  it('es "espacio"', () => {
    expect(DEFAULT_RESOURCE_LABEL).toBe('espacio')
  })
})
