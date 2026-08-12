import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { Card } from '@/components/common/card'
import { Button } from '@/components/common/button'
import { Input } from '@/components/common/input'
import { Spinner } from '@/components/common/spinner'
import type { Court } from '@/types'

export function AdminCourtsPage() {
  const [courts, setCourts] = useState<Court[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('courts')
      .select('*')
      .order('sort_order')
    setCourts((data as Court[]) ?? [])
    setLoading(false)
  }, [])

  useEffect(() => {
    load()
  }, [load])

  function startEdit(court: Court) {
    setEditingId(court.id)
    setName(court.name)
    setDescription(court.description ?? '')
    setShowForm(true)
  }

  function startNew() {
    setEditingId(null)
    setName('')
    setDescription('')
    setShowForm(true)
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)

    if (editingId) {
      await supabase
        .from('courts')
        .update({ name: name.trim(), description: description.trim() || null })
        .eq('id', editingId)
    } else {
      const maxOrder = courts.reduce((max, c) => Math.max(max, c.sort_order), 0)
      await supabase
        .from('courts')
        .insert({ name: name.trim(), description: description.trim() || null, sort_order: maxOrder + 1 })
    }

    setSaving(false)
    setShowForm(false)
    await load()
  }

  async function toggleActive(court: Court) {
    await supabase
      .from('courts')
      .update({ is_active: !court.is_active })
      .eq('id', court.id)
    await load()
  }

  if (loading) {
    return <Spinner size="lg" />
  }

  return (
    <div className='flex flex-col gap-4'>
      <div className='flex items-center justify-between'>
        <h1 className='text-2xl font-bold'>Canchas</h1>
        <Button size='sm' onClick={startNew}>
          + Nueva
        </Button>
      </div>

      {showForm && (
        <Card elevated className='p-4'>
          <form onSubmit={handleSave} className='flex flex-col gap-3'>
            <Input
              label='Nombre'
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder='Ej: Cancha 1'
              required
              autoFocus
            />
            <Input
              label='Descripción (opcional)'
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder='Ej: Cancha techada con iluminación'
            />
            <div className='flex gap-2'>
              <Button type='submit' loading={saving} size='sm'>
                {editingId ? 'Guardar' : 'Crear'}
              </Button>
              <Button
                type='button'
                variant='ghost'
                size='sm'
                onClick={() => setShowForm(false)}
              >
                Cancelar
              </Button>
            </div>
          </form>
        </Card>
      )}

      {courts.length === 0 ? (
        <Card className='p-6 text-center text-(--color-text-muted)'>
          No hay canchas. Crea la primera.
        </Card>
      ) : (
        <div className='flex flex-col gap-2'>
          {courts.map((court) => (
            <Card key={court.id} className='p-4'>
              <div className='flex items-center justify-between gap-3'>
                <div className='min-w-0'>
                  <p className='font-medium'>{court.name}</p>
                  {court.description && (
                    <p className='text-sm text-(--color-text-muted)'>
                      {court.description}
                    </p>
                  )}
                  <p className='text-xs mt-1'>
                    <span
                      className={`inline-flex items-center gap-1 ${court.is_active ? 'text-(--color-success)' : 'text-(--color-text-muted)'}`}
                    >
                      <span
                        className={`w-2 h-2 rounded-full ${court.is_active ? 'bg-(--color-success)' : 'bg-graphite-400'}`}
                      />
                      {court.is_active ? 'Activa' : 'Inactiva'}
                    </span>
                  </p>
                </div>
                <div className='flex gap-2 shrink-0'>
                  <Button
                    variant='secondary'
                    size='sm'
                    onClick={() => startEdit(court)}
                  >
                    Editar
                  </Button>
                  <Button
                    variant='ghost'
                    size='sm'
                    onClick={() => toggleActive(court)}
                  >
                    {court.is_active ? 'Desactivar' : 'Activar'}
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
