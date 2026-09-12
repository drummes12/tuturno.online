import { useCallback, useEffect, useState } from 'react'
import {
  canPromptPwaInstall,
  initializePwaInstallPrompt,
  isIosDevice,
  isPwaInstalled,
  promptPwaInstall,
  subscribeToPwaInstall,
  type PwaInstallOutcome
} from '@/lib/pwa-install'

export function usePwaInstall() {
  const [, refresh] = useState(0)

  useEffect(() => {
    initializePwaInstallPrompt()
    const unsubscribe = subscribeToPwaInstall(() =>
      refresh((value) => value + 1)
    )
    return () => {
      unsubscribe()
    }
  }, [])

  const install = useCallback((): Promise<PwaInstallOutcome> => {
    return promptPwaInstall()
  }, [])

  const installed = isPwaInstalled()
  const iosGuide = isIosDevice() && !installed && !canPromptPwaInstall()

  return {
    canInstall: !installed && canPromptPwaInstall(),
    iosGuide,
    install
  }
}
