import { useState } from 'react'
import PhoneInputBase from 'react-phone-number-input'
import type { Country } from 'react-phone-number-input'
import 'react-phone-number-input/style.css'

interface PhoneInputProps {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  hint?: string
  error?: string | null
  required?: boolean
  defaultCountry?: Country
  /** Cuando es true, el campo puede estar vacío sin marcar error */
  optional?: boolean
  disabled?: boolean
}

export function PhoneInput({
  label,
  value,
  onChange,
  placeholder = '300 123 4567',
  hint,
  error,
  required,
  defaultCountry = 'CO',
  optional,
  disabled
}: PhoneInputProps) {
  const [touched, setTouched] = useState(false)
  const inputId = `phone-${label.toLowerCase().replace(/\s+/g, '-')}`

  // react-phone-number-input usa '' para vacío, pero nosotros usamos string
  const handleChange = (val: string | undefined) => {
    onChange(val ?? '')
  }

  const showError = error ?? (touched && required && !value && !optional)

  return (
    <div className='flex flex-col gap-1.5'>
      <label
        htmlFor={inputId}
        className='text-sm font-medium text-(--color-text) tracking-tight'
      >
        {label}
      </label>
      <PhoneInputBase
        id={inputId}
        international
        defaultCountry={defaultCountry}
        value={value || undefined}
        onChange={handleChange}
        onBlur={() => setTouched(true)}
        placeholder={placeholder}
        required={required}
        disabled={disabled}
        className={`tuturno-phone-input ${
          showError ? 'tuturno-phone-input--error' : ''
        }`}
      />
      {showError ? (
        <p className='text-sm text-(--color-danger) flex items-center gap-1.5'>
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
          {error ?? 'El teléfono es obligatorio.'}
        </p>
      ) : hint ? (
        <p className='text-sm text-(--color-text-muted)'>{hint}</p>
      ) : null}
    </div>
  )
}
