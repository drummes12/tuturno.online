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
    <div className="flex flex-col gap-1.5">
      <label htmlFor={inputId} className="text-sm font-medium text-[var(--color-text)]">
        {label}
      </label>
      <div className="relative">
        {icon && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]">
            {icon}
          </span>
        )}
        <input
          id={inputId}
          className={`w-full rounded-lg border bg-[var(--color-surface-inset)] px-4 py-3 text-base text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] focus:bg-[var(--color-surface-elevated)] focus:border-[var(--color-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20 transition-colors ${
            icon ? 'pl-10' : ''
          } ${error ? 'border-[var(--color-danger)] focus:border-[var(--color-danger)] focus:ring-[var(--color-danger)]/20' : 'border-[var(--color-border)]'} ${className}`}
          aria-invalid={!!error}
          aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
          {...props}
        />
      </div>
      {error ? (
        <p id={`${inputId}-error`} className="text-sm text-[var(--color-danger)]">
          {error}
        </p>
      ) : hint ? (
        <p id={`${inputId}-hint`} className="text-sm text-[var(--color-text-muted)]">
          {hint}
        </p>
      ) : null}
    </div>
  )
}
