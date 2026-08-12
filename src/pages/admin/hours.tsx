import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { Card } from '@/components/common/card'
import { Button } from '@/components/common/button'
import { Spinner } from '@/components/common/spinner'
import type { BusinessHours } from '@/types'

const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']

export function AdminHoursPage() {
  const [hours, setHours] = useState<BusinessHours[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('business_hours')
      .select('*')
      .order('day_of_week')
    setHours((data as BusinessHours[]) ?? [])
    setLoading(false)
  }, [])

  useEffect(() => {
    load()
  }, [load])

  // Build a map: day_of_week -> BusinessHours
  const hoursByDay = new Map<number, BusinessHours>()
  hours.forEach((h) => hoursByDay.set(h.day_of_week, h))

  function updateDay(day: number, field: 'open_time' | 'close_time', value: string) {
    const existing = hoursByDay.get(day)
    if (existing) {
      setHours((prev) =>
        prev.map((h) => (h.day_of_week === day ? { ...h, [field]: value } : h)),
      )
    } else {
      // Create new entry locally
      const newEntry: BusinessHours = {
        id: '',
        business_id: '',
        day_of_week: day,
        open_time: field === 'open_time' ? value : '08:00',
        close_time: field === 'close_time' ? value : '22:00',
        is_active: true,
      }
      setHours((prev) => [...prev, newEntry])
      hoursByDay.set(day, newEntry)
    }
  }

  function toggleDay(day: number) {
    const existing = hoursByDay.get(day)
    if (existing) {
      setHours((prev) =>
        prev.map((h) => (h.day_of_week === day ? { ...h, is_active: !h.is_active } : h)),
      )
    }
  }

  async function handleSave() {
    setSaving(true)
    for (const h of hours) {
      if (h.id) {
        await supabase
          .from('business_hours')
          .update({ open_time: h.open_time, close_time: h.close_time, is_active: h.is_active })
          .eq('id', h.id)
      } else {
        await supabase
          .from('business_hours')
          .insert({
            day_of_week: h.day_of_week,
            open_time: h.open_time,
            close_time: h.close_time,
            is_active: h.is_active,
          })
      }
    }
    setSaving(false)
    await load()
  }

  if (loading) {
    return <Spinner size="lg" />
  }

  return (
    <div className='flex flex-col gap-4'>
      <h1 className='text-2xl font-bold'>Horarios</h1>
      <p className='text-sm text-(--color-text-muted)'>
        Define el horario semanal de operación. Los turnos se generan en bloques
        de 60 minutos.
      </p>

      <Card className='p-4'>
        <div className='flex flex-col gap-3'>
          {days.map((dayName, dayIdx) => {
            const h = hoursByDay.get(dayIdx)
            const isActive = h?.is_active ?? false
            return (
              <div
                key={dayIdx}
                className={`flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 py-2 border-b border-border last:border-0`}
              >
                <div className='flex items-center gap-2 sm:w-32 shrink-0'>
                  <input
                    type='checkbox'
                    checked={isActive}
                    onChange={() => toggleDay(dayIdx)}
                    className='w-4 h-4 accent-(--color-primary)'
                    aria-label={`${dayName} abierto`}
                  />
                  <span
                    className={`text-sm font-medium ${isActive ? '' : 'text-(--color-text-muted)'}`}
                  >
                    {dayName}
                  </span>
                </div>
                {isActive && (
                  <div className='flex items-center gap-2'>
                    <input
                      type='time'
                      value={h?.open_time ?? '08:00'}
                      onChange={(e) =>
                        updateDay(dayIdx, 'open_time', e.target.value)
                      }
                      className='rounded-md border border-border bg-surface-inset px-3 py-2 text-sm touch-target'
                    />
                    <span className='text-(--color-text-muted)'>—</span>
                    <input
                      type='time'
                      value={h?.close_time ?? '22:00'}
                      onChange={(e) =>
                        updateDay(dayIdx, 'close_time', e.target.value)
                      }
                      className='rounded-md border border-border bg-surface-inset px-3 py-2 text-sm touch-target'
                    />
                  </div>
                )}
                {!isActive && (
                  <span className='text-sm text-(--color-text-muted)'>
                    Cerrado
                  </span>
                )}
              </div>
            )
          })}
        </div>
      </Card>

      <Button loading={saving} onClick={handleSave}>
        Guardar horarios
      </Button>
    </div>
  )
}
