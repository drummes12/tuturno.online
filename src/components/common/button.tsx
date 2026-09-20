import type { ButtonHTMLAttributes, CSSProperties, ReactNode } from 'react'

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
    'bg-primary text-on-primary hover:bg-primary-hover active:bg-pitch-900 shadow-(--shadow-pitch) hover:shadow-lg active:shadow-sm',
  secondary:
    'bg-surface-elevated text-text border border-border-strong hover:bg-surface-inset hover:border-graphite-300',
  ghost: 'bg-transparent text-text hover:bg-surface-inset',
  danger:
    'bg-danger text-white hover:bg-red-700 active:bg-red-800 shadow-sm hover:shadow-md',
  success:
    'bg-success text-on-primary hover:bg-pitch-700 active:bg-pitch-800 shadow-(--shadow-pitch)'
}

const sizeClasses: Record<Size, string> = {
  sm: 'text-sm px-3.5 py-2 rounded-md gap-1.5 font-medium',
  md: 'text-base px-5 py-2.5 rounded-md gap-2 font-medium',
  lg: 'text-lg px-6 py-3.5 rounded-lg gap-2 font-semibold'
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
      className={`inline-flex items-center justify-center font-medium transition-all duration-200 ease-spring touch-target select-none active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100 ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <span
          className='arc-loader'
          aria-hidden='true'
          style={{ '--arc-size': `${16 / 48}px` } as CSSProperties}
        />
      )}
      {children}
    </button>
  )
}
