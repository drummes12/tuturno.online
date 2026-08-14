import { useState, useEffect, useCallback } from 'react'
import {
  fetchAllCourts,
  createCourt,
  updateCourt,
  toggleCourtActive
} from '@/services/courts'
import { Card } from '@/components/common/card'
import { Button } from '@/components/common/button'
import { Input } from '@/components/common/input'
import { Alert } from '@/components/common/alert'
import { Spinner } from '@/components/common/spinner'
import { ReadOnlyNotice } from '@/components/common/read-only-notice'
import { useCanEdit } from '@/hooks/use-can-edit'
import {
  CourtIcon,
  PlusIcon,
  CheckIcon,
  XIcon,
  EditIcon
} from '@/components/common/icon'
import type { Court } from '@/types'

export function AdminCourtsPage() {
  const canEdit = useCanEdit()
  const [courts, setCourts] = useState<Court[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingCourt, setEditingCourt] = useState<Court | null>(null)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await fetchAllCourts()
      setCourts(data)
    } catch {
      setError('Error al cargar las canchas.')
      setCourts([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  function startEdit(court: Court) {
    setEditingCourt(court)
    setName(court.name)
    setDescription(court.description ?? '')
    setShowForm(true)
    // Remover la cancha de la lista mientras se edita
    setCourts((prev) => prev.filter((c) => c.id !== court.id))
  }

  function startNew() {
    setEditingCourt(null)
    setName('')
    setDescription('')
    setShowForm(true)
  }

  function cancelEdit() {
    // Restaurar la cancha a la lista si se estaba editando
    if (editingCourt) {
      setCourts((prev) => {
        // Insertar en la posición original según sort_order
        const updated = [...prev, editingCourt]
        return updated.sort((a, b) => a.sort_order - b.sort_order)
      })
    }
    setShowForm(false)
    setEditingCourt(null)
    setName('')
    setDescription('')
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) {
      setError('El nombre es obligatorio.')
      return
    }
    setSaving(true)
    setError(null)

    try {
      if (editingCourt) {
        await updateCourt(
          editingCourt.id,
          name.trim(),
          description.trim() || null
        )
      } else {
        const maxOrder = courts.reduce(
          (max, c) => Math.max(max, c.sort_order),
          0
        )
        await createCourt(name.trim(), description.trim() || null, maxOrder + 1)
      }
    } catch (err) {
      setSaving(false)
      setError('Error al guardar: ' + (err as Error).message)
      return
    }
    setSaving(false)

    setShowForm(false)
    setEditingCourt(null)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
    await load()
  }

  async function toggleActive(court: Court) {
    try {
      await toggleCourtActive(court.id, court.is_active)
    } catch (err) {
      setError('Error al cambiar el estado: ' + (err as Error).message)
      return
    }
    await load()
  }

  if (loading) {
    return <Spinner size='lg' />
  }

  return (
    <div className='flex flex-col gap-5 max-w-2xl mx-auto'>
      {/* Header */}
      <div className='flex items-center justify-between animate-fade-up'>
        <div>
          <h1 className='text-2xl font-bold tracking-tight'>Canchas</h1>
          <p className='text-sm text-(--color-text-muted) mt-0.5'>
            {courts.length} {courts.length === 1 ? 'cancha' : 'canchas'}{' '}
            configuradas
          </p>
        </div>
        {!showForm && canEdit && (
          <Button size='sm' onClick={startNew}>
            <PlusIcon size={16} />
            <span className='hidden sm:inline'>Nueva cancha</span>
            <span className='sm:hidden'>Nueva</span>
          </Button>
        )}
      </div>

      {!canEdit && <ReadOnlyNotice />}

      {error && (
        <Alert variant='error' onDismiss={() => setError(null)}>
          {error}
        </Alert>
      )}
      {saved && (
        <Alert variant='success'>Cambios guardados correctamente.</Alert>
      )}

      {/* Formulario de creación/edición */}
      {showForm && (
        <Card elevated className='p-5 animate-fade-up'>
          <div className='flex items-center gap-2 mb-4'>
            <div className='flex items-center justify-center w-8 h-8 rounded-lg bg-pitch-100 text-pitch-700'>
              {editingCourt ? <EditIcon size={16} /> : <PlusIcon size={16} />}
            </div>
            <h2 className='font-semibold text-sm tracking-tight'>
              {editingCourt
                ? `Editando "${editingCourt.name}"`
                : 'Nueva cancha'}
            </h2>
          </div>
          <form onSubmit={handleSave} className='flex flex-col gap-4'>
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
              hint='Ayuda a los clientes a identificar la cancha.'
            />
            <div className='flex gap-2'>
              <Button type='submit' loading={saving} size='sm'>
                <CheckIcon size={16} />
                {editingCourt ? 'Guardar cambios' : 'Crear cancha'}
              </Button>
              <Button
                type='button'
                variant='ghost'
                size='sm'
                onClick={cancelEdit}
              >
                <XIcon size={16} />
                Cancelar
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* Lista de canchas */}
      {courts.length === 0 && !showForm ? (
        <Card className='p-8 text-center animate-fade-up'>
          <div className='flex flex-col items-center gap-3'>
            <div className='w-12 h-12 rounded-2xl bg-surface-inset flex items-center justify-center text-text-muted'>
              <CourtIcon size={24} />
            </div>
            <div>
              <p className='font-medium text-sm'>No hay canchas</p>
              <p className='text-xs text-text-muted mt-0.5'>
                Crea la primera cancha para empezar a recibir reservas.
              </p>
            </div>
            {canEdit && (
              <Button size='sm' onClick={startNew}>
                <PlusIcon size={16} />
                Crear cancha
              </Button>
            )}
          </div>
        </Card>
      ) : (
        <div className='flex flex-col gap-2.5'>
          {courts.map((court, index) => (
            <Card
              key={court.id}
              className={`p-4 animate-stagger ${!court.is_active ? 'opacity-60' : ''}`}
              style={{ '--index': index } as React.CSSProperties}
            >
              <div className='flex items-center justify-between gap-3'>
                <div className='min-w-0 flex-1'>
                  <div className='flex items-center gap-2'>
                    <div
                      className={`flex items-center justify-center w-9 h-9 rounded-lg shrink-0 ${
                        court.is_active
                          ? 'bg-pitch-100 text-pitch-700'
                          : 'bg-surface-inset text-text-muted'
                      }`}
                    >
                      <CourtIcon size={18} />
                    </div>
                    <div className='min-w-0'>
                      <p className='font-medium text-sm truncate'>
                        {court.name}
                      </p>
                      {court.description && (
                        <p className='text-xs text-(--color-text-muted) truncate mt-0.5'>
                          {court.description}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
                <div className='flex items-center gap-2 shrink-0'>
                  {/* Toggle de estado */}
                  {canEdit && (
                    <button
                      onClick={() => toggleActive(court)}
                      className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ${
                        court.is_active ? 'bg-primary' : 'bg-graphite-300'
                      }`}
                      aria-label={`${court.is_active ? 'Desactivar' : 'Activar'} ${court.name}`}
                      aria-pressed={court.is_active}
                    >
                      <span
                        className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform duration-200 ease-spring ${
                          court.is_active ? 'translate-x-5' : ''
                        }`}
                      />
                    </button>
                  )}
                  {canEdit && (
                    <Button
                      variant='secondary'
                      size='sm'
                      onClick={() => startEdit(court)}
                    >
                      <EditIcon size={14} />
                      <span className='hidden sm:inline'>Editar</span>
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
