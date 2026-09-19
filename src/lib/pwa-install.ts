export type PwaInstallOutcome = 'accepted' | 'dismissed' | 'unavailable'

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
}

type PwaInstallListener = () => void

type RelatedApplication = {
  platform?: string
}

type NavigatorWithRelatedApps = Navigator & {
  getInstalledRelatedApps?: () => Promise<RelatedApplication[]>
}

let deferredPrompt: BeforeInstallPromptEvent | null = null
let installedElsewhere = false
let initialized = false
const listeners = new Set<PwaInstallListener>()

export function initializePwaInstallPrompt() {
  if (initialized || typeof window === 'undefined') return
  initialized = true

  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault()
    deferredPrompt = event as BeforeInstallPromptEvent
    listeners.forEach((listener) => listener())
  })

  window.addEventListener('appinstalled', () => {
    deferredPrompt = null
    listeners.forEach((listener) => listener())
  })

  void detectPwaInstalledElsewhere()
}

async function detectPwaInstalledElsewhere() {
  if (isPwaInstalled()) return

  const relatedAppsNavigator = navigator as NavigatorWithRelatedApps
  if (typeof relatedAppsNavigator.getInstalledRelatedApps !== 'function') return

  try {
    const apps = await relatedAppsNavigator.getInstalledRelatedApps()
    installedElsewhere = apps.some((app) => app.platform === 'webapp')
  } catch {
    installedElsewhere = false
  }
  if (installedElsewhere) {
    listeners.forEach((listener) => listener())
  }
}

export function subscribeToPwaInstall(listener: PwaInstallListener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function canPromptPwaInstall() {
  return deferredPrompt !== null
}

export async function promptPwaInstall(): Promise<PwaInstallOutcome> {
  if (!deferredPrompt) return 'unavailable'

  const promptEvent = deferredPrompt
  deferredPrompt = null
  await promptEvent.prompt()
  const { outcome } = await promptEvent.userChoice
  listeners.forEach((listener) => listener())
  return outcome
}

export function isPwaInstalled() {
  if (typeof window === 'undefined') return false

  const safariNavigator = navigator as Navigator & { standalone?: boolean }
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    safariNavigator.standalone === true
  )
}

export function isPwaInstalledElsewhere() {
  return installedElsewhere && !isPwaInstalled()
}

export function isIosDevice() {
  if (typeof navigator === 'undefined') return false

  return /iphone|ipad|ipod/i.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
}
