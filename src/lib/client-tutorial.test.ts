import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  hasVisitorSeenTutorial,
  hasUserSeenTutorial,
  markVisitorTutorialSeen,
  markUserTutorialSeen,
  shouldAutoStart,
  markSeen,
  setTutorialStage,
  getTutorialStage,
  clearTutorialStage
} from '@/lib/client-tutorial'

describe('client-tutorial — persistencia', () => {
  beforeEach(() => {
    localStorage.clear()
    sessionStorage.clear()
  })

  describe('visitante', () => {
    it('hasVisitorSeenTutorial: false inicialmente', () => {
      expect(hasVisitorSeenTutorial()).toBe(false)
    })

    it('markVisitorTutorialSeen: marca como visto', () => {
      markVisitorTutorialSeen()
      expect(hasVisitorSeenTutorial()).toBe(true)
    })

    it('shouldAutoStart: true para visitante no visto', () => {
      expect(shouldAutoStart({ userId: null, isAdmin: false })).toBe(true)
    })

    it('shouldAutoStart: false para visitante ya visto', () => {
      markVisitorTutorialSeen()
      expect(shouldAutoStart({ userId: null, isAdmin: false })).toBe(false)
    })

    it('markSeen: marca visitante cuando userId es null', () => {
      markSeen({ userId: null })
      expect(hasVisitorSeenTutorial()).toBe(true)
    })
  })

  describe('usuario autenticado', () => {
    const userId = 'user-123'

    it('hasUserSeenTutorial: false inicialmente', () => {
      expect(hasUserSeenTutorial(userId)).toBe(false)
    })

    it('markUserTutorialSeen: marca como visto para ese usuario', () => {
      markUserTutorialSeen(userId)
      expect(hasUserSeenTutorial(userId)).toBe(true)
    })

    it('shouldAutoStart: true para usuario no visto', () => {
      expect(shouldAutoStart({ userId, isAdmin: false })).toBe(true)
    })

    it('shouldAutoStart: false para usuario ya visto', () => {
      markUserTutorialSeen(userId)
      expect(shouldAutoStart({ userId, isAdmin: false })).toBe(false)
    })

    it('markSeen: marca usuario cuando userId tiene valor', () => {
      markSeen({ userId })
      expect(hasUserSeenTutorial(userId)).toBe(true)
    })

    it('usuarios diferentes tienen estado independiente', () => {
      markUserTutorialSeen('user-1')
      expect(hasUserSeenTutorial('user-1')).toBe(true)
      expect(hasUserSeenTutorial('user-2')).toBe(false)
    })
  })

  describe('admin', () => {
    it('shouldAutoStart: false siempre para admin', () => {
      expect(shouldAutoStart({ userId: null, isAdmin: true })).toBe(false)
      expect(shouldAutoStart({ userId: 'user-1', isAdmin: true })).toBe(false)
    })
  })

  describe('etapa del tutorial', () => {
    it('getTutorialStage: null inicialmente', () => {
      expect(getTutorialStage()).toBe(null)
    })

    it('setTutorialStage: guarda y recupera', () => {
      setTutorialStage('public-discovery')
      expect(getTutorialStage()).toBe('public-discovery')
    })

    it('clearTutorialStage: limpia la etapa', () => {
      setTutorialStage('auth')
      clearTutorialStage()
      expect(getTutorialStage()).toBe(null)
    })

    it('setTutorialStage(null): limpia la etapa', () => {
      setTutorialStage('reservation')
      setTutorialStage(null)
      expect(getTutorialStage()).toBe(null)
    })
  })

  describe('manejo de storage bloqueado', () => {
    it('no lanza cuando localStorage está bloqueado', () => {
      const original = localStorage.getItem
      localStorage.getItem = vi.fn(() => {
        throw new Error('Storage blocked')
      })

      expect(() => hasVisitorSeenTutorial()).not.toThrow()
      expect(hasVisitorSeenTutorial()).toBe(false)

      localStorage.getItem = original
    })

    it('no lanza cuando localStorage.setItem está bloqueado', () => {
      const original = localStorage.setItem
      localStorage.setItem = vi.fn(() => {
        throw new Error('Storage blocked')
      })

      expect(() => markVisitorTutorialSeen()).not.toThrow()

      localStorage.setItem = original
    })
  })
})
