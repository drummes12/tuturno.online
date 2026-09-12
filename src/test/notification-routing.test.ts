import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const routingMigration = readFileSync(
  resolve(
    process.cwd(),
    'supabase/migrations/01700_reservation_notification_routing.sql'
  ),
  'utf8'
)
const expirationMigration = readFileSync(
  resolve(
    process.cwd(),
    'supabase/migrations/01600_expired_reservation_notifications.sql'
  ),
  'utf8'
)
const pushRoutingMigration = readFileSync(
  resolve(
    process.cwd(),
    'supabase/migrations/03800_push_reservation_notifications.sql'
  ),
  'utf8'
)
const pushDeepLinkMigration = readFileSync(
  resolve(
    process.cwd(),
    'supabase/migrations/04000_push_notification_deep_links.sql'
  ),
  'utf8'
)

function functionDefinition(sql: string, functionName: string): string {
  const start = sql.indexOf(`create or replace function public.${functionName}`)
  if (start === -1) throw new Error(`Missing function ${functionName}`)

  const next = sql.indexOf(
    'create or replace function public.',
    start + 1
  )
  return sql.slice(start, next === -1 ? sql.length : next)
}

describe('Reservation notification routing', () => {
  it('notifies the client and every owner/manager when a client creates a reservation', () => {
    const definition = functionDefinition(routingMigration, 'create_reservation(')

    expect(definition).toContain("'reservation_created_client'")
    expect(definition).toContain(
      "'reservation_created_business'"
    )
    expect(definition).toContain(
      'enqueue_business_members_notification'
    )
  })

  it('notifies only owners/managers when the business creates a reservation', () => {
    const definition = functionDefinition(
      routingMigration,
      'create_reservation_admin('
    )

    expect(definition).toContain("'reservation_created_by_business'")
    expect(definition).not.toContain("'reservation_confirmed'")
    expect(definition).not.toContain('enqueue_notification(')
  })

  it('limits business recipients to owners and managers', () => {
    const definition = functionDefinition(
      routingMigration,
      'enqueue_business_members_notification('
    )

    expect(definition).toContain("bm.role in ('owner', 'manager')")
    expect(definition).toContain('au.email is not null')
  })

  it('sends confirmation only to the client', () => {
    const definition = functionDefinition(
      readFileSync(
        resolve(process.cwd(), 'supabase/migrations/00600_init_rpc.sql'),
        'utf8'
      ),
      'confirm_reservation('
    )

    expect(definition).toContain("'reservation_confirmed'")
    expect(definition).not.toContain('enqueue_business_members_notification')
  })

  it('distinguishes client cancellation from business cancellation', () => {
    const clientCancellation = functionDefinition(
      routingMigration,
      'cancel_reservation_by_client('
    )
    const businessCancellation = functionDefinition(
      routingMigration,
      'cancel_reservation_by_business('
    )

    expect(clientCancellation).toContain("'reservation_cancelled_client'")
    expect(clientCancellation).toContain("'reservation_cancelled_business'")
    expect(businessCancellation).toContain(
      "'reservation_cancelled_by_business'"
    )
    expect(businessCancellation).not.toContain(
      "'reservation_cancelled_business'"
    )
  })

  it('creates the expiration notification for the client', () => {
    expect(expirationMigration).toContain("'reservation_expired'")
    expect(expirationMigration).toContain('enqueue_notification')
    expect(expirationMigration).toContain("r.status = 'pending'")
  })

  it('encola push en una bandeja independiente con idempotencia', () => {
    expect(pushRoutingMigration).toContain('push_notification_outbox')
    expect(pushRoutingMigration).toContain(
      'idempotency_key text unique not null'
    )
    expect(pushRoutingMigration).toContain(
      'create or replace function public.enqueue_push_notification('
    )
    expect(pushRoutingMigration).toContain(
      'create trigger trg_enqueue_reservation_push_notifications'
    )
    expect(pushDeepLinkMigration).toContain(
      "'/b/' || v_reservation.business_slug || '/mis-reservas?reservation='"
    )
    expect(pushDeepLinkMigration).toContain("'/admin/reservas?reservation='")
  })

  it('cubre los cinco estados de reserva en el trigger push', () => {
    expect(pushRoutingMigration).toContain("'pending'")
    expect(pushRoutingMigration).toContain("'confirmed'")
    expect(pushRoutingMigration).toContain("'rejected'")
    expect(pushRoutingMigration).toContain("'cancelled_by_client'")
    expect(pushRoutingMigration).toContain("'cancelled_by_business'")
    expect(pushRoutingMigration).toContain("'expired'")
  })

  it('mantiene la configuración de correo separada', () => {
    expect(pushRoutingMigration).not.toContain('public.notification_outbox')
  })

  it('respeta la bandera email_notifications_enabled de business_members', () => {
    const optOutMigration = readFileSync(
      resolve(
        process.cwd(),
        'supabase/migrations/03400_member_email_opt_out.sql'
      ),
      'utf8'
    )

    expect(optOutMigration).toContain(
      'email_notifications_enabled boolean not null default true'
    )
    const definition = functionDefinition(
      optOutMigration,
      'enqueue_business_members_notification('
    )
    expect(definition).toContain('bm.email_notifications_enabled = true')
  })
})
