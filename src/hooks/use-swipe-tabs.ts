import { useCallback, useRef } from 'react'
import type { MouseEvent, TouchEvent } from 'react'

type SwipeTabsOptions = {
  activeIndex: number
  tabCount: number
  onIndexChange: (index: number) => void
  threshold?: number
}

export function useSwipeTabs({
  activeIndex,
  tabCount,
  onIndexChange,
  threshold = 50
}: SwipeTabsOptions) {
  const startRef = useRef<{ x: number; y: number } | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const suppressClickRef = useRef(false)

  const setSwipeOffset = useCallback((offset: number, active: boolean) => {
    const container = containerRef.current
    if (!container) return
    container.style.setProperty('--swipe-offset', `${offset}px`)
    container.dataset.swipeActive = active ? 'true' : 'false'
  }, [])

  const onTouchStart = useCallback(
    (event: TouchEvent<HTMLElement>) => {
      const touch = event.changedTouches[0]
      if (!touch) return
      startRef.current = { x: touch.clientX, y: touch.clientY }
      setSwipeOffset(0, false)
    },
    [setSwipeOffset]
  )

  const onTouchMove = useCallback(
    (event: TouchEvent<HTMLElement>) => {
      const start = startRef.current
      const touch = event.touches[0] ?? event.changedTouches[0]
      if (!start || !touch) return

      const deltaX = touch.clientX - start.x
      const deltaY = touch.clientY - start.y
      if (Math.abs(deltaX) <= Math.abs(deltaY) || Math.abs(deltaX) < 8) {
        setSwipeOffset(0, false)
        return
      }

      const resistedOffset =
        Math.sign(deltaX) * Math.min(Math.abs(deltaX) * 0.22, 28)
      setSwipeOffset(resistedOffset, true)
    },
    [setSwipeOffset]
  )

  const onTouchEnd = useCallback(
    (event: TouchEvent<HTMLElement>) => {
      const start = startRef.current
      const touch = event.changedTouches[0]
      startRef.current = null
      setSwipeOffset(0, false)
      if (!start || !touch) return

      const deltaX = touch.clientX - start.x
      const deltaY = touch.clientY - start.y
      if (
        Math.abs(deltaX) < threshold ||
        Math.abs(deltaX) <= Math.abs(deltaY)
      ) {
        return
      }

      suppressClickRef.current = true
      window.setTimeout(() => {
        suppressClickRef.current = false
      }, 0)

      const nextIndex = activeIndex + (deltaX < 0 ? 1 : -1)
      if (nextIndex >= 0 && nextIndex < tabCount) {
        onIndexChange(nextIndex)
      }
    },
    [activeIndex, onIndexChange, setSwipeOffset, tabCount, threshold]
  )

  const onTouchCancel = useCallback(() => {
    startRef.current = null
    setSwipeOffset(0, false)
  }, [setSwipeOffset])

  const onClickCapture = useCallback((event: MouseEvent<HTMLElement>) => {
    if (!suppressClickRef.current) return
    event.preventDefault()
    event.stopPropagation()
    suppressClickRef.current = false
  }, [])

  return {
    ref: containerRef,
    onTouchStart,
    onTouchMove,
    onTouchEnd,
    onTouchCancel,
    onClickCapture
  }
}
