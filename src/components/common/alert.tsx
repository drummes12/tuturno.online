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
    container: 'bg-red-50 border-red-200 text-red-800',
    icon: <AlertIcon size={18} />
  },
  warning: {
    container: 'bg-yellow-50 border-yellow-200 text-yellow-800',
    icon: <AlertIcon size={18} />
  },
  info: {
    container: 'bg-blue-50 border-blue-200 text-blue-800',
    icon: <InfoIcon size={18} />
  },
  success: {
    container:
      'bg-pitch-100 border-pitch-300 text-pitch-800',
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
      className='flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 text-red-800 px-4 py-3 text-sm animate-fade-up'
    >
      <AlertIcon size={18} className='shrink-0 mt-0.5' />
      <span className='flex-1'>{message}</span>
      {onDismiss && (
        <button
          onClick={onDismiss}
          className='shrink-0 text-red-600 hover:text-red-800 transition-colors touch-target -mr-1 -mt-1'
          aria-label='Cerrar error'
        >
          <XIcon size={16} />
        </button>
      )}
    </div>
  )
}
