import { LockIcon } from '@/components/common/icon'

/**
 * Banner informativo para managers: pueden ver pero no editar.
 * Se muestra en páginas donde solo el owner puede hacer cambios.
 */
export function ReadOnlyNotice() {
  return (
    <div className='flex items-center gap-2.5 rounded-xl border border-orange-500/40 bg-orange-500/10 px-4 py-3 text-sm text-orange-700 dark:border-orange-400/30 dark:bg-orange-400/10 dark:text-orange-300'>
      <LockIcon size={16} className='shrink-0' />
      <p>
        Solo el propietario puede modificar esta sección. Tu rol es
        <strong> manager</strong>: puedes ver pero no editar.
      </p>
    </div>
  )
}
