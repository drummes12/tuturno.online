import { LockIcon } from '@/components/common/icon'

/**
 * Banner informativo para managers: pueden ver pero no editar.
 * Se muestra en páginas donde solo el owner puede hacer cambios.
 */
export function ReadOnlyNotice() {
  return (
    <div className='flex items-center gap-2.5 rounded-xl border border-flood-500/40 bg-flood-500/10 px-4 py-3 text-sm text-yellow-700 dark:border-flood-400/30 dark:bg-flood-400/10 dark:text-flood-300'>
      <LockIcon size={16} className='shrink-0' />
      <p>
        Solo el propietario puede modificar esta sección. Tu rol es
        <strong> manager</strong>: puedes ver pero no editar.
      </p>
    </div>
  )
}
