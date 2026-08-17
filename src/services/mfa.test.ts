import { describe, it, expect, vi, beforeEach } from 'vitest'

const mfaMock = vi.hoisted(() => ({
  getAuthenticatorAssuranceLevel: vi.fn(),
  listFactors: vi.fn(),
  unenroll: vi.fn(),
  enroll: vi.fn(),
  challenge: vi.fn(),
  verify: vi.fn()
}))

vi.mock('@/lib/supabase', () => ({
  supabase: { auth: { mfa: mfaMock } }
}))

import {
  createMfaChallenge,
  enrollTotpFactor,
  getAuthenticatorAssuranceLevel,
  listMfaFactors,
  unenrollMfaFactor,
  verifyMfaChallenge
} from '@/services/mfa'

beforeEach(() => {
  vi.clearAllMocks()
})

describe('getAuthenticatorAssuranceLevel', () => {
  it('devuelve el nivel actual y el siguiente', async () => {
    mfaMock.getAuthenticatorAssuranceLevel.mockResolvedValue({
      data: { currentLevel: 'aal2', nextLevel: 'aal2' },
      error: null
    })
    const result = await getAuthenticatorAssuranceLevel()
    expect(result).toEqual({ currentLevel: 'aal2', nextLevel: 'aal2' })
  })

  it('trata null como aal1', async () => {
    mfaMock.getAuthenticatorAssuranceLevel.mockResolvedValue({
      data: { currentLevel: null, nextLevel: null },
      error: null
    })
    const result = await getAuthenticatorAssuranceLevel()
    expect(result.currentLevel).toBe('aal1')
  })

  it('propaga el error', async () => {
    mfaMock.getAuthenticatorAssuranceLevel.mockResolvedValue({
      data: null,
      error: { message: 'denied' }
    })
    await expect(getAuthenticatorAssuranceLevel()).rejects.toEqual({
      message: 'denied'
    })
  })
})

describe('listMfaFactors', () => {
  it('mapea los factores TOTP a la forma simplificada', async () => {
    mfaMock.listFactors.mockResolvedValue({
      data: {
        totp: [
          { id: 'f1', status: 'verified', friendly_name: 'Authy' },
          { id: 'f2', status: 'unverified', friendly_name: 'Temp' }
        ]
      },
      error: null
    })
    const factors = await listMfaFactors()
    expect(factors).toEqual([
      { id: 'f1', status: 'verified', friendlyName: 'Authy' },
      { id: 'f2', status: 'unverified', friendlyName: 'Temp' }
    ])
  })

  it('devuelve array vacío cuando no hay factores', async () => {
    mfaMock.listFactors.mockResolvedValue({
      data: { totp: [] },
      error: null
    })
    expect(await listMfaFactors()).toEqual([])
  })

  it('propaga el error', async () => {
    mfaMock.listFactors.mockResolvedValue({
      data: null,
      error: { message: 'boom' }
    })
    await expect(listMfaFactors()).rejects.toEqual({ message: 'boom' })
  })
})

describe('unenrollMfaFactor', () => {
  it('llama a unenroll con el factorId', async () => {
    mfaMock.unenroll.mockResolvedValue({ data: {}, error: null })
    await unenrollMfaFactor('f1')
    expect(mfaMock.unenroll).toHaveBeenCalledWith({ factorId: 'f1' })
  })

  it('propaga el error', async () => {
    mfaMock.unenroll.mockResolvedValue({
      data: null,
      error: { message: 'nope' }
    })
    await expect(unenrollMfaFactor('f1')).rejects.toEqual({ message: 'nope' })
  })
})

describe('enrollTotpFactor', () => {
  it('devuelve factorId, qrCode y secret', async () => {
    mfaMock.enroll.mockResolvedValue({
      data: {
        id: 'f1',
        totp: { qr_code: 'data:png;base64,xxx', secret: 'ABCDE12345' }
      },
      error: null
    })
    const result = await enrollTotpFactor('Mi factor')
    expect(result).toEqual({
      factorId: 'f1',
      qrCode: 'data:png;base64,xxx',
      secret: 'ABCDE12345'
    })
    expect(mfaMock.enroll).toHaveBeenCalledWith({
      factorType: 'totp',
      friendlyName: 'Mi factor'
    })
  })

  it('propaga el error', async () => {
    mfaMock.enroll.mockResolvedValue({
      data: null,
      error: { message: 'max factors' }
    })
    await expect(enrollTotpFactor('x')).rejects.toEqual({
      message: 'max factors'
    })
  })
})

describe('createMfaChallenge', () => {
  it('devuelve el id del challenge', async () => {
    mfaMock.challenge.mockResolvedValue({
      data: { id: 'ch-1' },
      error: null
    })
    expect(await createMfaChallenge('f1')).toBe('ch-1')
    expect(mfaMock.challenge).toHaveBeenCalledWith({ factorId: 'f1' })
  })

  it('propaga el error', async () => {
    mfaMock.challenge.mockResolvedValue({
      data: null,
      error: { message: 'fail' }
    })
    await expect(createMfaChallenge('f1')).rejects.toEqual({ message: 'fail' })
  })
})

describe('verifyMfaChallenge', () => {
  it('llama a verify con factorId, challengeId y code', async () => {
    mfaMock.verify.mockResolvedValue({ data: {}, error: null })
    await verifyMfaChallenge('f1', 'ch-1', '123456')
    expect(mfaMock.verify).toHaveBeenCalledWith({
      factorId: 'f1',
      challengeId: 'ch-1',
      code: '123456'
    })
  })

  it('propaga el error', async () => {
    mfaMock.verify.mockResolvedValue({
      data: null,
      error: { message: 'invalid code' }
    })
    await expect(verifyMfaChallenge('f1', 'ch-1', '000000')).rejects.toEqual({
      message: 'invalid code'
    })
  })
})
