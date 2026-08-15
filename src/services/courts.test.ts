import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createQueryChain } from '@/test/supabase-mock'
import type { Resource } from '@/types'

const { mockFrom } = vi.hoisted(() => ({
  mockFrom: vi.fn()
}))
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: mockFrom
  }
}))

import {
  fetchAllResources,
  fetchActiveResources,
  fetchResourceName,
  createResource,
  updateResource,
  toggleResourceActive
} from '@/services/resources'

/**
 * Crea una query chain thenable.
 *
 * `createQueryChain` hace que single()/maybeSingle() devuelvan promesas,
 * pero los métodos como order(), eq(), insert() y update() retornan `this`
 * (la chain). Los servicios hacen `await` directamente sobre la chain en
 * esos casos, por lo que la chain debe ser thenable y exponer data/error.
 */
function createThenableChain(result: { data: any; error: any }) {
  const chain = createQueryChain(result) as any
  chain.then = (onFulfilled: any, onRejected: any) =>
    Promise.resolve(result).then(onFulfilled, onRejected)
  chain.data = result.data
  chain.error = result.error
  return chain
}

const mockResource: Resource = {
  id: 'court-1',
  business_id: 'biz-1',
  name: 'Cancha A',
  description: 'Cancha de fútbol',
  is_active: true,
  sort_order: 1,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z'
}

