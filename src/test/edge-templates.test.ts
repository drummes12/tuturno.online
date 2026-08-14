import { describe, it, expect } from 'vitest'
import {
  createTemplates,
  type TemplatePayload
} from '../../supabase/functions/send-notifications/templates'

/**
 * Tests de las plantillas de correo de la Edge Function send-notifications.
 *
 * Las plantillas se importan directamente desde templates.ts (archivo
 * compartido entre la Edge Function y los tests — sin imports de Deno).
 */

const APP_URL = 'https://tuturno.online'
const templates = createTemplates(APP_URL)

const validPayload: TemplatePayload = {
  business_name: 'Canchas El Parque',
  court_name: 'Cancha 1',
  starts_at: '2025-01-15T15:00:00Z',
  recipient_name: 'Juan Pérez',
  client_name: 'Juan Pérez',
  client_email: 'juan@example.com',
  reason: 'Cancha en mantenimiento'
}

describe('Email templates', () => {
  describe('reservation_created_client', () => {
    it('genera subject con el nombre del negocio', () => {
      const { subject } = templates.reservation_created_client(validPayload)
      expect(subject).toContain('Canchas El Parque')
      expect(subject).toContain('Solicitud de reserva recibida')
    })

    it('incluye datos del negocio, cancha y fecha en el html', () => {
      const { html } = templates.reservation_created_client(validPayload)
      expect(html).toContain('Canchas El Parque')
      expect(html).toContain('Cancha 1')
      expect(html).toContain('pendiente de confirmación')
    })

    it('incluye el nombre del destinatario', () => {
      const { html } = templates.reservation_created_client(validPayload)
      expect(html).toContain('Juan Pérez')
    })

    it('maneja recipient_name null sin crashear', () => {
      const { html } = templates.reservation_created_client({
        ...validPayload,
        recipient_name: null
      })
      // El template renderiza un <strong> vacío
      expect(html).toContain('Hola <strong></strong>')
    })

    it('incluye un botón CTA hacia /mis-reservas', () => {
      const { html } = templates.reservation_created_client(validPayload)
      expect(html).toContain(`${APP_URL}/mis-reservas`)
      expect(html).toContain('Ver mis reservas')
    })
  })

  describe('reservation_created_business', () => {
    it('genera subject con el nombre del cliente', () => {
      const { subject } = templates.reservation_created_business(validPayload)
      expect(subject).toContain('Juan Pérez')
      expect(subject).toContain('Nueva solicitud de reserva')
    })

    it('incluye email del cliente en el html', () => {
      const { html } = templates.reservation_created_business(validPayload)
      expect(html).toContain('juan@example.com')
    })

    it('incluye un botón CTA hacia /admin/reservas', () => {
      const { html } = templates.reservation_created_business(validPayload)
      expect(html).toContain(`${APP_URL}/admin/reservas`)
      expect(html).toContain('Confirmar o rechazar')
    })
  })

  describe('reservation_confirmed', () => {
    it('genera subject de confirmación', () => {
      const { subject } = templates.reservation_confirmed(validPayload)
      expect(subject).toContain('Reserva confirmada')
      expect(subject).toContain('Canchas El Parque')
    })

    it('incluye mensaje de confirmación en html', () => {
      const { html } = templates.reservation_confirmed(validPayload)
      expect(html).toContain('confirmada')
    })

    it('incluye un botón CTA hacia /mis-reservas', () => {
      const { html } = templates.reservation_confirmed(validPayload)
      expect(html).toContain(`${APP_URL}/mis-reservas`)
    })
  })

  describe('reservation_rejected', () => {
    it('genera subject de rechazo', () => {
      const { subject } = templates.reservation_rejected(validPayload)
      expect(subject).toContain('rechazada')
    })

    it('incluye el motivo cuando se proporciona', () => {
      const { html } = templates.reservation_rejected(validPayload)
      expect(html).toContain('Cancha en mantenimiento')
      expect(html).toContain('Motivo')
    })

    it('omite el motivo cuando no se proporciona', () => {
      const { html } = templates.reservation_rejected({
        ...validPayload,
        reason: undefined
      })
      expect(html).not.toContain('Motivo')
    })

    it('omite el motivo cuando es string vacío', () => {
      const { html } = templates.reservation_rejected({
        ...validPayload,
        reason: ''
      })
      expect(html).not.toContain('Motivo')
    })

    it('incluye un botón CTA hacia la home', () => {
      const { html } = templates.reservation_rejected(validPayload)
      expect(html).toContain(`${APP_URL}/`)
      expect(html).toContain('Buscar otro turno')
    })
  })

  describe('reservation_cancelled_client', () => {
    it('genera subject de cancelación', () => {
      const { subject } = templates.reservation_cancelled_client(validPayload)
      expect(subject).toContain('cancelada')
    })

    it('incluye un botón CTA hacia la home', () => {
      const { html } = templates.reservation_cancelled_client(validPayload)
      expect(html).toContain(`${APP_URL}/`)
    })
  })

  describe('reservation_cancelled_business', () => {
    it('genera subject con el nombre del cliente', () => {
      const { subject } = templates.reservation_cancelled_business(validPayload)
      expect(subject).toContain('cancelada por el cliente')
      expect(subject).toContain('Juan Pérez')
    })

    it('incluye un botón CTA hacia /admin/reservas', () => {
      const { html } = templates.reservation_cancelled_business(validPayload)
      expect(html).toContain(`${APP_URL}/admin/reservas`)
    })
  })

  describe('reservation_expired', () => {
    it('genera subject de expiración', () => {
      const { subject } = templates.reservation_expired(validPayload)
      expect(subject).toContain('expirada')
    })

    it('incluye mensaje de que el negocio no confirmó', () => {
      const { html } = templates.reservation_expired(validPayload)
      expect(html).toContain('no la confirmó a tiempo')
    })

    it('no incluye business_name en los detalles (solo cancha)', () => {
      const { html } = templates.reservation_expired(validPayload)
      expect(html).toContain('Cancha 1')
      // El template de expired no lista el negocio en los detalles
      expect(html).not.toContain('>Negocio<')
    })

    it('incluye un botón CTA hacia la home', () => {
      const { html } = templates.reservation_expired(validPayload)
      expect(html).toContain(`${APP_URL}/`)
    })
  })

  describe('todas las plantillas', () => {
    const templateNames = Object.keys(templates)

    it('hay 7 plantillas definidas', () => {
      expect(templateNames).toHaveLength(7)
    })

    it('cada plantilla retorna { subject, html }', () => {
      for (const name of templateNames) {
        const result = templates[name](validPayload)
        expect(result).toHaveProperty('subject')
        expect(result).toHaveProperty('html')
        expect(typeof result.subject).toBe('string')
        expect(typeof result.html).toBe('string')
        expect(result.subject.length).toBeGreaterThan(0)
        expect(result.html.length).toBeGreaterThan(0)
      }
    })

    it('cada plantilla formatea la fecha en zona horaria America/Bogota', () => {
      // 2025-01-15T15:00:00Z = 2025-01-15 10:00 Bogotá
      for (const name of templateNames) {
        const { html } = templates[name](validPayload)
        // La fecha formateada debe contener "10:00" o "10:"
        // (formato locale es-CO puede variar pero la hora debe ser 10)
        if (html.includes('Fecha y hora')) {
          expect(html).toMatch(/10:00|10:/)
        }
      }
    })

    it('cada plantilla incluye el header branded de TuTurno', () => {
      for (const name of templateNames) {
        const { html } = templates[name](validPayload)
        expect(html).toContain('TuTurno')
        expect(html).toContain('#0a5226') // pitch-800 header
      }
    })

    it('cada plantilla incluye un enlace al footer con tuturno.online', () => {
      for (const name of templateNames) {
        const { html } = templates[name](validPayload)
        expect(html).toContain(APP_URL)
        expect(html).toContain('tuturno.online')
      }
    })

    it('ninguna plantilla contiene localhost', () => {
      for (const name of templateNames) {
        const { html } = templates[name](validPayload)
        expect(html).not.toContain('localhost')
        expect(html).not.toContain('127.0.0.1')
      }
    })

    it('cada plantilla incluye al menos un botón CTA', () => {
      for (const name of templateNames) {
        const { html } = templates[name](validPayload)
        // El botón CTA usa bgcolor="#0a7d3b" (pitch-700)
        expect(html).toContain('#0a7d3b')
        expect(html).toContain('target="_blank"')
      }
    })
  })
})
