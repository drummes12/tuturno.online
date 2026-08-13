import { describe, it, expect } from 'vitest'

/**
 * Tests de las plantillas de correo de la Edge Function send-notifications.
 *
 * Las plantillas son funciones puras que generan { subject, html } a partir
 * de un payload. Las extraemos aquí para testear sin necesidad de Deno.
 *
 * La Edge Function completa requiere Deno + Resend API, pero las plantillas
 * son la lógica de negocio que más vale la pena testear.
 */

// Duplicamos las plantillas aquí porque la Edge Function usa Deno imports
// que no se pueden importar desde Vitest (jsdom/node).
// Si las plantillas cambian en index.ts, hay que actualizar aquí también.
// TODO: extraer las plantillas a un archivo compartido importable.

interface TemplatePayload {
  business_name?: string
  court_name?: string
  starts_at?: string
  recipient_name?: string | null
  client_name?: string
  client_email?: string
  reason?: string
}

const templates: Record<
  string,
  (p: TemplatePayload) => { subject: string; html: string }
> = {
  reservation_created_client: (p) => ({
    subject: `Solicitud de reserva recibida — ${p.business_name}`,
    html: `
      <h2>Solicitud recibida</h2>
      <p>Hola ${p.recipient_name ?? ''},</p>
      <p>Tu solicitud de reserva está <strong>pendiente de confirmación</strong>.</p>
      <ul>
        <li><strong>Negocio:</strong> ${p.business_name}</li>
        <li><strong>Cancha:</strong> ${p.court_name}</li>
        <li><strong>Fecha y hora:</strong> ${new Date(p.starts_at as string).toLocaleString('es-CO', { timeZone: 'America/Bogota' })}</li>
      </ul>
      <p>Te avisaremos cuando el negocio confirme o rechace tu solicitud.</p>
    `
  }),
  reservation_created_business: (p) => ({
    subject: `Nueva solicitud de reserva — ${p.client_name}`,
    html: `
      <h2>Nueva solicitud de reserva</h2>
      <ul>
        <li><strong>Cliente:</strong> ${p.client_name}</li>
        <li><strong>Email:</strong> ${p.client_email}</li>
        <li><strong>Cancha:</strong> ${p.court_name}</li>
        <li><strong>Fecha y hora:</strong> ${new Date(p.starts_at as string).toLocaleString('es-CO', { timeZone: 'America/Bogota' })}</li>
      </ul>
      <p>Entra al panel para confirmar o rechazar.</p>
    `
  }),
  reservation_confirmed: (p) => ({
    subject: `Reserva confirmada — ${p.business_name}`,
    html: `
      <h2>¡Reserva confirmada!</h2>
      <p>Hola ${p.recipient_name ?? ''}, tu reserva fue confirmada.</p>
      <ul>
        <li><strong>Negocio:</strong> ${p.business_name}</li>
        <li><strong>Cancha:</strong> ${p.court_name}</li>
        <li><strong>Fecha y hora:</strong> ${new Date(p.starts_at as string).toLocaleString('es-CO', { timeZone: 'America/Bogota' })}</li>
      </ul>
    `
  }),
  reservation_rejected: (p) => ({
    subject: `Reserva rechazada — ${p.business_name}`,
    html: `
      <h2>Reserva rechazada</h2>
      <p>Hola ${p.recipient_name ?? ''}, tu solicitud fue rechazada.</p>
      <ul>
        <li><strong>Negocio:</strong> ${p.business_name}</li>
        <li><strong>Cancha:</strong> ${p.court_name}</li>
        <li><strong>Fecha y hora:</strong> ${new Date(p.starts_at as string).toLocaleString('es-CO', { timeZone: 'America/Bogota' })}</li>
        ${p.reason ? `<li><strong>Motivo:</strong> ${p.reason}</li>` : ''}
      </ul>
      <p>Puedes solicitar otro turno desde la app.</p>
    `
  }),
  reservation_cancelled_client: (p) => ({
    subject: `Reserva cancelada — ${p.business_name}`,
    html: `
      <h2>Reserva cancelada</h2>
      <p>Tu reserva fue cancelada.</p>
      <ul>
        <li><strong>Negocio:</strong> ${p.business_name}</li>
        <li><strong>Cancha:</strong> ${p.court_name}</li>
        <li><strong>Fecha y hora:</strong> ${new Date(p.starts_at as string).toLocaleString('es-CO', { timeZone: 'America/Bogota' })}</li>
      </ul>
    `
  }),
  reservation_cancelled_business: (p) => ({
    subject: `Reserva cancelada por el cliente — ${p.client_name}`,
    html: `
      <h2>Reserva cancelada por el cliente</h2>
      <ul>
        <li><strong>Cliente:</strong> ${p.client_name}</li>
        <li><strong>Cancha:</strong> ${p.court_name}</li>
        <li><strong>Fecha y hora:</strong> ${new Date(p.starts_at as string).toLocaleString('es-CO', { timeZone: 'America/Bogota' })}</li>
      </ul>
    `
  }),
  reservation_expired: (p) => ({
    subject: `Solicitud expirada — ${p.business_name}`,
    html: `
      <h2>Solicitud expirada</h2>
      <p>Tu solicitud expiró porque el negocio no la confirmó a tiempo.</p>
      <ul>
        <li><strong>Cancha:</strong> ${p.court_name}</li>
        <li><strong>Fecha y hora:</strong> ${new Date(p.starts_at as string).toLocaleString('es-CO', { timeZone: 'America/Bogota' })}</li>
      </ul>
    `
  })
}

const validPayload: TemplatePayload = {
  business_name: 'Canchas El Parque',
  court_name: 'Cancha 1',
  starts_at: '2025-01-15T15:00:00Z',
  recipient_name: 'Juan Pérez',
  client_name: 'Juan Pérez',
  client_email: 'juan@example.com',
  reason: 'Cancha en mantenimiento',
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
        recipient_name: null,
      })
      expect(html).toContain('Hola ,') // string vacío
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
        reason: undefined,
      })
      expect(html).not.toContain('Motivo')
    })

    it('omite el motivo cuando es string vacío', () => {
      const { html } = templates.reservation_rejected({
        ...validPayload,
        reason: '',
      })
      expect(html).not.toContain('Motivo')
    })
  })

  describe('reservation_cancelled_client', () => {
    it('genera subject de cancelación', () => {
      const { subject } = templates.reservation_cancelled_client(validPayload)
      expect(subject).toContain('cancelada')
    })
  })

  describe('reservation_cancelled_business', () => {
    it('genera subject con el nombre del cliente', () => {
      const { subject } = templates.reservation_cancelled_business(validPayload)
      expect(subject).toContain('cancelada por el cliente')
      expect(subject).toContain('Juan Pérez')
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

    it('no incluye business_name en el html (solo cancha)', () => {
      const { html } = templates.reservation_expired(validPayload)
      expect(html).toContain('Cancha 1')
      // El template de expired no lista el negocio
      expect(html).not.toContain('Negocio')
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
  })
})
