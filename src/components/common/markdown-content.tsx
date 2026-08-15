/**
 * Renderer Markdown minimalista y seguro.
 * Ver lib/markdown.ts para el parser y la lógica de escape.
 */

import { useMemo } from 'react'
import { markdownToHtml } from '@/lib/markdown'

interface MarkdownContentProps {
  content: string
  className?: string
}

export function MarkdownContent({ content, className }: MarkdownContentProps) {
  const html = useMemo(() => markdownToHtml(content), [content])

  return (
    <div
      className={`text-sm text-(--color-text) leading-relaxed ${className ?? ''}`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}
