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
  mockUseLocation: vi.fn(() => ['/'])
}))
vi.mock('wouter', () => ({
  useLocation: mockUseLocation
}))

// Mock del store de auth
const { mockAuthStore } = vi.hoisted(() => ({
  mockAuthStore: vi.fn(() => ({
    user: null,
    isAdmin: false
  }))
}))
vi.mock('@/stores/auth', () => ({
  useAuthStore: mockAuthStore
}))

// Mock de client-tutorial
const {
  mockShouldAutoStart,
  mockMarkSeen,
  mockGetTutorialStage,
  mockSetTutorialStage,
  mockClearTutorialStage
} = vi.hoisted(() => ({
  mockShouldAutoStart: vi.fn(() => false),
  mockMarkSeen: vi.fn(),
  mockGetTutorialStage: vi.fn(() => null),
  mockSetTutorialStage: vi.fn(),
  mockClearTutorialStage: vi.fn()
}))
vi.mock('@/lib/client-tutorial', () => ({
  shouldAutoStart: mockShouldAutoStart,
  markSeen: mockMarkSeen,
  getTutorialStage: mockGetTutorialStage,
  setTutorialStage: mockSetTutorialStage,
  clearTutorialStage: mockClearTutorialStage
}))

import { useClientTutorial } from '@/hooks/use-client-tutorial'

beforeEach(() => {
  vi.clearAllMocks()
  vi.useFakeTimers()
  mockAuthStore.mockReturnValue({
    user: null,
    isAdmin: false
  })
  mockUseLocation.mockReturnValue(['/'])
  mockShouldAutoStart.mockReturnValue(false)
  mockGetTutorialStage.mockReturnValue(null)
  document.body.innerHTML = ''
})

afterEach(() => {
  vi.useRealTimers()
})

describe('useClientTutorial', () => {
  it('retorna startTour y stopTour como funciones', () => {
    const { result } = renderHook(() => useClientTutorial())
    expect(typeof result.current.startTour).toBe('function')
    expect(typeof result.current.stopTour).toBe('function')
  })

  it('no inicia automáticamente cuando shouldAutoStart es false', () => {
    mockShouldAutoStart.mockReturnValue(false)

    renderHook(() => useClientTutorial())

    vi.advanceTimersByTime(1000)
    expect(mockDriver).not.toHaveBeenCalled()
  })

  it('no inicia en rutas admin', () => {
    mockUseLocation.mockReturnValue(['/admin'])
    mockAuthStore.mockReturnValue({
      user: { id: 'admin-1' } as any,
      isAdmin: true
    })
    mockShouldAutoStart.mockReturnValue(false)

    renderHook(() => useClientTutorial())

    vi.advanceTimersByTime(1000)
    expect(mockDriver).not.toHaveBeenCalled()
  })

  it('stopTour limpia sin lanzar errores', () => {
    const { result } = renderHook(() => useClientTutorial())
    expect(() => result.current.stopTour()).not.toThrow()
  })
})
