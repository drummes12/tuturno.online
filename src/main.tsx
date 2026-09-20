import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource/inter/400.css'
import '@fontsource/inter/500.css'
import '@fontsource/inter/600.css'
import '@fontsource/inter/700.css'
import '@fontsource/inter/800.css'

import './index.css'
import App from './App.tsx'
import { SERVICE_WORKER_UPDATE_EVENT } from '@/lib/service-worker'
import { initializePwaInstallPrompt } from '@/lib/pwa-install'

initializePwaInstallPrompt()

const notifyServiceWorkerUpdate = (registration: ServiceWorkerRegistration) => {
  if (!navigator.serviceWorker.controller || !registration.waiting) return

  window.dispatchEvent(
    new CustomEvent(SERVICE_WORKER_UPDATE_EVENT, {
      detail: registration
    })
  )
}

const watchServiceWorkerUpdate = (registration: ServiceWorkerRegistration) => {
  if (registration.waiting) {
    notifyServiceWorkerUpdate(registration)
  }

  registration.addEventListener('updatefound', () => {
    const installingWorker = registration.installing
    if (!installingWorker) return

    installingWorker.addEventListener('statechange', () => {
      if (installingWorker.state === 'installed') {
        notifyServiceWorkerUpdate(registration)
      }
    })
  })
}

const registerServiceWorker = async () => {
  if (!('serviceWorker' in navigator)) return

  try {
    const buildVersion = import.meta.env.VITE_BUILD_VERSION ?? 'dev'
    const registration = await navigator.serviceWorker.register(
      `/sw.js?version=${encodeURIComponent(buildVersion)}`,
      { scope: '/' }
    )
    watchServiceWorkerUpdate(registration)
    void registration.update().catch(() => undefined)
    console.info('[TuTurno] Service Worker registrado:', registration.scope)
  } catch (error) {
    console.error('[TuTurno] No se pudo registrar el Service Worker:', error)
  }
}

if ('serviceWorker' in navigator) {
  window.addEventListener(
    'load',
    () => {
      void registerServiceWorker()
    },
    { once: true }
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
