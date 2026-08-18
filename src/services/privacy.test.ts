import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockRpc } = vi.hoisted(() => ({
  mockRpc: vi.fn()
}))
vi.mock('@/lib/supabase', () => ({
  supabase: { rpc: mockRpc }
}))

import {
  recordRegistrationConsent,
  setMarketingConsent,
  withdrawMarketingConsent,
  fetchMyMarketingConsents
} from '@/services/privacy'

beforeEach(() => {
  vi.clearAllMocks()
})

describe('recordRegistrationConsent', () => {
  it('llama al RPC con la versión y source por defecto', async () => {
    mockRpc.mockResolvedValue({ data: 'id-1', error: null })

    await recordRegistrationConsent()

    expect(mockRpc).toHaveBeenCalledWith('record_registration_consent', {
      p_policy_version: expect.any(String),
      p_source: 'registration'
    })
  })

  it('permite override de versión y source', async () => {
    mockRpc.mockResolvedValue({ data: 'id-2', error: null })

    await recordRegistrationConsent('2026-01-01-v2', 'signin_fallback')

    expect(mockRpc).toHaveBeenCalledWith('record_registration_consent', {
      p_policy_version: '2026-01-01-v2',
      p_source: 'signin_fallback'
    })
  })

  it('lanza cuando el RPC retorna error', async () => {
    const rpcError = { message: 'permission denied', code: '42501' }
    mockRpc.mockResolvedValue({ data: null, error: rpcError })

    await expect(recordRegistrationConsent()).rejects.toEqual(rpcError)
  })
})

describe('setMarketingConsent', () => {
  it('llama al RPC con accept=true por defecto', async () => {
    mockRpc.mockResolvedValue({ data: 'id-1', error: null })

    await setMarketingConsent('biz-1')

    expect(mockRpc).toHaveBeenCalledWith('set_marketing_consent', {
      p_business_id: 'biz-1',
      p_policy_version: expect.any(String),
      p_accept: true,
      p_source: 'reservation'
    })
  })

  it('pasa accept=false cuando se indica', async () => {
    mockRpc.mockResolvedValue({ data: 'id-2', error: null })

    await setMarketingConsent('biz-1', false)

    expect(mockRpc).toHaveBeenCalledWith('set_marketing_consent', {
      p_business_id: 'biz-1',
      p_policy_version: expect.any(String),
      p_accept: false,
      p_source: 'reservation'
    })
  })

  it('lanza cuando el RPC retorna error', async () => {
    const rpcError = { message: 'permission denied', code: '42501' }
    mockRpc.mockResolvedValue({ data: null, error: rpcError })

    await expect(setMarketingConsent('biz-1', true)).rejects.toEqual(rpcError)
  })
})

describe('withdrawMarketingConsent', () => {
  it('llama al RPC con el business_id', async () => {
    mockRpc.mockResolvedValue({ data: null, error: null })

    await withdrawMarketingConsent('biz-1')

    expect(mockRpc).toHaveBeenCalledWith('withdraw_marketing_consent', {
      p_business_id: 'biz-1'
    })
  })

  it('lanza cuando el RPC retorna error', async () => {
    const rpcError = { message: 'permission denied', code: '42501' }
    mockRpc.mockResolvedValue({ data: null, error: rpcError })

    await expect(withdrawMarketingConsent('biz-1')).rejects.toEqual(rpcError)
  })
})

describe('fetchMyMarketingConsents', () => {
  it('retorna los consentimientos del usuario actual', async () => {
    const mockData = [
      {
        business_id: 'biz-1',
        business_name: 'Canchas El Parque',
        status: 'accepted',
        accepted_at: '2026-01-01T00:00:00Z',
        withdrawn_at: null,
        policy_version: '2026-12-08-v1'
      }
    ]
    mockRpc.mockResolvedValue({ data: mockData, error: null })

    const result = await fetchMyMarketingConsents()

    expect(result).toEqual(mockData)
    expect(mockRpc).toHaveBeenCalledWith('get_my_marketing_consents')
  })

  it('lanza cuando el RPC retorna error', async () => {
    const rpcError = { message: 'permission denied', code: '42501' }
    mockRpc.mockResolvedValue({ data: null, error: rpcError })

    await expect(fetchMyMarketingConsents()).rejects.toEqual(rpcError)
  })
})
