import { useState, type ChangeEvent } from 'react'

/**
 * Borrador de texto para inputs numéricos controlados. Mientras el campo
 * está enfocado se muestra el texto crudo — puede quedar vacío y editarse
 * libre (el bug clásico: `parseInt(v) || fallback` reescribe el input en
 * cada tecla y nunca permite borrar del todo). Los valores válidos se
 * propagan en vivo; al perder foco se normaliza con `fallback` y `min`.
 */
export function useNumberDraft(
  value: number,
  onCommit: (n: number) => void,
  { fallback, min }: { fallback: number; min?: number }
) {
  const [draft, setDraft] = useState<string | null>(null)

  return {
    value: draft ?? String(value),
    onFocus: () => setDraft(String(value)),
    onChange: (e: ChangeEvent<HTMLInputElement>) => {
      const text = e.target.value
      setDraft(text)
      const n = parseInt(text, 10)
      if (!Number.isNaN(n)) onCommit(n)
    },
    onBlur: () => {
      if (draft === null) return
      const n = parseInt(draft, 10)
      const resolved = Number.isNaN(n)
        ? fallback
        : min === undefined
          ? n
          : Math.max(min, n)
      setDraft(null)
      if (resolved !== value) onCommit(resolved)
    }
  }
}
