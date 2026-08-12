import type { InputHTMLAttributes, ReactNode } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string
  error?: string | null
  hint?: string
  icon?: ReactNode
}

export function Input({ label, error, hint, icon, className = '', id, ...props }: InputProps) {
  const inputId = id ?? props.name ?? label.toLowerCase().replace(/\s+/g, '-')
  return (
    <div className='flex flex-col gap-1.5'>
      <label
        htmlFor={inputId}
        className='text-sm font-medium text-(--color-text) tracking-tight'
      >
        {label}
      </label>
      <div className='relative'>
        {icon && (
          <span className='absolute left-3.5 top-1/2 -translate-y-1/2 text-(--color-text-muted)'>
            {icon}
          </span>
        )}
        <input
          id={inputId}
          className={`w-full rounded-xl border bg-surface-inset px-4 py-3 text-base text-(--color-text) placeholder:text-(--color-text-muted) focus:bg-surface-elevated focus:border-(--color-primary) focus:outline-none focus:ring-4 focus:ring-(--color-primary)/15 transition-all duration-200 ease-spring ${
            icon ? 'pl-11' : ''
          } ${error ? 'border-(--color-danger) focus:border-(--color-danger) focus:ring-(--color-danger)/15' : 'border-border'} ${className}`}
          aria-invalid={!!error}
          aria-describedby={
            error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined
          }
          {...props}
        />
      </div>
      {error ? (
        <p
          id={`${inputId}-error`}
          className='text-sm text-(--color-danger) flex items-center gap-1.5'
        >
          <svg
            width='14'
            height='14'
            viewBox='0 0 24 24'
            fill='none'
            stroke='currentColor'
            strokeWidth='2.5'
            strokeLinecap='round'
            strokeLinejoin='round'
            aria-hidden='true'
          >
            <circle cx='12' cy='12' r='10' />
            <line x1='12' y1='8' x2='12' y2='12' />
            <line x1='12' y1='16' x2='12.01' y2='16' />
          </svg>
          {error}
        </p>
      ) : hint ? (
        <p id={`${inputId}-hint`} className='text-sm text-(--color-text-muted)'>
          {hint}
        </p>
      ) : null}
    </div>
  )
}
