import type { AnchorHTMLAttributes, MouseEvent, ReactNode } from 'react'
import { useLocation } from 'wouter'
import { navigateWithTransition } from '@/lib/view-transition'

/**
 * Ancla interna que navega envuelta en una View Transition nativa.
 * Respeta clicks con modificadores (nueva pestaña) y reduced-motion.
 */
export function TransitionLink({
  href,
  children,
  onClick,
  ...rest
}: {
  href: string
  children: ReactNode
} & AnchorHTMLAttributes<HTMLAnchorElement>) {
  const [, navigate] = useLocation()

  function handleClick(e: MouseEvent<HTMLAnchorElement>) {
    onClick?.(e)
    if (
      e.defaultPrevented ||
      e.button !== 0 ||
      e.metaKey ||
      e.ctrlKey ||
      e.shiftKey ||
      e.altKey
    ) {
      return
    }
    e.preventDefault()
    navigateWithTransition(navigate, href)
  }

  return (
    <a href={href} onClick={handleClick} {...rest}>
      {children}
    </a>
  )
}
