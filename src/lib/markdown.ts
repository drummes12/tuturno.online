/**
 * Parser Markdown minimalista y seguro.
 *
 * Soporta: encabezados (h1-h3), listas ordenadas/no ordenadas con anidamiento,
 * negrita, enlaces, párrafos y emojis nativos. NO soporta HTML crudo: todo el
 * texto se escapa antes de aplicar formato, evitando XSS.
 *
 * Diseñado para instrucciones cortas de negocios (máx 1000 caracteres).
 */

/** Escapa caracteres HTML peligrosos. */
export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/** Procesa inline: negrita y enlaces dentro de un texto ya escapado. */
export function renderInline(escaped: string): string {
  // Negrita: **texto**
  let result = escaped.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
  // Enlaces: [texto](url) — solo http/https/mailto
  result = result.replace(
    /\[([^\]]+)\]\((https?:\/\/[^\s)]+|mailto:[^\s)]+)\)/g,
    '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-primary hover:underline">$1</a>'
  )
  return result
}

export interface ListItem {
  text: string
  children: ListItem[]
}

export interface ParsedBlock {
  type: 'h1' | 'h2' | 'h3' | 'ul' | 'ol' | 'p'
  items?: ListItem[]
  text?: string
}

/** Detecta el nivel de indentación (número de espacios) de una línea. */
function indentLevel(line: string): number {
  const match = line.match(/^(\s*)/)
  return match ? match[1].length : 0
}

/** Detecta si una línea es un item de lista y devuelve su tipo y contenido. */
function matchListItem(
  line: string
): { ordered: boolean; content: string } | null {
  const trimmed = line.trimStart()
  // Lista no ordenada: - o * seguido de espacio
  const ul = trimmed.match(/^[-*]\s+(.+)$/)
  if (ul) return { ordered: false, content: ul[1] }
  // Lista ordenada: 1. 2. etc.
  const ol = trimmed.match(/^\d+\.\s+(.+)$/)
  if (ol) return { ordered: true, content: ol[1] }
  return null
}

/**
 * Parsea un grupo de líneas como una lista (posiblemente anidada).
 * Retorna los items parseados y el índice de la siguiente línea no consumida.
 */
function parseList(
  lines: string[],
  startIndex: number,
  baseIndent: number
): { items: ListItem[]; nextIndex: number } {
  const items: ListItem[] = []
  let i = startIndex

  while (i < lines.length) {
    const line = lines[i]
    const indent = indentLevel(line)
    const item = matchListItem(line)

    // No es item de lista o está a menor indentación → fin de esta lista
    if (!item || indent < baseIndent) break

    // Mayor indentación → debería haberse procesado como hijo del item anterior
    if (indent > baseIndent) {
      i++
      continue
    }

    // Mismo nivel: nuevo item
    const newItem: ListItem = {
      text: item.content.trim(),
      children: []
    }

    i++

    // Buscar sub-items (mayor indentación)
    if (i < lines.length && indentLevel(lines[i]) > baseIndent) {
      const sub = parseList(lines, i, indentLevel(lines[i]))
      newItem.children = sub.items
      i = sub.nextIndex
    }

    items.push(newItem)
  }

  return { items, nextIndex: i }
}

/** Renderiza una lista (ul/ol) con sus items y sub-listas anidadas. */
function renderList(items: ListItem[], ordered: boolean): string {
  const tag = ordered ? 'ol' : 'ul'
  const cls = ordered
    ? 'list-decimal pl-5 my-1 space-y-0.5'
    : 'list-disc pl-5 my-1 space-y-0.5'

  const html = items
    .map((item) => {
      const content = renderInline(escapeHtml(item.text))
      if (item.children.length > 0) {
        // Sub-lista: el tipo opuesto si es un solo nivel de anidamiento,
        // o mantener el mismo tipo si son múltiples niveles del mismo tipo
        const subOrdered = !ordered // alternar ul/ol para claridad visual
        return `<li>${content}${renderList(item.children, subOrdered)}</li>`
      }
      return `<li>${content}</li>`
    })
    .join('')

  return `<${tag} class="${cls}">${html}</${tag}>`
}

/** Parsea Markdown en bloques línea por línea. */
export function parseMarkdown(md: string): ParsedBlock[] {
  const lines = md.split('\n')
  const blocks: ParsedBlock[] = []
  let i = 0

  while (i < lines.length) {
    const line = lines[i]
    const trimmed = line.trim()

    if (trimmed === '') {
      i++
      continue
    }

    const h1 = trimmed.match(/^#\s+(.+)$/)
    if (h1) {
      blocks.push({ type: 'h1', text: h1[1] })
      i++
      continue
    }
    const h2 = trimmed.match(/^##\s+(.+)$/)
    if (h2) {
      blocks.push({ type: 'h2', text: h2[1] })
      i++
      continue
    }
    const h3 = trimmed.match(/^###\s+(.+)$/)
    if (h3) {
      blocks.push({ type: 'h3', text: h3[1] })
      i++
      continue
    }

    // Lista (ordenada o no ordenada, con soporte de anidamiento)
    const item = matchListItem(line)
    if (item) {
      const baseIndent = indentLevel(line)
      const result = parseList(lines, i, baseIndent)
      blocks.push({
        type: item.ordered ? 'ol' : 'ul',
        items: result.items
      })
      i = result.nextIndex
      continue
    }

    // Párrafo: agrupar líneas consecutivas no vacías
    const paraLines: string[] = [trimmed]
    i++
    while (
      i < lines.length &&
      lines[i].trim() !== '' &&
      !/^#{1,3}\s+/.test(lines[i].trim()) &&
      !matchListItem(lines[i])
    ) {
      paraLines.push(lines[i].trim())
      i++
    }
    blocks.push({ type: 'p', text: paraLines.join(' ') })
  }

  return blocks
}

/** Convierte Markdown a HTML seguro (escapado + formato). */
export function markdownToHtml(md: string): string {
  const blocks = parseMarkdown(md)
  return blocks
    .map((block) => {
      switch (block.type) {
        case 'h1':
          return `<h1 class="text-lg font-bold mt-3 mb-1">${renderInline(escapeHtml(block.text!))}</h1>`
        case 'h2':
          return `<h2 class="text-base font-semibold mt-3 mb-1">${renderInline(escapeHtml(block.text!))}</h2>`
        case 'h3':
          return `<h3 class="text-sm font-semibold mt-2 mb-1">${renderInline(escapeHtml(block.text!))}</h3>`
        case 'ul':
          return renderList(block.items!, false)
        case 'ol':
          return renderList(block.items!, true)
        default:
          return `<p class="my-1">${renderInline(escapeHtml(block.text!))}</p>`
      }
    })
    .join('')
}
