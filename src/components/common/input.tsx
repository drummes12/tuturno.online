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
        className='text-sm font-medium text-(--color-text)'
      >
        {label}
      </label>
      <div className='relative'>
        {icon && (
          <span className='absolute left-3 top-1/2 -translate-y-1/2 text-(--color-text-muted)'>
            {icon}
          </span>
        )}
        <input
          id={inputId}
          className={`w-full rounded-lg border bg-surface-inset px-4 py-3 text-base text-(--color-text) placeholder:text-(--color-text-muted) focus:bg-surface-elevated focus:border-(--color-primary) focus:outline-none focus:ring-2 focus:ring-(--color-primary)/20 transition-colors ${
            icon ? 'pl-10' : ''
          } ${error ? 'border-(--color-danger) focus:border-(--color-danger) focus:ring-(--color-danger)/20' : 'border-border'} ${className}`}
          aria-invalid={!!error}
          aria-describedby={
            error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined
          }
          {...props}
        />
      </div>
      {error ? (
        <p id={`${inputId}-error`} className='text-sm text-(--color-danger)'>
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
