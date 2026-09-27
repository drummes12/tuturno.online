import { useState } from 'react'
import type {
  PointerEventHandler,
  FocusEventHandler,
  MouseEventHandler
} from 'react'

export interface ChartDetailState {
  key: string
  title: string
  summary: string
}

export function useChartDetail() {
  const [selected, setSelected] = useState<ChartDetailState | null>(null)
  const [hovered, setHovered] = useState<ChartDetailState | null>(null)

  const bind = (key: string, title: string, summary: string) => {
    const item = { key, title, summary }
    const onPointerEnter: PointerEventHandler<HTMLButtonElement> = (event) => {
      if (event.pointerType === 'mouse') setHovered(item)
    }
    const onPointerLeave: PointerEventHandler<HTMLButtonElement> = (event) => {
      if (event.pointerType === 'mouse') setHovered(null)
    }
    const onFocus: FocusEventHandler<HTMLButtonElement> = () => setHovered(item)
    const onBlur: FocusEventHandler<HTMLButtonElement> = () => setHovered(null)
    const onClick: MouseEventHandler<HTMLButtonElement> = () =>
      setSelected(item)

    return {
      'aria-label': `${title}. ${summary}`,
      'aria-pressed': selected?.key === key,
      onPointerEnter,
      onPointerLeave,
      onFocus,
      onBlur,
      onClick
    }
  }

  return {
    detail: hovered ?? selected,
    bind,
    isActive: (key: string) => (hovered ?? selected)?.key === key
  }
}
