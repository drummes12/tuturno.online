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

// Retiro del splash de boot: con red rápida React monta en un
// instante y el splash sería un destello, así que se garantiza un
// mínimo visible y luego se retira con crossfade — View Transitions
// donde hay soporte, fade CSS como respaldo. El logo del splash se
// convierte en el logo del nav (elemento compartido 'app-logo').
const MIN_BOOT_MS = 300
// Beat de "carga satisfactoria": los dígitos se clavan en 12:12 y un
// check mint aparece en el logo antes de que viaje al nav.
const BOOT_BEAT_MS = 320
const bootStart =
  (window as unknown as { __bootStart?: number }).__bootStart ??
  performance.now()

interface ViewTransitionLike {
  finished: Promise<void>
}

function dismissBoot() {
  const boot = document.getElementById('boot')
  if (!boot) return

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const startViewTransition = (
    document as Document & {
      startViewTransition?: (update: () => void) => ViewTransitionLike
    }
  ).startViewTransition

  const finish = () => {
    if (!startViewTransition || reduced) {
      boot.classList.add('boot-out')
      setTimeout(() => boot.remove(), 400)
      return
    }

    // El view-transition-name se asigna en caliente: si ambos logos lo
    // tuvieran a la vez en el DOM, Chrome abortaría la transición por
    // nombre duplicado. El boot img lo lleva en el snapshot viejo y el
    // nav img en el nuevo → morph de splash al nav.
    const bootImg = boot.querySelector('img')
    const navLogo = document.querySelector<HTMLElement>('[data-nav-logo]')
    const canMorph = Boolean(bootImg && navLogo)
    if (canMorph) bootImg!.style.viewTransitionName = 'app-logo'

    const transition = startViewTransition.call(document, () => {
      boot.remove()
      if (canMorph) navLogo!.style.viewTransitionName = 'app-logo'
    })

    // Al terminar se limpia el nombre para no chocar con futuras VTs.
    const cleanup = () => {
      if (navLogo) navLogo.style.viewTransitionName = ''
    }
    transition.finished.then(cleanup, cleanup)
  }

  if (reduced) {
    finish()
    return
  }

  boot.classList.add('boot-done')
  setTimeout(finish, BOOT_BEAT_MS)
}

const remaining = Math.max(0, MIN_BOOT_MS - (performance.now() - bootStart))
setTimeout(dismissBoot, remaining)
