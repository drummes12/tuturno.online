import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  hasAdminSeenTutorial,
  markAdminTutorialSeen,
  shouldAutoStartAdmin,
  setAdminTutorialStage,
  getAdminTutorialStage,
  clearAdminTutorialStage
} from '@/lib/admin-tutorial'

describe('admin-tutorial — persistencia', () => {
  beforeEach(() => {
    localStorage.clear()
    sessionStorage.clear()
  })

  describe('usuario admin', () => {
    const userId = 'admin-123'

    it('hasAdminSeenTutorial: false inicialmente', () => {
      expect(hasAdminSeenTutorial(userId)).toBe(false)
    })

    it('markAdminTutorialSeen: marca como visto', () => {
      markAdminTutorialSeen(userId)
      expect(hasAdminSeenTutorial(userId)).toBe(true)
    })

    it('shouldAutoStartAdmin: true para admin no visto', () => {
      expect(shouldAutoStartAdmin({ userId, isAdmin: true })).toBe(true)
    })

    it('shouldAutoStartAdmin: false para admin ya visto', () => {
      markAdminTutorialSeen(userId)
      expect(shouldAutoStartAdmin({ userId, isAdmin: true })).toBe(false)
    })

    it('shouldAutoStartAdmin: false si no es admin', () => {
      expect(shouldAutoStartAdmin({ userId, isAdmin: false })).toBe(false)
    })

    it('shouldAutoStartAdmin: false si no hay userId', () => {
      expect(shouldAutoStartAdmin({ userId: null, isAdmin: true })).toBe(false)
    })

    it('usuarios diferentes tienen estado independiente', () => {
      markAdminTutorialSeen('admin-1')
      expect(hasAdminSeenTutorial('admin-1')).toBe(true)
      expect(hasAdminSeenTutorial('admin-2')).toBe(false)
    })

    it('estado de admin es independiente del de cliente', () => {
      markAdminTutorialSeen(userId)
      // La clave del cliente no debe verse afectada
      expect(
        localStorage.getItem('tuturno:tutorial:user:admin-123:v1')
      ).toBe(null)
    })
  })

  describe('etapa del tutorial', () => {
    it('getAdminTutorialStage: null inicialmente', () => {
      expect(getAdminTutorialStage()).toBe(null)
    })

    it('setAdminTutorialStage: guarda y recupera', () => {
      setAdminTutorialStage('admin-dashboard')
      expect(getAdminTutorialStage()).toBe('admin-dashboard')
    })

    it('clearAdminTutorialStage: limpia la etapa', () => {
      setAdminTutorialStage('admin-config')
      clearAdminTutorialStage()
      expect(getAdminTutorialStage()).toBe(null)
    })

    it('setAdminTutorialStage(null): limpia la etapa', () => {
      setAdminTutorialStage('admin-hours')
      setAdminTutorialStage(null)
      expect(getAdminTutorialStage()).toBe(null)
    })

    it('etapa de admin es independiente de la de cliente', () => {
      sessionStorage.setItem('tuturno:tutorial:stage:v1', 'auth')
      setAdminTutorialStage('admin-dashboard')
      expect(sessionStorage.getItem('tuturno:tutorial:stage:v1')).toBe('auth')
      expect(getAdminTutorialStage()).toBe('admin-dashboard')
    })
  })

  describe('manejo de storage bloqueado', () => {
    it('no lanza cuando localStorage está bloqueado', () => {
      const original = localStorage.getItem
      localStorage.getItem = vi.fn(() => {
        throw new Error('Storage blocked')
      })

      expect(() => hasAdminSeenTutorial('user-1')).not.toThrow()
      expect(hasAdminSeenTutorial('user-1')).toBe(false)

      localStorage.getItem = original
    })

    it('no lanza cuando localStorage.setItem está bloqueado', () => {
      const original = localStorage.setItem
      localStorage.setItem = vi.fn(() => {
        throw new Error('Storage blocked')
      })

      expect(() => markAdminTutorialSeen('user-1')).not.toThrow()

      localStorage.setItem = original
    })
  })
})
