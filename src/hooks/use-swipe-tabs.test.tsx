import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { useSwipeTabs } from '@/hooks/use-swipe-tabs'

type HarnessProps = {
  activeIndex: number
  tabCount: number
  onIndexChange: (index: number) => void
}

function Harness({ activeIndex, tabCount, onIndexChange }: HarnessProps) {
  const handlers = useSwipeTabs({
    activeIndex,
    tabCount,
    onIndexChange
  })

  return <div data-testid='swipe-area' {...handlers} />
}

function swipe(startX: number, startY: number, endX: number, endY: number) {
  const area = screen.getByTestId('swipe-area')
  fireEvent.touchStart(area, {
    changedTouches: [{ clientX: startX, clientY: startY }]
  })
  fireEvent.touchEnd(area, {
    changedTouches: [{ clientX: endX, clientY: endY }]
  })
}

describe('useSwipeTabs', () => {
  it('avanza con swipe hacia la izquierda', () => {
    const onIndexChange = vi.fn()
    render(
      <Harness activeIndex={1} tabCount={4} onIndexChange={onIndexChange} />
    )

    swipe(220, 100, 140, 105)

    expect(onIndexChange).toHaveBeenCalledWith(2)
  })

  it('retrocede con swipe hacia la derecha', () => {
    const onIndexChange = vi.fn()
    render(
      <Harness activeIndex={2} tabCount={4} onIndexChange={onIndexChange} />
    )

    swipe(140, 100, 220, 105)

    expect(onIndexChange).toHaveBeenCalledWith(1)
  })

  it('ignora movimientos cortos o principalmente verticales', () => {
    const onIndexChange = vi.fn()
    render(
      <Harness activeIndex={1} tabCount={4} onIndexChange={onIndexChange} />
    )

    swipe(200, 100, 160, 105)
    swipe(200, 100, 120, 180)

    expect(onIndexChange).not.toHaveBeenCalled()
  })

  it('no cambia fuera de los límites de las tabs', () => {
    const onIndexChange = vi.fn()
    render(
      <Harness activeIndex={0} tabCount={2} onIndexChange={onIndexChange} />
    )

    swipe(140, 100, 220, 105)

    expect(onIndexChange).not.toHaveBeenCalled()
  })

  it('mueve visualmente el contenido y lo devuelve al terminar', () => {
    const onIndexChange = vi.fn()
    render(
      <Harness activeIndex={1} tabCount={4} onIndexChange={onIndexChange} />
    )
    const area = screen.getByTestId('swipe-area')

    fireEvent.touchStart(area, {
      changedTouches: [{ clientX: 220, clientY: 100 }]
    })
    fireEvent.touchMove(area, {
      touches: [{ clientX: 140, clientY: 105 }]
    })

    expect(area).toHaveAttribute('data-swipe-active', 'true')
    expect(area.style.getPropertyValue('--swipe-offset')).toBe('-17.6px')

    fireEvent.touchEnd(area, {
      changedTouches: [{ clientX: 140, clientY: 105 }]
    })

    expect(area).toHaveAttribute('data-swipe-active', 'false')
    expect(area.style.getPropertyValue('--swipe-offset')).toBe('0px')
  })
})
