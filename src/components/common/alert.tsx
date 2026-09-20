import type { ReactNode } from 'react'
import { AlertIcon, InfoIcon, CheckIcon, XIcon } from './icon'

type AlertVariant = 'error' | 'info' | 'success' | 'warning'

interface AlertProps {
  variant: AlertVariant
  children: ReactNode
  className?: string
  onDismiss?: () => void
}

const variantConfig: Record<
  AlertVariant,
  { container: string; icon: ReactNode }
> = {
  error: {
    container:
      'border-signal-red/40 bg-signal-red/10 text-signal-red dark:border-red-400/30 dark:bg-red-400/10 dark:text-red-300',
    icon: <AlertIcon size={18} />
  },
  warning: {
    container:
      'border-orange-500/40 bg-orange-500/10 text-orange-700 dark:border-orange-400/30 dark:bg-orange-400/10 dark:text-orange-300',
    icon: <AlertIcon size={18} />
  },
  info: {
    container:
      'border-signal-blue/40 bg-signal-blue/10 text-signal-blue dark:border-blue-400/30 dark:bg-blue-400/10 dark:text-blue-300',
    icon: <InfoIcon size={18} />
  },
  success: {
    container:
      'border-pitch-500/40 bg-pitch-500/10 text-pitch-700 dark:border-pitch-400/30 dark:bg-pitch-400/10 dark:text-pitch-300',
    icon: <CheckIcon size={18} />
  }
}

export function Alert({
  variant,
  children,
  className = '',
  onDismiss
}: AlertProps) {
  const config = variantConfig[variant]
  return (
    <div
      role='alert'
      className={`flex items-start gap-2.5 rounded-xl border px-4 py-3 text-sm ${config.container} ${className}`}
    >
      <span className='shrink-0 mt-0.5'>{config.icon}</span>
      <div className='flex-1'>{children}</div>
      {onDismiss && (
        <button
          onClick={onDismiss}
          className='shrink-0 -mr-1 -mt-1 opacity-60 hover:opacity-100 transition-opacity touch-target rounded'
          aria-label='Cerrar'
        >
          <XIcon size={16} />
        </button>
      )}
    </div>
  )
}

/** Inline toast-style error that replaces window.alert */
export function ErrorBanner({
  message,
  onDismiss
}: {
  message: string
  onDismiss?: () => void
}) {
  return (
    <div
      role='alert'
      className='flex items-start gap-2.5 rounded-xl border border-signal-red/40 bg-signal-red/10 px-4 py-3 text-sm text-signal-red animate-fade-up dark:border-red-400/30 dark:bg-red-400/10 dark:text-red-300'
    >
      <AlertIcon size={18} className='shrink-0 mt-0.5' />
      <span className='flex-1'>{message}</span>
      {onDismiss && (
        <button
          onClick={onDismiss}
          className='shrink-0 opacity-60 transition-opacity hover:opacity-100 touch-target -mr-1 -mt-1'
          aria-label='Cerrar error'
        >
          <XIcon size={16} />
        </button>
      )}
    </div>
  )
}
