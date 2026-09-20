import { useCallback, useEffect, useRef, useState } from 'react'

export type Connectivity = 'online' | 'degraded' | 'offline'

// Latencia del sondeo a partir de la cual la conexión se reporta "lenta".
const DEGRADED_MS = 3000
// Tiempo offline sostenido antes de tomar la pantalla completa — filtra
// microcortes de WiFi/datos que se resuelven solos en segundos.
const OFFLINE_GRACE_MS = 3000
// Intervalo de sondeo (solo con pestaña visible). Cubre la recuperación
// cuando el evento 'online' no dispara — frecuente en iOS/Safari — y
// detecta degradación de red estando nominalmente online. Offline se
// re-sondea más rápido para que la pantalla se quite pronto al volver.
const PROBE_INTERVAL_MS = 20_000
const RECHECK_OFFLINE_MS = 5_000
const PROBE_TIMEOUT_MS = 5000

interface NetworkInformationLike {
  effectiveType?: string
  rtt?: number
  addEventListener?: (type: string, listener: () => void) => void
  removeEventListener?: (type: string, listener: () => void) => void
}

function getConnection(): NetworkInformationLike | undefined {
  return (navigator as { connection?: NetworkInformationLike }).connection
}

function connectionIsSlow() {
  const conn = getConnection()
  return (
    !!conn &&
    (conn.effectiveType === 'slow-2g' ||
      conn.effectiveType === '2g' ||
      (conn.rtt ?? 0) > 1200)
  )
}

// Sondeo real: HEAD a la raíz no es GET ni asset, así que el service
// worker lo deja pasar a red. Mide si el servidor responde y con qué
// latencia — navigator.onLine NO se consulta aquí a propósito: puede
// quedarse en false con VPNs o tras suspender el equipo, y vetar el
// sondeo dejaría la pantalla offline pegada con red funcionando.
async function probe(): Promise<Connectivity> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), PROBE_TIMEOUT_MS)
  const started = performance.now()
  try {
    await fetch(`/?probe=${Date.now()}`, {
      method: 'HEAD',
      cache: 'no-store',
      signal: controller.signal
    })
    const ms = performance.now() - started
    return ms > DEGRADED_MS || connectionIsSlow() ? 'degraded' : 'online'
  } catch {
    return 'offline'
  } finally {
    clearTimeout(timer)
  }
}

export function useConnectivity() {
  const [status, setStatus] = useState<Connectivity>(() =>
    navigator.onLine ? 'online' : 'offline'
  )
  // offline sostenido: es lo que dispara la pantalla completa.
  const [hardOffline, setHardOffline] = useState(false)
  const graceTimer = useRef<ReturnType<typeof setTimeout>>(undefined)

  const apply = useCallback((next: Connectivity) => {
    setStatus(next)
    if (next === 'offline') {
      graceTimer.current ??= setTimeout(
        () => setHardOffline(true),
        OFFLINE_GRACE_MS
      )
    } else {
      clearTimeout(graceTimer.current)
      graceTimer.current = undefined
      setHardOffline(false)
    }
  }, [])

  const recheck = useCallback(async () => {
    apply(await probe())
  }, [apply])

  // Listeners + sondeo inicial — solo al montar. El evento 'offline'
  // muestra el indicador de inmediato, pero se confirma con un sondeo
  // porque navigator.onLine puede mentir.
  useEffect(() => {
    const handleOffline = () => {
      apply('offline')
      void recheck()
    }
    const handleOnline = () => void recheck()

    window.addEventListener('offline', handleOffline)
    window.addEventListener('online', handleOnline)
    const conn = getConnection()
    conn?.addEventListener?.('change', handleOnline)

    void recheck()

    return () => {
      clearTimeout(graceTimer.current)
      window.removeEventListener('offline', handleOffline)
      window.removeEventListener('online', handleOnline)
      conn?.removeEventListener?.('change', handleOnline)
    }
  }, [apply, recheck])

  // Sondeo periódico — cadencia según el estado actual.
  useEffect(() => {
    const interval = setInterval(
      () => {
        if (document.visibilityState === 'visible') void recheck()
      },
      status === 'offline' ? RECHECK_OFFLINE_MS : PROBE_INTERVAL_MS
    )
    return () => clearInterval(interval)
  }, [recheck, status])

  return { status, hardOffline, recheck }
}
