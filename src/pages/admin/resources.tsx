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
import { Page } from '@/components/layout/page'

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
    <Page width='narrow'>
      <div className='flex items-center justify-between animate-fade-up'>
        <div>
          <h1 className='text-2xl font-bold tracking-tight'>Recursos</h1>
          <p className='text-sm text-(--color-text-muted) mt-0.5 nums'>
            {resources.length} {resources.length === 1 ? singularLabel : label}{' '}
            {resources.length === 1 ? 'configurado' : 'configurados'}
          </p>
        </div>
        {!showForm && canEdit && (
          <Button size='sm' onClick={startNew} data-tour='admin-resource-new'>
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
            <div className='flex items-center justify-center w-8 h-8 rounded-lg bg-pitch-100 text-pitch-700 dark:bg-pitch-500/15 dark:text-pitch-300'>
              {editingResource ? (
                <EditIcon size={16} />
              ) : (
                <PlusIcon size={16} />
              )}
            </div>
            <h2 className='text-[11px] font-medium uppercase tracking-[0.14em] text-(--color-text)'>
              {editingResource
                ? `Editando "${editingResource.name}"`
                : `Nuevo ${singularLabel}`}
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
        <div className='overflow-hidden rounded-2xl border border-border bg-surface-elevated shadow-(--shadow-sm) animate-fade-up'>
          <ul className='flex flex-col divide-y divide-border'>
            {resources.map((resource, index) => (
              <li
                key={resource.id}
                data-tour={index === 0 ? 'admin-resource-card' : undefined}
                className={`flex animate-stagger flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3.5 sm:flex-nowrap sm:px-5 ${!resource.is_active ? 'opacity-60' : ''}`}
                style={{ '--index': index } as React.CSSProperties}
              >
                <span className='w-6 shrink-0 text-[11px] font-medium text-text-muted/70 nums'>
                  {String(resource.sort_order).padStart(2, '0')}
                </span>
                <div
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${resource.is_active ? 'bg-pitch-100 text-pitch-700 dark:bg-pitch-500/15 dark:text-pitch-300' : 'bg-surface-inset text-text-muted'}`}
                >
                  <StoreIcon size={18} />
                </div>
                <div className='min-w-0 flex-1'>
                  <p className='truncate text-sm font-medium'>
                    {resource.name}
                  </p>
                  {resource.description && (
                    <p className='mt-0.5 truncate text-xs text-(--color-text-muted)'>
                      {resource.description}
                    </p>
                  )}
                </div>
                <div className='flex w-full shrink-0 items-center justify-end gap-2.5 pl-9 sm:w-auto sm:pl-0'>
                  <span
                    className={`rounded-md border px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.12em] ${
                      resource.is_active
                        ? 'border-pitch-500/40 bg-pitch-500/10 text-pitch-700 dark:border-pitch-400/30 dark:text-pitch-300'
                        : 'border-border bg-surface-inset text-text-muted'
                    }`}
                  >
                    {resource.is_active ? 'Activo' : 'Inactivo'}
                  </span>
                  {canEdit && (
                    <button
                      onClick={() => toggleActive(resource)}
                      data-tour={
                        index === 0 ? 'admin-resource-toggle' : undefined
                      }
                      className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${resource.is_active ? 'bg-primary' : 'bg-graphite-300'}`}
                      aria-label={`${resource.is_active ? 'Desactivar' : 'Activar'} ${resource.name}`}
                      aria-pressed={resource.is_active}
                    >
                      <span
                        className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform duration-200 ease-spring ${resource.is_active ? 'translate-x-5' : ''}`}
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
              </li>
            ))}
          </ul>
        </div>
      )}
    </Page>
  )
}
