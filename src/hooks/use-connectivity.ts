import { useEffect } from 'react'
import { create } from 'zustand'

export type Connectivity = 'online' | 'degraded' | 'offline'

// Latencia del sondeo a partir de la cual la conexión se reporta "lenta".
const DEGRADED_MS = 3000
// Tiempo offline sostenido antes de declarar "sin conexión" duro —
// filtra microcortes de WiFi/datos que se resuelven solos en segundos.
const OFFLINE_GRACE_MS = 3000
// Intervalo de sondeo (solo con pestaña visible). Cubre la recuperación
// cuando el evento 'online' no dispara — frecuente en iOS/Safari — y
// detecta degradación de red estando nominalmente online. Offline se
// re-sondea más rápido para que la UI se restaure pronto al volver.
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
// sondeo dejaría el estado pegado en offline con red funcionando.
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

interface ConnectivityStore {
  status: Connectivity
  // offline sostenido: lo usa AppLayout para decidir pantalla completa
  // (visitante) vs modo solo-lectura (autenticado).
  hardOffline: boolean
}

// Store singleton: varios componentes consumen el estado sin duplicar
// listeners ni sondeos.
export const useConnectivityStore = create<ConnectivityStore>(() => ({
  status: navigator.onLine ? 'online' : 'offline',
  hardOffline: false
}))

let graceTimer: ReturnType<typeof setTimeout> | undefined
let probeTimer: ReturnType<typeof setTimeout> | undefined
let initialized = false

function apply(next: Connectivity) {
  if (next === 'offline') {
    graceTimer ??= setTimeout(
      () => useConnectivityStore.setState({ hardOffline: true }),
      OFFLINE_GRACE_MS
    )
  } else {
    clearTimeout(graceTimer)
    graceTimer = undefined
    useConnectivityStore.setState({ hardOffline: false })
  }
  useConnectivityStore.setState({ status: next })
  scheduleProbe()
}

export async function recheckConnectivity() {
  apply(await probe())
}

// Sondeo periódico auto-reprogramado: cadencia rápida mientras esté
// offline, normal cuando está sano.
function scheduleProbe() {
  clearTimeout(probeTimer)
  const { status } = useConnectivityStore.getState()
  probeTimer = setTimeout(
    tick,
    status === 'offline' ? RECHECK_OFFLINE_MS : PROBE_INTERVAL_MS
  )
}

async function tick() {
  if (document.visibilityState === 'visible') await recheckConnectivity()
  else scheduleProbe()
}

function initConnectivity() {
  if (initialized) return
  initialized = true

  // El evento 'offline' muestra el indicador de inmediato, pero se
  // confirma con un sondeo — navigator.onLine puede mentir.
  window.addEventListener('offline', () => {
    apply('offline')
    void recheckConnectivity()
  })
  window.addEventListener('online', () => void recheckConnectivity())
  getConnection()?.addEventListener?.(
    'change',
    () => void recheckConnectivity()
  )

  // Sondeo inicial + ciclo periódico.
  void recheckConnectivity()
  scheduleProbe()
}

export function useConnectivity() {
  const state = useConnectivityStore()
  useEffect(() => initConnectivity(), [])
  return { ...state, recheck: recheckConnectivity }
}

/** Solo lectura del flag — para deshabilitar mutaciones mientras no haya red. */
export function useIsOffline() {
  useEffect(() => initConnectivity(), [])
  return useConnectivityStore((s) => s.status === 'offline')
}
