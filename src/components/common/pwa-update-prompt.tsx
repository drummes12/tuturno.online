import { Button } from '@/components/common/button'
import { RefreshIcon, XIcon } from '@/components/common/icon'
import { useServiceWorkerUpdate } from '@/hooks/use-service-worker-update'

export function PwaUpdatePrompt() {
  const { updateAvailable, updating, applyUpdate, dismissUpdate } =
    useServiceWorkerUpdate()

  if (!updateAvailable) return null

  return (
    <div
      className='fixed inset-x-0 bottom-4 z-50 px-4 sm:inset-x-auto sm:right-4 sm:w-[min(100%-2rem,28rem)]'
      role='alert'
      aria-live='polite'
    >
      <div className='flex items-center gap-3 rounded-2xl border border-pitch-300 bg-pitch-100 p-3 shadow-[0_12px_35px_rgba(4,33,15,0.2)]'>
        <span className='flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-white'>
          <RefreshIcon size={20} />
        </span>
        <div className='min-w-0 flex-1'>
          <p className='text-sm font-semibold text-(--color-text)'>
            Nueva versión disponible
          </p>
          <p className='text-xs text-(--color-text-muted) mt-0.5'>
            Actualiza TuTurno para usar las últimas mejoras.
          </p>
        </div>
        <div className='flex shrink-0 items-center gap-1.5'>
          <Button size='sm' loading={updating} onClick={applyUpdate}>
            Actualizar
          </Button>
          <button
            type='button'
            onClick={dismissUpdate}
            className='inline-flex h-11 w-11 items-center justify-center rounded-lg text-(--color-text-muted) transition-colors hover:bg-pitch-100 hover:text-(--color-text) touch-target'
            aria-label='Actualizar más tarde'
            title='Más tarde'
          >
            <XIcon size={18} />
          </button>
        </div>
      </div>
    </div>
  )
}
