import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Card } from '@/components/common/card'
import { Button } from '@/components/common/button'
import { Input } from '@/components/common/input'
import { Spinner } from '@/components/common/spinner'
import type { Business } from '@/types'

export function AdminConfigPage() {
  const [business, setBusiness] = useState<Business | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('businesses')
        .select('*')
        .limit(1)
        .maybeSingle()
      setBusiness(data as Business | null)
      setLoading(false)
    }
    load()
  }, [])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!business) return
    setSaving(true)
    setSaved(false)

    await supabase
      .from('businesses')
      .update({
        name: business.name,
        address: business.address,
        phone: business.phone,
        hold_duration_minutes: business.hold_duration_minutes,
        cancellation_limit_hours: business.cancellation_limit_hours,
        max_advance_days: business.max_advance_days,
      })
      .eq('id', business.id)

    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  if (loading) {
    return <Spinner size="lg" />
  }

  if (!business) {
    return (
      <Card className='p-6 text-center text-(--color-text-muted)'>
        No se encontró la configuración del negocio.
      </Card>
    )
  }

  return (
    <div className='flex flex-col gap-4 max-w-md'>
      <h1 className='text-2xl font-bold'>Configuración</h1>

      <Card className='p-4'>
        <form onSubmit={handleSave} className='flex flex-col gap-4'>
          <h2 className='font-semibold text-sm uppercase tracking-wide text-(--color-text-muted)'>
            Datos del negocio
          </h2>
          <Input
            label='Nombre'
            value={business.name}
            onChange={(e) => setBusiness({ ...business, name: e.target.value })}
            required
          />
          <Input
            label='Dirección'
            value={business.address ?? ''}
            onChange={(e) =>
              setBusiness({ ...business, address: e.target.value })
            }
          />
          <Input
            label='Teléfono'
            value={business.phone ?? ''}
            onChange={(e) =>
              setBusiness({ ...business, phone: e.target.value })
            }
          />

          <h2 className='font-semibold text-sm uppercase tracking-wide text-(--color-text-muted) pt-2'>
            Reglas de operación
          </h2>
          <Input
            label='Duración del bloqueo temporal (minutos)'
            type='number'
            value={String(business.hold_duration_minutes)}
            onChange={(e) =>
              setBusiness({
                ...business,
                hold_duration_minutes: parseInt(e.target.value) || 30
              })
            }
            hint='Tiempo que un turno queda retenido mientras el negocio decide.'
          />
          <Input
            label='Límite de cancelación (horas antes)'
            type='number'
            value={String(business.cancellation_limit_hours)}
            onChange={(e) =>
              setBusiness({
                ...business,
                cancellation_limit_hours: parseInt(e.target.value) || 2
              })
            }
            hint='El cliente puede cancelar hasta X horas antes del turno.'
          />
          <Input
            label='Anticipación máxima (días)'
            type='number'
            value={String(business.max_advance_days)}
            onChange={(e) =>
              setBusiness({
                ...business,
                max_advance_days: parseInt(e.target.value) || 30
              })
            }
            hint='Hasta cuántos días en adelante se puede reservar.'
          />

          {saved && (
            <p className='text-sm text-(--color-success) bg-pitch-100 border border-pitch-300 rounded-lg px-3 py-2'>
              ✓ Configuración guardada
            </p>
          )}

          <Button type='submit' loading={saving}>
            Guardar cambios
          </Button>
        </form>
      </Card>

      <Card className='p-4'>
        <div className='text-sm flex flex-col gap-1'>
          <p>
            <span className='text-(--color-text-muted)'>Zona horaria:</span>{' '}
            {business.timezone}
          </p>
          <p>
            <span className='text-(--color-text-muted)'>
              Duración de turnos:
            </span>{' '}
            {business.slot_duration_minutes} min
          </p>
        </div>
      </Card>
    </div>
  )
}
