import { afterEach, describe, expect, it, vi } from 'vitest'
import { clearPrivateOfflineCache } from '@/lib/offline-cache'

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('clearPrivateOfflineCache', () => {
  it('borra solo las cachés de respuestas de datos', async () => {
    const cacheStorage = {
      keys: vi.fn().mockResolvedValue([
        'tuturno-static-v4',
        'tuturno-pages-v4',
        'tuturno-data-v3',
        'tuturno-data-v4'
      ]),
      delete: vi.fn().mockResolvedValue(true)
    }
    vi.stubGlobal('caches', cacheStorage)

    await clearPrivateOfflineCache()

    expect(cacheStorage.delete).toHaveBeenCalledTimes(2)
    expect(cacheStorage.delete).toHaveBeenCalledWith('tuturno-data-v3')
    expect(cacheStorage.delete).toHaveBeenCalledWith('tuturno-data-v4')
  })
})
