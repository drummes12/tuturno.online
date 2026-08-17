import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook } from '@testing-library/react'

// Mock de Driver.js con vi.hoisted para evitar problemas de inicialización
const { mockDrive, mockDestroy, mockDriver } = vi.hoisted(() => ({
  mockDrive: vi.fn(),
  mockDestroy: vi.fn(),
  mockDriver: vi.fn(() => ({
    drive: mockDrive,
    destroy: mockDestroy,
    isActive: vi.fn(() => false),
    setConfig: vi.fn(),
    setSteps: vi.fn(),
    getConfig: vi.fn(),
    getState: vi.fn(),
    getActiveIndex: vi.fn(),
    isFirstStep: vi.fn(),
    isLastStep: vi.fn(),
    getActiveStep: vi.fn(),
    getActiveElement: vi.fn(),
    getPreviousElement: vi.fn(),
    getPreviousStep: vi.fn(),
    getNextStep: vi.fn(),
    moveNext: vi.fn(),
    movePrevious: vi.fn(),
    moveTo: vi.fn(),
    hasNextStep: vi.fn(),
    hasPreviousStep: vi.fn(),
    highlight: vi.fn(),
    refresh: vi.fn()
  }))
}))

vi.mock('driver.js', () => ({
  driver: mockDriver
}))

// Mock de wouter useLocation
const { mockUseLocation } = vi.hoisted(() => ({
  mockUseLocation: vi.fn(() => ['/admin'])
}))
vi.mock('wouter', () => ({
  useLocation: mockUseLocation
}))

// Mock del store de auth
const { mockAuthStore } = vi.hoisted(() => ({
  mockAuthStore: vi.fn(() => ({
    user: { id: 'admin-1' },
    isAdmin: true
  }))
}))
vi.mock('@/stores/auth', () => ({
  useAuthStore: mockAuthStore
}))

// Mock de admin-tutorial
const {
  mockShouldAutoStartAdmin,
  mockMarkAdminTutorialSeen,
  mockGetAdminTutorialStage,
  mockSetAdminTutorialStage,
  mockClearAdminTutorialStage
} = vi.hoisted(() => ({
  mockShouldAutoStartAdmin: vi.fn(() => false),
  mockMarkAdminTutorialSeen: vi.fn(),
  mockGetAdminTutorialStage: vi.fn(() => null),
  mockSetAdminTutorialStage: vi.fn(),
  mockClearAdminTutorialStage: vi.fn()
}))
vi.mock('@/lib/admin-tutorial', () => ({
  shouldAutoStartAdmin: mockShouldAutoStartAdmin,
  markAdminTutorialSeen: mockMarkAdminTutorialSeen,
  getAdminTutorialStage: mockGetAdminTutorialStage,
  setAdminTutorialStage: mockSetAdminTutorialStage,
  clearAdminTutorialStage: mockClearAdminTutorialStage
}))

import { useAdminTutorial } from '@/hooks/use-admin-tutorial'

beforeEach(() => {
  vi.clearAllMocks()
  vi.useFakeTimers()
  mockAuthStore.mockReturnValue({
    user: { id: 'admin-1' },
    isAdmin: true
  })
  mockUseLocation.mockReturnValue(['/admin'])
  mockShouldAutoStartAdmin.mockReturnValue(false)
  mockGetAdminTutorialStage.mockReturnValue(null)
  document.body.innerHTML = ''
})

afterEach(() => {
  vi.useRealTimers()
})

describe('useAdminTutorial', () => {
  it('retorna startTour y stopTour como funciones', () => {
    const { result } = renderHook(() => useAdminTutorial())
    expect(typeof result.current.startTour).toBe('function')
    expect(typeof result.current.stopTour).toBe('function')
  })

  it('no inicia automáticamente cuando shouldAutoStartAdmin es false', () => {
    mockShouldAutoStartAdmin.mockReturnValue(false)

    renderHook(() => useAdminTutorial())

    vi.advanceTimersByTime(1000)
    expect(mockDriver).not.toHaveBeenCalled()
  })

  it('no inicia en rutas no admin', () => {
    mockUseLocation.mockReturnValue(['/'])
    mockAuthStore.mockReturnValue({
      user: { id: 'user-1' } as any,
      isAdmin: false
    })
    mockShouldAutoStartAdmin.mockReturnValue(false)

    renderHook(() => useAdminTutorial())

    vi.advanceTimersByTime(1000)
    expect(mockDriver).not.toHaveBeenCalled()
  })

  it('stopTour limpia sin lanzar errores', () => {
    const { result } = renderHook(() => useAdminTutorial())
    expect(() => result.current.stopTour()).not.toThrow()
  })
})
