import type { ReactNode } from 'react'

interface CardProps {
  children: ReactNode
  className?: string
  elevated?: boolean
}

export function Card({ children, className = '', elevated = false }: CardProps) {
  return (
    <div
      className={`rounded-[var(--radius-lg)] bg-[var(--color-surface-elevated)] border border-[var(--color-border)] ${
        elevated ? 'shadow-[var(--shadow-md)]' : 'shadow-[var(--shadow-xs)]'
      } ${className}`}
    >
      {children}
    </div>
  )
}
