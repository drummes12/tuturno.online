import { useEffect, useState } from 'react'
import { Button } from '@/components/common/button'
import { DownloadIcon, XIcon } from '@/components/common/icon'
import { usePwaInstall } from '@/hooks/use-pwa-install'

export function PwaInstallPrompt() {
  const { canInstall, iosGuide, install } = usePwaInstall()
  const [dismissed, setDismissed] = useState(false)
  const [installing, setInstalling] = useState(false)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (!canInstall && !iosGuide) {
      setVisible(false)
      return
    }

    const timeout = window.setTimeout(() => setVisible(true), 1500)
    return () => window.clearTimeout(timeout)
  }, [canInstall, iosGuide])

  if (dismissed || !visible || (!canInstall && !iosGuide)) return null

  async function handleInstall() {
    setInstalling(true)
    const outcome = await install()
    setInstalling(false)
    if (outcome !== 'accepted') setDismissed(true)
  }

  return (
    <div className='w-full' role='dialog' aria-label='Instalar TuTurno'>
      <div className='flex items-center gap-3 rounded-2xl border border-pitch-300 bg-pitch-100 p-3 shadow-[0_12px_35px_rgba(4,33,15,0.2)]'>
        <span className='flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-white'>
          <DownloadIcon size={20} />
        </span>
        <div className='min-w-0 flex-1'>
          <p className='text-sm font-semibold text-(--color-text)'>
            Instala TuTurno
          </p>
          <p className='text-xs text-(--color-text-muted) mt-0.5'>
            {iosGuide
              ? 'En Safari, toca Compartir y luego “Añadir a pantalla de inicio”.'
              : 'Ten acceso rápido desde tu pantalla de inicio.'}
          </p>
        </div>
        <div className='flex shrink-0 items-center gap-1.5'>
          {canInstall && (
            <Button size='sm' loading={installing} onClick={handleInstall}>
              Instalar
            </Button>
          )}
          <button
            type='button'
            onClick={() => setDismissed(true)}
            className='inline-flex h-11 w-11 items-center justify-center rounded-lg text-(--color-text-muted) transition-colors hover:bg-pitch-200 hover:text-(--color-text) touch-target'
            aria-label='Cerrar aviso de instalación'
            title='Más tarde'
          >
            <XIcon size={18} />
          </button>
        </div>
      </div>
    </div>
  )
}
