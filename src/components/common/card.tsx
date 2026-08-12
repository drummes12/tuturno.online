import type { ReactNode } from 'react'

interface CardProps {
  children: ReactNode
  className?: string
  elevated?: boolean
}

export function Card({ children, className = '', elevated = false }: CardProps) {
  return (
    <div
      className={`rounded-lg bg-surface-elevated border border-border ${
        elevated ? 'shadow-(--shadow-md)' : 'shadow-(--shadow-xs)'
      } ${className}`}
    >
      {children}
    </div>
  )
}
