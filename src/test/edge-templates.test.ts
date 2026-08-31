import { describe, it, expect } from 'vitest'
import {
  createTemplates,
  type TemplatePayload
} from '../../supabase/functions/send-notifications/templates'
import { resolveBusinessWhatsApp } from '../../supabase/functions/send-notifications/whatsapp'

/**
 * Tests de las plantillas de correo de la Edge Function send-notifications.
 *
 * Las plantillas se importan directamente desde templates.ts (archivo
 * compartido entre la Edge Function y los tests — sin imports de Deno).
 */

const APP_URL = 'https://tuturno.online'
const templates = createTemplates(APP_URL)

const validPayload: TemplatePayload = {
  business_name: 'Estudio Centro',
  resource_name: 'Sala principal',
  starts_at: '2025-01-15T15:00:00Z',
  recipient_name: 'Juan Pérez',
  client_name: 'Juan Pérez',
  client_email: 'juan@example.com',
  reason: 'Espacio no disponible',
  business_whatsapp: 'https://wa.me/573001234567'
}

describe('Email templates', () => {
  describe('reservation_created_client', () => {
    it('genera subject con el nombre del negocio', () => {
      const { subject } = templates.reservation_created_client(validPayload)
      expect(subject).toContain('Estudio Centro')
      expect(subject).toContain('Solicitud de reserva recibida')
    })

    it('incluye datos del negocio, espacio y fecha en el html', () => {
      const { html } = templates.reservation_created_client(validPayload)
      expect(html).toContain('Estudio Centro')
      expect(html).toContain('Sala principal')
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

  describe('reservation_created_by_business', () => {
    it('identifica que la reserva fue creada por el negocio', () => {
      const { subject, html } =
        templates.reservation_created_by_business(validPayload)
      expect(subject).toContain('creada por el negocio')
      expect(html).toContain('Reserva creada por el negocio')
      expect(html).toContain('confirmada')
      expect(html).not.toContain('esperando confirmación')
    })

    it('incluye la información del cliente y la reserva', () => {
      const { html } = templates.reservation_created_by_business({
        ...validPayload,
        created_by_name: 'María Gómez'
      })
      expect(html).toContain('Juan Pérez')
      expect(html).toContain('juan@example.com')
      expect(html).toContain('Sala principal')
      expect(html).toContain('Creada por')
      expect(html).toContain('María Gómez')
    })

    it('no muestra un actor cuando el payload no lo incluye', () => {
      const { html } = templates.reservation_created_by_business(validPayload)
      expect(html).not.toContain('María Gómez')
      expect(html).not.toContain('>Creada por<')
    })
  })

  describe('reservation_confirmed', () => {
    it('genera subject de confirmación', () => {
      const { subject } = templates.reservation_confirmed(validPayload)
      expect(subject).toContain('Reserva confirmada')
      expect(subject).toContain('Estudio Centro')
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
      expect(html).toContain('Espacio no disponible')
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
    it('identifica que el cliente canceló su propia reserva', () => {
      const { subject, html } =
        templates.reservation_cancelled_client(validPayload)
      expect(subject).toContain('Cancelaste tu reserva')
      expect(html).toContain('Cancelaste tu reserva')
      expect(html).not.toContain('cancelada por el negocio')
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

  describe('reservation_cancelled_by_business', () => {
    it('identifica correctamente al negocio como quien canceló', () => {
      const { subject, html } =
        templates.reservation_cancelled_by_business(validPayload)
      expect(subject).toContain('El negocio canceló tu reserva')
      expect(html).toContain('El negocio canceló tu reserva')
      expect(html).toContain('el negocio canceló tu reserva')
      expect(html).not.toContain('canceló su reserva')
    })

    it('incluye el motivo de cancelación', () => {
      const { html } = templates.reservation_cancelled_by_business(validPayload)
      expect(html).toContain('Espacio no disponible')
      expect(html).toContain('Motivo')
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

    it('incluye negocio y espacio en los detalles', () => {
      const { html } = templates.reservation_expired(validPayload)
      expect(html).toContain('Estudio Centro')
      expect(html).toContain('Sala principal')
    })

    it('incluye un botón CTA hacia la home', () => {
      const { html } = templates.reservation_expired(validPayload)
      expect(html).toContain(`${APP_URL}/`)
    })
  })

  describe('business_signup_requested', () => {
    it('lleva al operador al panel de plataforma con los datos del negocio', () => {
      const { subject, html } = templates.business_signup_requested({
        ...validPayload,
        desired_slug: 'estudio-centro',
        city: 'Medellín',
        business_type: 'Servicios profesionales'
      })
      expect(subject).toContain('Nueva solicitud de negocio')
      expect(html).toContain('/b/estudio-centro')
      expect(html).toContain('Medellín')
      expect(html).toContain(`${APP_URL}/plataforma`)
    })

    it('escapa HTML en los campos controlados por el solicitante', () => {
      const { html } = templates.business_signup_requested({
        ...validPayload,
        business_name: '<script>alert(1)</script>',
        desired_slug: 'x',
        city: '<b>Bogotá</b>',
        business_type: 'Servicios profesionales',
        contact_phone: '+57 300',
        notes: '<img src=x onerror=alert(1)>'
      })
      expect(html).not.toContain('<script>alert(1)</script>')
      expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;')
      expect(html).not.toContain('<b>Bogotá</b>')
      expect(html).toContain('&lt;b&gt;Bogotá&lt;/b&gt;')
      expect(html).not.toContain('<img src=x onerror=alert(1)>')
      expect(html).toContain('&lt;img src=x onerror=alert(1)&gt;')
    })
  })

  describe('business_approved', () => {
    it('incluye la página pública y el enlace al panel', () => {
      const { subject, html } = templates.business_approved({
        ...validPayload,
        slug: 'estudio-centro'
      })
      expect(subject).toContain('Estudio Centro')
      expect(html).toContain(`${APP_URL}/b/estudio-centro`)
      expect(html).toContain(`${APP_URL}/admin`)
    })
  })

  describe('business_rejected', () => {
    it('muestra el motivo y ofrece enviar otra solicitud', () => {
      const { html } = templates.business_rejected(validPayload)
      expect(html).toContain('Espacio no disponible')
      expect(html).toContain(`${APP_URL}/crear-negocio`)
    })

    it('omite el motivo cuando no se envía', () => {
      const { html } = templates.business_rejected({
        ...validPayload,
        reason: undefined
      })
      expect(html).not.toContain('Motivo')
    })
  })

  describe('todas las plantillas', () => {
    const templateNames = Object.keys(templates)
    const expectedTemplateNames = [
      'reservation_created_client',
      'reservation_confirmed',
      'reservation_rejected',
      'reservation_cancelled_client',
      'reservation_cancelled_by_business',
      'reservation_expired',
      'reservation_created_business',
      'reservation_created_by_business',
      'reservation_cancelled_business',
      'business_signup_requested',
      'business_approved',
      'business_rejected'
    ]

    it('conserva exactamente los 12 templates existentes', () => {
      expect(new Set(templateNames)).toEqual(new Set(expectedTemplateNames))
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
        expect(html).toContain(`${APP_URL}/logo-mark.svg`)
        expect(html).not.toContain('Reservas simples')
        expect(html).not.toContain('Tu tiempo, en orden.')
        expect(html).toContain('#0a5226') // TuTurno name + heading color
      }
    })

    it('cada plantilla incluye un badge superior de notificación', () => {
      for (const name of templateNames) {
        const { html } = templates[name](validPayload)
        // El badge siempre usa el verde TuTurno como base
        expect(html).toContain('background-color:#e7f7ec')
        expect(html).toContain('color:#087333')
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
        // El botón CTA usa background-color:#0a7d3b (pitch-700)
        expect(html).toContain('#0a7d3b')
        expect(html).toContain('target="_blank"')
        expect(html).toMatch(
          /<a href="[^"]+" target="_blank"[^>]*>\s*<img[^>]+src="[^"]*\/email-icons\//
        )
      }
    })

    it('usa una card dividida con iconos para los datos', () => {
      const { html } = templates.reservation_confirmed(validPayload)
      expect(html).toContain('border:1px solid #dfe9e2')
      expect(html).toContain('/email-icons/')
    })

    it('centra los CTA y el contenido del footer', () => {
      const { html } = templates.reservation_confirmed(validPayload)
      expect(html).toContain('align="center" style="padding:8px 12px 28px;"')
      expect(html).toContain('max-width:340px;margin:0 auto')
      expect(html).toContain('text-align:center;max-width:40ch;')
      expect(html).toContain('>Este correo fue enviado')
      expect(html).toContain('>&copy;')
    })

    it('cada plantilla produce un documento HTML parseable', () => {
      for (const name of templateNames) {
        const { html } = templates[name](validPayload)
        const document = new DOMParser().parseFromString(html, 'text/html')
        expect(document.querySelector('parsererror')).toBeNull()
        expect(document.documentElement.lang).toBe('es')
      }
    })

    it('no deja un divisor inferior vacío en la última fila de detalles', () => {
      const { html } = templates.reservation_confirmed(validPayload)
      const document = new DOMParser().parseFromString(html, 'text/html')
      // Buscar filas con 3 celdas (icono + label + value) = filas de detalle
      const detailRows = Array.from(document.querySelectorAll('tr')).filter(
        (row) => row.querySelectorAll('td').length === 3
      )
      const lastRow = detailRows[detailRows.length - 1]
      expect(lastRow).toBeDefined()
      for (const cell of lastRow?.querySelectorAll('td') ?? []) {
        const style = cell.getAttribute('style') ?? ''
        expect(style).not.toContain('border-bottom:1px solid #e8eeea')
      }
    })

    it('los emails de reserva incluyen el encabezado "Detalles de la reserva"', () => {
      const reservationTemplates = [
        'reservation_created_client',
        'reservation_confirmed',
        'reservation_rejected',
        'reservation_cancelled_client',
        'reservation_cancelled_by_business',
        'reservation_expired',
        'reservation_created_business',
        'reservation_created_by_business',
        'reservation_cancelled_business'
      ]
      for (const name of reservationTemplates) {
        const { html } = templates[name](validPayload)
        expect(html).toContain('Detalles de la reserva')
      }
    })

    it('los emails de reserva incluyen un StatusBadge con color por estado', () => {
      const cases: Array<[string, string]> = [
        ['reservation_created_client', '#9a5b00'], // pending
        ['reservation_confirmed', '#087333'], // confirmed
        ['reservation_rejected', '#a52a2a'], // rejected
        ['reservation_cancelled_client', '#5c6a60'], // cancelled
        ['reservation_expired', '#5c6a60'] // expired
      ]
      for (const [name, color] of cases) {
        const { html } = templates[name](validPayload)
        expect(html).toContain(`color:${color}`)
      }
    })

    it('los emails de cliente incluyen el WhatsApp del negocio correcto', () => {
      const { html } = templates.reservation_confirmed(validPayload)
      expect(html).toContain('https://wa.me/573001234567')
      expect(html).toContain('¿Necesitas comunicarte con el negocio?')
      expect(html).toContain('Abrir WhatsApp')
      expect(html).toContain('/email-icons/')
    })

    it('los emails de negocio incluyen el WhatsApp del cliente cuando hay client_whatsapp', () => {
      const { html } = templates.reservation_created_business({
        ...validPayload,
        client_whatsapp: 'https://wa.me/573009998887'
      })
      expect(html).toContain('https://wa.me/573009998887')
      expect(html).toContain('¿Necesitas comunicarte con el cliente?')
      expect(html).toContain('Abrir WhatsApp')
    })

    it('el WhatsApp aparece después del CTA, no dentro del body', () => {
      const { html } = templates.reservation_confirmed(validPayload)
      const ctaPos = html.indexOf('Ver mis reservas')
      const whatsappPos = html.indexOf('Abrir WhatsApp')
      expect(ctaPos).toBeGreaterThan(-1)
      expect(whatsappPos).toBeGreaterThan(-1)
      expect(whatsappPos).toBeGreaterThan(ctaPos)
    })

    it('no muestra WhatsApp cuando el payload no tiene contacto del negocio', () => {
      const { html } = templates.reservation_confirmed({
        ...validPayload,
        business_whatsapp: undefined
      })
      expect(html).not.toContain('Abrir WhatsApp')
    })

    it('resuelve el WhatsApp configurado o el teléfono del negocio', () => {
      expect(
        resolveBusinessWhatsApp(
          'https://wa.me/573001234567',
          '+57 300 999 9999'
        )
      ).toBe('https://wa.me/573001234567')
      expect(resolveBusinessWhatsApp(undefined, '+57 300 999 9999')).toBe(
        'https://wa.me/573009999999'
      )
    })

    it('no contiene lenguaje específico de deportes', () => {
      const sportsPattern = /\b(canchas?|pelotas?|raquetas?|estadios?)\b/i
      for (const name of templateNames) {
        const { html } = templates[name](validPayload)
        expect(html).not.toMatch(sportsPattern)
      }
    })

    it('no inventa horarios de atención', () => {
      for (const name of templateNames) {
        const { html } = templates[name](validPayload)
        expect(html).not.toMatch(/horario de atención|horario comercial/i)
      }
    })

    it('escapa recipient_name en el body para evitar XSS', () => {
      const xssPayload = {
        ...validPayload,
        recipient_name: '<script>alert("xss")</script>'
      }
      for (const name of templateNames) {
        const { html } = templates[name](xssPayload)
        // El nombre del destinatario nunca debe renderizarse como markup crudo
        if (html.includes('recipient_name')) continue
        expect(html).not.toContain('<script>alert("xss")</script>')
      }
    })
  })
})
