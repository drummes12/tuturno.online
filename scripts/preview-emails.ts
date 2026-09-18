// Genera previews locales de las plantillas de correo.
//
//   pnpm emails:preview
//
// Escribe un .html por plantilla en shots-tmp/emails/ (carpeta ignorada
// por git) y los abre en el navegador si se pasa --open.
//
// Corre con `node --experimental-strip-types` (Node >= 22): las
// plantillas son TS puro, no necesitan Deno ni bundler.

import { mkdirSync, writeFileSync } from 'node:fs'
import { execSync } from 'node:child_process'
import { resolve } from 'node:path'
import { createTemplates } from '../supabase/functions/send-notifications/templates.ts'

const APP_URL = process.env.APP_URL ?? 'https://tuturno.online'
const OUT_DIR = resolve('shots-tmp/emails')

// Payload de muestra — cubre todos los campos que usan las plantillas.
const payload = {
  business_name: 'Canchas FC',
  business_slug: 'canchas-fc',
  desired_slug: 'canchas-fc',
  slug: 'canchas-fc',
  resource_name: 'Cancha 1 · Sintética',
  reservation_id: 'r1',
  reservation_number: 12,
  starts_at: '2025-12-20T23:00:00Z', // 18:00 Bogotá
  ends_at: '2025-12-21T00:00:00Z', //   19:00 Bogotá
  recipient_name: 'Dani',
  client_name: 'Dani Rojas',
  client_email: 'dani@correo.com',
  reason: 'Espacio no disponible en ese horario',
  city: 'Bogotá',
  business_type: 'Cancha de fútbol',
  contact_phone: '+57 300 123 4567',
  notes: 'Quiero reservar los viernes por la noche',
  created_by_name: 'Laura (recepción)',
  business_whatsapp: '573001234567',
  client_whatsapp: '573009876543'
}

const templates = createTemplates(APP_URL)
mkdirSync(OUT_DIR, { recursive: true })

const files: string[] = []
for (const [name, fn] of Object.entries(templates)) {
  const { subject, html } = fn(payload)
  const file = resolve(OUT_DIR, `${name}.html`)
  writeFileSync(file, `<!-- ${subject} -->\n${html}`)
  files.push(file)
  console.log(`✓ ${name}  →  ${file}`)
}

console.log(`\n${files.length} plantillas en ${OUT_DIR}`)

if (process.argv.includes('--open')) {
  for (const file of files) {
    execSync(`open "${file}"`)
  }
}
