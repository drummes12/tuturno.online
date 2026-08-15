import { useState, useEffect, useCallback } from 'react'
import {
  fetchAllResources,
  createResource,
  updateResource,
  toggleResourceActive
} from '@/services/resources'
import { fetchBusinessById } from '@/services/business'
import { useBusinessId } from '@/hooks/use-business-id'
import { Card } from '@/components/common/card'
import { Button } from '@/components/common/button'
import { Input } from '@/components/common/input'
import { Alert } from '@/components/common/alert'
import { Spinner } from '@/components/common/spinner'
import { ReadOnlyNotice } from '@/components/common/read-only-notice'
import { useCanEdit } from '@/hooks/use-can-edit'
import {
  StoreIcon,
  PlusIcon,
  CheckIcon,
  XIcon,
  EditIcon
} from '@/components/common/icon'
import type { Resource } from '@/types'

export function AdminResourcesPage() {
  const canEdit = useCanEdit()
  const businessId = useBusinessId()
  const [resources, setResources] = useState<Resource[]>([])
  const [label, setLabel] = useState('recursos')
  const [singularLabel, setSingularLabel] = useState('recurso')
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingResource, setEditingResource] = useState<Resource | null>(null)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  const load = useCallback(async () => {
    if (!businessId) return
    setLoading(true)
    try {
      const [data, business] = await Promise.all([
        fetchAllResources(businessId),
        fetchBusinessById(businessId)
      ])
      setResources(data)
      setLabel((business?.resource_label_plural || 'Recursos').toLowerCase())
      setSingularLabel(
        (business?.resource_label_singular || 'Recurso').toLowerCase()
      )
    } catch {
      setError('Error al cargar los recursos.')
      setResources([])
    } finally {
      setLoading(false)
    }
  }, [businessId])

  useEffect(() => {
    load()
  }, [load])

  function startEdit(resource: Resource) {
    setEditingResource(resource)
    setName(resource.name)
    setDescription(resource.description ?? '')
    setShowForm(true)
    setResources((prev) => prev.filter((item) => item.id !== resource.id))
  }

  function startNew() {
    setEditingResource(null)
    setName('')
    setDescription('')
    setShowForm(true)
  }

  function cancelEdit() {
    if (editingResource) {
      setResources((prev) =>
        [...prev, editingResource].sort((a, b) => a.sort_order - b.sort_order)
      )
    }
    setShowForm(false)
    setEditingResource(null)
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
      if (editingResource) {
        await updateResource(editingResource.id, name, description || null)
      } else {
        const maxOrder = resources.reduce(
          (max, resource) => Math.max(max, resource.sort_order),
          0
        )
        await createResource(
          businessId!,
          name,
          description || null,
          maxOrder + 1
        )
      }
    } catch (err) {
      setSaving(false)
      setError('Error al guardar: ' + (err as Error).message)
      return
    }

    setSaving(false)
    setShowForm(false)
    setEditingResource(null)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
    await load()
  }

  async function toggleActive(resource: Resource) {
    try {
      await toggleResourceActive(resource.id, resource.is_active)
      await load()
    } catch (err) {
      setError('Error al cambiar el estado: ' + (err as Error).message)
    }
  }

  if (loading) return <Spinner size='lg' />

  return (
    <div className='flex flex-col gap-5 max-w-5xl mx-auto'>
      <div className='flex items-center justify-between animate-fade-up'>
        <div>
          <h1 className='text-2xl font-bold tracking-tight'>Recursos</h1>
          <p className='text-sm text-(--color-text-muted) mt-0.5'>
            {resources.length} {resources.length === 1 ? singularLabel : label}{' '}
            {resources.length === 1 ? 'configurado' : 'configurados'}
          </p>
        </div>
        {!showForm && canEdit && (
          <Button size='sm' onClick={startNew}>
            <PlusIcon size={16} />
            <span className='hidden sm:inline'>Nuevo recurso</span>
            <span className='sm:hidden'>Nuevo</span>
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

      {showForm && (
        <Card elevated className='p-5 animate-fade-up'>
          <div className='flex items-center gap-2 mb-4'>
            <div className='flex items-center justify-center w-8 h-8 rounded-lg bg-pitch-100 text-pitch-700'>
              {editingResource ? (
                <EditIcon size={16} />
              ) : (
                <PlusIcon size={16} />
              )}
            </div>
            <h2 className='font-semibold text-sm tracking-tight'>
              {editingResource
                ? `Editando "${editingResource.name}"`
                : 'Nuevo recurso'}
            </h2>
          </div>
          <form onSubmit={handleSave} className='flex flex-col gap-4'>
            <Input
              label='Nombre'
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder='Ej: Sala 1, Consultorio A o Mesa 4'
              required
              autoFocus
            />
            <Input
              label='Descripción (opcional)'
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder='Características que ayuden a identificarlo'
            />
            <div className='flex gap-2'>
              <Button type='submit' loading={saving} size='sm'>
                <CheckIcon size={16} />
                {editingResource ? 'Guardar cambios' : 'Crear recurso'}
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

      {resources.length === 0 && !showForm ? (
        <Card className='p-8 text-center animate-fade-up'>
          <div className='flex flex-col items-center gap-3'>
            <div className='w-12 h-12 rounded-2xl bg-surface-inset flex items-center justify-center text-text-muted'>
              <StoreIcon size={24} />
            </div>
            <div>
              <p className='font-medium text-sm'>No hay recursos</p>
              <p className='text-xs text-text-muted mt-0.5'>
                Crea el primero para empezar a recibir reservas.
              </p>
            </div>
            {canEdit && (
              <Button size='sm' onClick={startNew}>
                <PlusIcon size={16} />
                Crear recurso
              </Button>
            )}
          </div>
        </Card>
      ) : (
        <div className='flex flex-col gap-2.5'>
          {resources.map((resource, index) => (
            <Card
              key={resource.id}
              className={`p-4 animate-stagger ${!resource.is_active ? 'opacity-60' : ''}`}
              style={{ '--index': index } as React.CSSProperties}
            >
              <div className='flex items-center justify-between gap-3'>
                <div className='min-w-0 flex-1 flex items-center gap-2'>
                  <div
                    className={`flex items-center justify-center w-9 h-9 rounded-lg shrink-0 ${resource.is_active ? 'bg-pitch-100 text-pitch-700' : 'bg-surface-inset text-text-muted'}`}
                  >
                    <StoreIcon size={18} />
                  </div>
                  <div className='min-w-0'>
                    <p className='font-medium text-sm truncate'>
                      {resource.name}
                    </p>
                    {resource.description && (
                      <p className='text-xs text-(--color-text-muted) truncate mt-0.5'>
                        {resource.description}
                      </p>
                    )}
                  </div>
                </div>
                <div className='flex items-center gap-2 shrink-0'>
                  {canEdit && (
                    <button
                      onClick={() => toggleActive(resource)}
                      className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ${resource.is_active ? 'bg-primary' : 'bg-graphite-300'}`}
                      aria-label={`${resource.is_active ? 'Desactivar' : 'Activar'} ${resource.name}`}
                      aria-pressed={resource.is_active}
                    >
                      <span
                        className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform duration-200 ease-spring ${resource.is_active ? 'translate-x-5' : ''}`}
                      />
                    </button>
                  )}
                  {canEdit && (
                    <Button
                      variant='secondary'
                      size='sm'
                      onClick={() => startEdit(resource)}
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
