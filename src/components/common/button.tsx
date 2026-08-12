import type { ButtonHTMLAttributes, ReactNode } from 'react'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'success'
type Size = 'sm' | 'md' | 'lg'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  loading?: boolean
  children: ReactNode
}

const variantClasses: Record<Variant, string> = {
  primary:
    'bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-hover)] active:bg-[var(--color-pitch-900)]',
  secondary:
    'bg-[var(--color-surface-elevated)] text-[var(--color-text)] border border-[var(--color-border-strong)] hover:bg-[var(--color-surface-inset)]',
  ghost: 'bg-transparent text-[var(--color-text)] hover:bg-[var(--color-surface-inset)]',
  danger: 'bg-[var(--color-danger)] text-white hover:bg-red-700 active:bg-red-800',
  success: 'bg-[var(--color-success)] text-white hover:bg-[var(--color-pitch-700)]',
}

const sizeClasses: Record<Size, string> = {
  sm: 'text-sm px-3 py-2 rounded-md gap-1.5',
  md: 'text-base px-4 py-2.5 rounded-lg gap-2',
  lg: 'text-lg px-6 py-3 rounded-lg gap-2',
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled,
  children,
  className = '',
  ...props
}: ButtonProps) {
  return (
    <button
      className={`inline-flex items-center justify-center font-medium transition-colors touch-target disabled:opacity-50 disabled:cursor-not-allowed ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <svg
          className="animate-spin h-4 w-4"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
          />
        </svg>
      )}
      {children}
    </button>
  )
}
