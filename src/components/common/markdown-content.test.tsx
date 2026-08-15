import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MarkdownContent } from './markdown-content'
import { parseMarkdown, escapeHtml } from '@/lib/markdown'

describe('escapeHtml', () => {
  it('escapa caracteres peligrosos', () => {
    expect(escapeHtml('<script>alert(1)</script>')).toBe(
      '&lt;script&gt;alert(1)&lt;/script&gt;'
    )
  })

  it('escapa comillas y ampersand', () => {
    expect(escapeHtml('"a" & \'b\'')).toBe('&quot;a&quot; &amp; &#39;b&#39;')
  })
})

describe('parseMarkdown', () => {
  it('parsea encabezados h1, h2, h3', () => {
    const blocks = parseMarkdown('# T1\n## T2\n### T3')
    expect(blocks).toEqual([
      { type: 'h1', text: 'T1' },
      { type: 'h2', text: 'T2' },
      { type: 'h3', text: 'T3' }
    ])
  })

  it('parsea lista no ordenada', () => {
    const blocks = parseMarkdown('- Uno\n- Dos\n- Tres')
    expect(blocks).toEqual([
      {
        type: 'ul',
        items: [
          { text: 'Uno', children: [] },
          { text: 'Dos', children: [] },
          { text: 'Tres', children: [] }
        ]
      }
    ])
  })

  it('parsea lista ordenada', () => {
    const blocks = parseMarkdown('1. Primero\n2. Segundo')
    expect(blocks).toEqual([
      {
        type: 'ol',
        items: [
          { text: 'Primero', children: [] },
          { text: 'Segundo', children: [] }
        ]
      }
    ])
  })

  it('parsea lista anidada (ol con sub-lista ul)', () => {
    const blocks = parseMarkdown('1. Primero\n  - Sub A\n  - Sub B\n2. Segundo')
    expect(blocks).toEqual([
      {
        type: 'ol',
        items: [
          {
            text: 'Primero',
            children: [
              { text: 'Sub A', children: [] },
              { text: 'Sub B', children: [] }
            ]
          },
          { text: 'Segundo', children: [] }
        ]
      }
    ])
  })

  it('parsea párrafo multilínea', () => {
    const blocks = parseMarkdown('Hola\nmundo')
    expect(blocks).toEqual([{ type: 'p', text: 'Hola mundo' }])
  })

  it('separa bloques con líneas vacías', () => {
    const blocks = parseMarkdown('Párrafo\n\n# Título')
    expect(blocks).toEqual([
      { type: 'p', text: 'Párrafo' },
      { type: 'h1', text: 'Título' }
    ])
  })
})

describe('MarkdownContent', () => {
  it('renderiza encabezados', () => {
    render(<MarkdownContent content='## Título' />)
    expect(screen.getByText('Título').tagName).toBe('H2')
  })

  it('renderiza listas ordenadas', () => {
    render(<MarkdownContent content={'1. Uno\n2. Dos'} />)
    const items = screen.getAllByRole('listitem')
    expect(items).toHaveLength(2)
    expect(items[0].textContent).toBe('Uno')
    expect(items[1].textContent).toBe('Dos')
  })

  it('renderiza listas no ordenadas', () => {
    render(<MarkdownContent content={'- A\n- B'} />)
    const items = screen.getAllByRole('listitem')
    expect(items).toHaveLength(2)
    expect(items[0].textContent).toBe('A')
    expect(items[1].textContent).toBe('B')
  })

  it('renderiza listas anidadas (ol con sub-ul)', () => {
    const { container } = render(
      <MarkdownContent
        content={'1. Primero\n  - Sub A\n  - Sub B\n2. Segundo'}
      />
    )
    // Debe haber un <ol> con 2 <li> top-level
    const ol = container.querySelector('ol')
    expect(ol).not.toBeNull()
    const topItems = ol!.querySelectorAll(':scope > li')
    expect(topItems).toHaveLength(2)

    // El primer <li> contiene "Primero" y un <ul> anidado con 2 sub-items
    expect(topItems[0].textContent).toContain('Primero')
    const subUl = topItems[0].querySelector('ul')
    expect(subUl).not.toBeNull()
    const subItems = subUl!.querySelectorAll('li')
    expect(subItems).toHaveLength(2)
    expect(subItems[0].textContent).toBe('Sub A')
    expect(subItems[1].textContent).toBe('Sub B')

    // El segundo <li> es "Segundo" sin sub-lista
    expect(topItems[1].textContent).toBe('Segundo')
    expect(topItems[1].querySelector('ul')).toBeNull()
  })

  it('renderiza negrita', () => {
    render(<MarkdownContent content='Texto **importante**' />)
    const strong = document.querySelector('strong')
    expect(strong).not.toBeNull()
    expect(strong!.textContent).toBe('importante')
  })

  it('renderiza enlaces con target _blank', () => {
    render(<MarkdownContent content='[Enlace](https://example.com)' />)
    const link = screen.getByText('Enlace')
    expect(link.tagName).toBe('A')
    expect(link).toHaveAttribute('href', 'https://example.com')
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', 'noopener noreferrer')
  })

  it('NO renderiza enlaces con javascript: scheme', () => {
    const { container } = render(
      <MarkdownContent content='[Click](javascript:alert(1))' />
    )
    // El enlace no se procesa porque no matchea http/https/mailto
    expect(container.querySelector('a')).toBeNull()
  })

  it('escapa HTML crudo (no ejecuta script)', () => {
    render(<MarkdownContent content='<script>alert(1)</script>' />)
    expect(document.querySelector('script')).toBeNull()
    expect(screen.getByText('<script>alert(1)</script>')).toBeTruthy()
  })

  it('escapa intentos de XSS en enlaces', () => {
    render(
      <MarkdownContent content='[Test](https://evil.com" onmouseover="alert(1))' />
    )
    // El regex de enlace no matchea porque hay comillas dentro de la URL
    expect(document.querySelector('a')).toBeNull()
  })

  it('preserva emojis', () => {
    render(<MarkdownContent content='🎉 ¡Reserva confirmada!' />)
    expect(screen.getByText('🎉 ¡Reserva confirmada!')).toBeTruthy()
  })

  it('renderiza contenido vacío sin error', () => {
    const { container } = render(<MarkdownContent content='' />)
    expect(container.firstChild).not.toBeNull()
  })
})
