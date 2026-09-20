import { Button } from '@/components/common/button'
import { RefreshIcon, XIcon } from '@/components/common/icon'
import { useServiceWorkerUpdate } from '@/hooks/use-service-worker-update'

export function PwaUpdatePrompt() {
  const { updateAvailable, updating, applyUpdate, dismissUpdate } =
    useServiceWorkerUpdate()

  if (!updateAvailable) return null

  return (
    <div className='w-full' role='alert' aria-live='polite'>
      <div className='flex items-center gap-3 rounded-2xl border border-border-strong bg-surface-elevated p-3 shadow-(--shadow-lg)'>
        <span className='flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-on-primary'>
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
            className='inline-flex h-11 w-11 items-center justify-center rounded-lg text-(--color-text-muted) transition-colors hover:bg-surface-inset hover:text-(--color-text) touch-target'
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
