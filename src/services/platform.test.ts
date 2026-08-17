import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createQueryChain } from '@/test/supabase-mock'
import {
  approveSignupRequest,
  cancelMySignupRequest,
  checkSlugAvailability,
  fetchAuditLog,
  fetchBusinessOverview,
  fetchIsPlatformAdmin,
  fetchMySignupRequest,
  findUserByEmail,
  rejectSignupRequest,
  requestBusinessSignup,
  setMemberRole
} from '@/services/platform'

const { mockFrom, mockRpc } = vi.hoisted(() => ({
  mockFrom: vi.fn(),
  mockRpc: vi.fn()
}))

vi.mock('@/lib/supabase', () => ({
  supabase: { from: mockFrom, rpc: mockRpc }
}))

beforeEach(() => {
  vi.clearAllMocks()
})

describe('fetchIsPlatformAdmin', () => {
  it('devuelve true cuando el RPC responde true', async () => {
    mockRpc.mockResolvedValue({ data: true, error: null })
    expect(await fetchIsPlatformAdmin()).toBe(true)
    expect(mockRpc).toHaveBeenCalledWith('is_platform_admin')
  })

  it('devuelve false sin lanzar cuando el RPC falla', async () => {
    mockRpc.mockResolvedValue({ data: null, error: { message: 'denied' } })
    expect(await fetchIsPlatformAdmin()).toBe(false)
  })
})

describe('checkSlugAvailability', () => {
  it('normaliza la respuesta del RPC', async () => {
    mockRpc.mockReturnValue({
      maybeSingle: vi
        .fn()
        .mockResolvedValue({ data: { available: false, reason: 'taken' }, error: null })
    })
    expect(await checkSlugAvailability('demo')).toEqual({
      available: false,
      reason: 'taken'
    })
    expect(mockRpc).toHaveBeenCalledWith('check_slug_availability', {
      p_slug: 'demo'
    })
  })

  it('trata la ausencia de fila como no disponible', async () => {
    mockRpc.mockReturnValue({
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null })
    })
    expect(await checkSlugAvailability('x')).toEqual({
      available: false,
      reason: null
    })
  })

  it('propaga el error del RPC', async () => {
    mockRpc.mockReturnValue({
      maybeSingle: vi
        .fn()
        .mockResolvedValue({ data: null, error: { message: 'boom' } })
    })
    await expect(checkSlugAvailability('x')).rejects.toEqual({ message: 'boom' })
  })
})

describe('requestBusinessSignup', () => {
  it('envía los campos opcionales como null', async () => {
    mockRpc.mockResolvedValue({ data: 'req-1', error: null })
    const id = await requestBusinessSignup({
      businessName: 'Canchas El Parque',
      desiredSlug: 'canchas-el-parque'
    })
    expect(id).toBe('req-1')
    expect(mockRpc).toHaveBeenCalledWith('request_business_signup', {
      p_business_name: 'Canchas El Parque',
      p_desired_slug: 'canchas-el-parque',
      p_business_type: null,
      p_contact_phone: null,
      p_city: null,
      p_notes: null
    })
  })

  it('propaga el error del RPC', async () => {
    mockRpc.mockResolvedValue({ data: null, error: { message: 'duplicada' } })
    await expect(
      requestBusinessSignup({ businessName: 'A', desiredSlug: 'a' })
    ).rejects.toEqual({ message: 'duplicada' })
  })
})

describe('fetchMySignupRequest', () => {
  it('devuelve la solicitud más reciente del usuario', async () => {
    const chain = createQueryChain({
      data: { id: 'req-1', status: 'pending' },
      error: null
    })
    mockFrom.mockReturnValue(chain)
    const request = await fetchMySignupRequest('user-1')
    expect(request).toEqual({ id: 'req-1', status: 'pending' })
    expect(mockFrom).toHaveBeenCalledWith('business_signup_requests')
    expect(chain.eq).toHaveBeenCalledWith('user_id', 'user-1')
    expect(chain.order).toHaveBeenCalledWith('created_at', { ascending: false })
  })
})

describe('cancelMySignupRequest', () => {
  it('llama al RPC de cancelación', async () => {
    mockRpc.mockResolvedValue({ data: null, error: null })
    await cancelMySignupRequest('req-1')
    expect(mockRpc).toHaveBeenCalledWith('cancel_business_signup_request', {
      p_request_id: 'req-1'
    })
  })
})

describe('approveSignupRequest', () => {
  it('usa etiquetas por defecto cuando no se pasan', async () => {
    mockRpc.mockResolvedValue({ data: 'biz-1', error: null })
    expect(await approveSignupRequest('req-1')).toBe('biz-1')
    expect(mockRpc).toHaveBeenCalledWith('approve_business_signup', {
      p_request_id: 'req-1',
      p_slug_override: null,
      p_label_singular: 'Espacio',
      p_label_plural: 'Espacios'
    })
  })

  it('envía el slug corregido por el operador', async () => {
    mockRpc.mockResolvedValue({ data: 'biz-1', error: null })
    await approveSignupRequest('req-1', {
      slugOverride: 'otro-slug',
      labelSingular: 'Cancha',
      labelPlural: 'Canchas'
    })
    expect(mockRpc).toHaveBeenCalledWith('approve_business_signup', {
      p_request_id: 'req-1',
      p_slug_override: 'otro-slug',
      p_label_singular: 'Cancha',
      p_label_plural: 'Canchas'
    })
  })
})

describe('rejectSignupRequest', () => {
  it('propaga el error del RPC', async () => {
    mockRpc.mockResolvedValue({ data: null, error: { message: 'no pendiente' } })
    await expect(rejectSignupRequest('req-1', 'motivo')).rejects.toEqual({
      message: 'no pendiente'
    })
  })
})

describe('fetchBusinessOverview', () => {
  it('devuelve arreglo vacío cuando no hay datos', async () => {
    mockRpc.mockResolvedValue({ data: null, error: null })
    expect(await fetchBusinessOverview()).toEqual([])
  })
})

describe('findUserByEmail', () => {
  it('devuelve la primera coincidencia', async () => {
    mockRpc.mockResolvedValue({
      data: [{ user_id: 'u-1', email: 'a@b.com' }],
      error: null
    })
    expect(await findUserByEmail('a@b.com')).toEqual({
      user_id: 'u-1',
      email: 'a@b.com'
    })
  })

  it('devuelve null cuando no hay coincidencias', async () => {
    mockRpc.mockResolvedValue({ data: [], error: null })
    expect(await findUserByEmail('a@b.com')).toBeNull()
  })
})

describe('setMemberRole', () => {
  it('llama al RPC de plataforma con el rol', async () => {
    mockRpc.mockResolvedValue({ data: null, error: null })
    await setMemberRole('biz-1', 'user-1', 'owner')
    expect(mockRpc).toHaveBeenCalledWith('platform_set_member_role', {
      p_business_id: 'biz-1',
      p_user_id: 'user-1',
      p_role: 'owner'
    })
  })
})

describe('fetchAuditLog', () => {
  it('limita los resultados', async () => {
    const chain = createQueryChain({ data: [], error: null })
    mockFrom.mockReturnValue(chain)
    await fetchAuditLog(10)
    expect(mockFrom).toHaveBeenCalledWith('platform_audit_log')
    expect(chain.limit).toHaveBeenCalledWith(10)
  })
})
