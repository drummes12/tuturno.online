import type { InputHTMLAttributes } from 'react'
import { Input } from './input'
import { useNumberDraft } from '@/hooks/use-number-draft'

interface NumericProps {
  value: number
  onCommit: (n: number) => void
  /** Valor aplicado si el campo queda vacío o inválido al perder foco. */
  fallback: number
  min?: number
}

/**
 * Variante de Input para números: conserva un borrador de texto mientras
 * se edita (permite borrar todo) y normaliza al perder foco.
 */
export function NumberInput({
  label,
  hint,
  error,
  wrapperClassName,
  value,
  onCommit,
  fallback,
  min,
  ...props
}: {
  label: string
  hint?: string
  error?: string | null
  wrapperClassName?: string
} & NumericProps &
  Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'>) {
  const bind = useNumberDraft(value, onCommit, { fallback, min })
  return (
    <Input
      label={label}
      hint={hint}
      error={error}
      wrapperClassName={wrapperClassName}
      type='number'
      inputMode='numeric'
      min={min}
      {...props}
      {...bind}
    />
  )
}

/**
 * Mismo borrador para inputs crudos (sin label/hint), como los valores
 * personalizados junto a los preset grids.
 */
export function NumberDraftInput({
  value,
  onCommit,
  fallback,
  min,
  ...props
}: NumericProps &
  Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'>) {
  const bind = useNumberDraft(value, onCommit, { fallback, min })
  return <input type='number' inputMode='numeric' min={min} {...props} {...bind} />
}
