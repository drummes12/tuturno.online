import { useCallback, useEffect, useState } from 'react'
import { SERVICE_WORKER_UPDATE_EVENT } from '@/lib/service-worker'

export function useServiceWorkerUpdate() {
  const [registration, setRegistration] =
    useState<ServiceWorkerRegistration | null>(null)
  const [dismissed, setDismissed] = useState(false)
  const [updating, setUpdating] = useState(false)

  useEffect(() => {
    const handleUpdate = (event: Event) => {
      const nextRegistration = (event as CustomEvent<ServiceWorkerRegistration>)
        .detail
      if (!nextRegistration) return
      setRegistration(nextRegistration)
      setDismissed(false)
      setUpdating(false)
    }

    window.addEventListener(SERVICE_WORKER_UPDATE_EVENT, handleUpdate)

    if ('serviceWorker' in navigator) {
      void navigator.serviceWorker.ready.then((readyRegistration) => {
        if (navigator.serviceWorker.controller && readyRegistration.waiting) {
          setRegistration(readyRegistration)
        }
      })
    }

    return () => {
      window.removeEventListener(SERVICE_WORKER_UPDATE_EVENT, handleUpdate)
    }
  }, [])

  const applyUpdate = useCallback(() => {
    const waitingWorker = registration?.waiting
    if (!waitingWorker) return

    setUpdating(true)
    navigator.serviceWorker.addEventListener(
      'controllerchange',
      () => window.location.reload(),
      { once: true }
    )
    waitingWorker.postMessage({ type: 'SKIP_WAITING' })
  }, [registration])

  const dismissUpdate = useCallback(() => {
    setDismissed(true)
  }, [])

  return {
    updateAvailable: Boolean(registration) && !dismissed,
    updating,
    applyUpdate,
    dismissUpdate
  }
}