describe('resources service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // -----------------------------------------------------------------------
  // fetchAllResources
  // -----------------------------------------------------------------------
  describe('fetchAllResources', () => {
    it('retorna todas las canchas ordenadas por sort_order', async () => {
      const resources: Resource[] = [
        mockResource,
        { ...mockResource, id: 'court-2', name: 'Cancha B', sort_order: 2 }
      ]
      const chain = createThenableChain({ data: resources, error: null })
      mockFrom.mockReturnValue(chain)

      const result = await fetchAllResources('biz-1')

      expect(result).toEqual(resources)
      expect(mockFrom).toHaveBeenCalledWith('resources')
      expect(chain.select).toHaveBeenCalledWith('*')
      expect(chain.eq).toHaveBeenCalledWith('business_id', 'biz-1')
      expect(chain.order).toHaveBeenCalledWith('sort_order')
    })

    it('retorna un arreglo vacío cuando no hay canchas', async () => {
      const chain = createThenableChain({ data: [], error: null })
      mockFrom.mockReturnValue(chain)

      const result = await fetchAllResources('biz-1')

      expect(result).toEqual([])
    })

    it('lanza error cuando supabase retorna error', async () => {
      const error = new Error('Error de base de datos')
      const chain = createThenableChain({ data: null, error })
      mockFrom.mockReturnValue(chain)

      await expect(fetchAllResources('biz-1')).rejects.toThrow(
        'Error de base de datos'
      )
      expect(mockFrom).toHaveBeenCalledWith('resources')
    })

    it('consulta la tabla resources', async () => {
      const chain = createThenableChain({ data: [], error: null })
      mockFrom.mockReturnValue(chain)

      await fetchAllResources('biz-1')

      expect(mockFrom).toHaveBeenCalledTimes(1)
      expect(mockFrom).toHaveBeenNthCalledWith(1, 'resources')
    })
  })

  // -----------------------------------------------------------------------
  // fetchActiveResources
  // -----------------------------------------------------------------------
  describe('fetchActiveResources', () => {
    it('retorna solo las canchas activas', async () => {
      const resources: Resource[] = [
        { ...mockResource, is_active: true },
        { ...mockResource, id: 'court-2', name: 'Cancha B', is_active: true }
      ]
      const chain = createThenableChain({ data: resources, error: null })
      mockFrom.mockReturnValue(chain)

      const result = await fetchActiveResources('biz-1')

      expect(result).toEqual(resources)
      expect(mockFrom).toHaveBeenCalledWith('resources')
      expect(chain.select).toHaveBeenCalledWith('*')
      expect(chain.eq).toHaveBeenCalledWith('is_active', true)
      expect(chain.eq).toHaveBeenCalledWith('business_id', 'biz-1')
      expect(chain.order).toHaveBeenCalledWith('sort_order')
    })

    it('retorna un arreglo vacío cuando no hay canchas activas', async () => {
      const chain = createThenableChain({ data: [], error: null })
      mockFrom.mockReturnValue(chain)

      const result = await fetchActiveResources('biz-1')

      expect(result).toEqual([])
    })

    it('lanza error cuando supabase retorna error', async () => {
      const error = new Error('Error al obtener canchas activas')
      const chain = createThenableChain({ data: null, error })
      mockFrom.mockReturnValue(chain)

      await expect(fetchActiveResources('biz-1')).rejects.toThrow(
        'Error al obtener canchas activas'
      )
      expect(mockFrom).toHaveBeenCalledWith('resources')
    })

    it('filtra por is_active = true', async () => {
      const chain = createThenableChain({ data: [], error: null })
      mockFrom.mockReturnValue(chain)

      await fetchActiveResources('biz-1')

      expect(chain.eq).toHaveBeenCalledWith('is_active', true)
    })
  })

  // -----------------------------------------------------------------------
  // fetchResourceName
  // -----------------------------------------------------------------------
  describe('fetchResourceName', () => {
    it('retorna el nombre de la cancha', async () => {
      const chain = createThenableChain({
        data: { name: 'Cancha A' },
        error: null
      })
      mockFrom.mockReturnValue(chain)

      const result = await fetchResourceName('court-1')

      expect(result).toBe('Cancha A')
      expect(mockFrom).toHaveBeenCalledWith('resources')
      expect(chain.select).toHaveBeenCalledWith('name')
      expect(chain.eq).toHaveBeenCalledWith('id', 'court-1')
      expect(chain.single).toHaveBeenCalledTimes(1)
    })

    it('retorna null cuando no se encuentran datos', async () => {
      const chain = createThenableChain({ data: null, error: null })
      mockFrom.mockReturnValue(chain)

      const result = await fetchResourceName('nonexistent-id')

      expect(result).toBeNull()
    })

    it('retorna null cuando data.name es undefined', async () => {
      const chain = createThenableChain({ data: {}, error: null })
      mockFrom.mockReturnValue(chain)

      const result = await fetchResourceName('court-1')

      expect(result).toBeNull()
    })

    it('filtra por el id proporcionado', async () => {
      const chain = createThenableChain({
        data: { name: 'Cancha X' },
        error: null
      })
      mockFrom.mockReturnValue(chain)

      await fetchResourceName('court-abc-123')

      expect(chain.eq).toHaveBeenCalledWith('id', 'court-abc-123')
    })

    it('usa single() para obtener un único registro', async () => {
      const chain = createThenableChain({
        data: { name: 'Cancha A' },
        error: null
      })
      mockFrom.mockReturnValue(chain)

      await fetchResourceName('court-1')

      expect(chain.single).toHaveBeenCalledTimes(1)
    })
  })

  // -----------------------------------------------------------------------
  // createResource
  // -----------------------------------------------------------------------
  describe('createResource', () => {
    it('inserta una cancha con los campos correctos', async () => {
      const chain = createThenableChain({ data: null, error: null })
      mockFrom.mockReturnValue(chain)

      await createResource(
        'biz-1',
        '  Cancha B  ',
        '  Descripción de la cancha  ',
        2
      )

      expect(mockFrom).toHaveBeenCalledWith('resources')
      expect(chain.insert).toHaveBeenCalledWith({
        business_id: 'biz-1',
        name: 'Cancha B',
        description: 'Descripción de la cancha',
        sort_order: 2
      })
    })

    it('recorta el nombre (trim)', async () => {
      const chain = createThenableChain({ data: null, error: null })
      mockFrom.mockReturnValue(chain)

      await createResource('biz-1', '   Cancha Trimmed   ', null, 1)

      expect(chain.insert).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Cancha Trimmed' })
      )
    })

    it('convierte descripción con solo espacios a null', async () => {
      const chain = createThenableChain({ data: null, error: null })
      mockFrom.mockReturnValue(chain)

      await createResource('biz-1', 'Cancha C', '   ', 3)

      expect(chain.insert).toHaveBeenCalledWith({
        business_id: 'biz-1',
        name: 'Cancha C',
        description: null,
        sort_order: 3
      })
    })

    it('pasa null cuando description es null', async () => {
      const chain = createThenableChain({ data: null, error: null })
      mockFrom.mockReturnValue(chain)

      await createResource('biz-1', 'Cancha D', null, 4)

      expect(chain.insert).toHaveBeenCalledWith({
        business_id: 'biz-1',
        name: 'Cancha D',
        description: null,
        sort_order: 4
      })
    })

    it('recorta la descripción cuando tiene contenido', async () => {
      const chain = createThenableChain({ data: null, error: null })
      mockFrom.mockReturnValue(chain)

      await createResource('biz-1', 'Cancha E', '  Texto con espacios  ', 5)

      expect(chain.insert).toHaveBeenCalledWith(
        expect.objectContaining({ description: 'Texto con espacios' })
      )
    })

    it('lanza error cuando supabase retorna error', async () => {
      const error = new Error('Error al crear cancha')
      const chain = createThenableChain({ data: null, error })
      mockFrom.mockReturnValue(chain)

      await expect(
        createResource('biz-1', 'Cancha F', null, 6)
      ).rejects.toThrow('Error al crear cancha')
      expect(mockFrom).toHaveBeenCalledWith('resources')
    })

    it('consulta la tabla resources', async () => {
      const chain = createThenableChain({ data: null, error: null })
      mockFrom.mockReturnValue(chain)

      await createResource('biz-1', 'Cancha G', null, 7)

      expect(mockFrom).toHaveBeenCalledTimes(1)
      expect(mockFrom).toHaveBeenCalledWith('resources')
    })
  })

  // -----------------------------------------------------------------------
  // updateResource
  // -----------------------------------------------------------------------
  describe('updateResource', () => {
    it('actualiza una cancha con los campos correctos', async () => {
      const chain = createThenableChain({ data: null, error: null })
      mockFrom.mockReturnValue(chain)

      await updateResource(
        'court-1',
        '  Cancha Actualizada  ',
        '  Nueva descripción  '
      )

      expect(mockFrom).toHaveBeenCalledWith('resources')
      expect(chain.update).toHaveBeenCalledWith({
        name: 'Cancha Actualizada',
        description: 'Nueva descripción'
      })
      expect(chain.eq).toHaveBeenCalledWith('id', 'court-1')
    })

    it('recorta el nombre (trim)', async () => {
      const chain = createThenableChain({ data: null, error: null })
      mockFrom.mockReturnValue(chain)

      await updateResource('court-1', '   Nombre Trimmed   ', null)

      expect(chain.update).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Nombre Trimmed' })
      )
    })

    it('convierte descripción con solo espacios a null', async () => {
      const chain = createThenableChain({ data: null, error: null })
      mockFrom.mockReturnValue(chain)

      await updateResource('court-1', 'Cancha', '   ')

      expect(chain.update).toHaveBeenCalledWith({
        name: 'Cancha',
        description: null
      })
    })

    it('pasa null cuando description es null', async () => {
      const chain = createThenableChain({ data: null, error: null })
      mockFrom.mockReturnValue(chain)

      await updateResource('court-1', 'Cancha', null)

      expect(chain.update).toHaveBeenCalledWith({
        name: 'Cancha',
        description: null
      })
    })

    it('recorta la descripción cuando tiene contenido', async () => {
      const chain = createThenableChain({ data: null, error: null })
      mockFrom.mockReturnValue(chain)

      await updateResource('court-1', 'Cancha', '  Descripción actualizada  ')

      expect(chain.update).toHaveBeenCalledWith(
        expect.objectContaining({ description: 'Descripción actualizada' })
      )
    })

    it('filtra por el id proporcionado', async () => {
      const chain = createThenableChain({ data: null, error: null })
      mockFrom.mockReturnValue(chain)

      await updateResource('court-abc', 'Cancha', null)

      expect(chain.eq).toHaveBeenCalledWith('id', 'court-abc')
    })

    it('lanza error cuando supabase retorna error', async () => {
      const error = new Error('Error al actualizar cancha')
      const chain = createThenableChain({ data: null, error })
      mockFrom.mockReturnValue(chain)

      await expect(updateResource('court-1', 'Cancha', null)).rejects.toThrow(
        'Error al actualizar cancha'
      )
      expect(mockFrom).toHaveBeenCalledWith('resources')
    })

    it('consulta la tabla resources', async () => {
      const chain = createThenableChain({ data: null, error: null })
      mockFrom.mockReturnValue(chain)

      await updateResource('court-1', 'Cancha', null)

      expect(mockFrom).toHaveBeenCalledTimes(1)
      expect(mockFrom).toHaveBeenCalledWith('resources')
    })
  })

  // -----------------------------------------------------------------------
  // toggleResourceActive
  // -----------------------------------------------------------------------
  describe('toggleResourceActive', () => {
    it('desactiva una cancha cuando isActive es true (true -> false)', async () => {
      const chain = createThenableChain({ data: null, error: null })
      mockFrom.mockReturnValue(chain)

      await toggleResourceActive('court-1', true)

      expect(mockFrom).toHaveBeenCalledWith('resources')
      expect(chain.update).toHaveBeenCalledWith({ is_active: false })
      expect(chain.eq).toHaveBeenCalledWith('id', 'court-1')
    })

    it('activa una cancha cuando isActive es false (false -> true)', async () => {
      const chain = createThenableChain({ data: null, error: null })
      mockFrom.mockReturnValue(chain)

      await toggleResourceActive('court-1', false)

      expect(chain.update).toHaveBeenCalledWith({ is_active: true })
    })

    it('filtra por el id proporcionado', async () => {
      const chain = createThenableChain({ data: null, error: null })
      mockFrom.mockReturnValue(chain)

      await toggleResourceActive('court-xyz', true)

      expect(chain.eq).toHaveBeenCalledWith('id', 'court-xyz')
    })

    it('lanza error cuando supabase retorna error', async () => {
      const error = new Error('Error al cambiar estado de cancha')
      const chain = createThenableChain({ data: null, error })
      mockFrom.mockReturnValue(chain)

      await expect(toggleResourceActive('court-1', true)).rejects.toThrow(
        'Error al cambiar estado de cancha'
      )
      expect(mockFrom).toHaveBeenCalledWith('resources')
    })

    it('consulta la tabla resources', async () => {
      const chain = createThenableChain({ data: null, error: null })
      mockFrom.mockReturnValue(chain)

      await toggleResourceActive('court-1', true)

      expect(mockFrom).toHaveBeenCalledTimes(1)
      expect(mockFrom).toHaveBeenCalledWith('resources')
    })
  })
})
