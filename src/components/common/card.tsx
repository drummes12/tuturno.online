import type { CSSProperties, ReactNode } from 'react'

interface CardProps {
  children: ReactNode
  className?: string
  elevated?: boolean
  bordered?: boolean
  style?: CSSProperties
}

export function Card({
  children,
  className = '',
  elevated = false,
  bordered = true,
  style
}: CardProps) {
  return (
    <div
      style={style}
      className={`rounded-xl bg-surface-elevated ${
        bordered ? 'border border-border' : ''
      } ${
        elevated ? 'shadow-(--shadow-md)' : 'shadow-(--shadow-xs)'
      } transition-shadow duration-300 ease-spring ${className}`}
    >
      {children}
    </div>
  )
}
