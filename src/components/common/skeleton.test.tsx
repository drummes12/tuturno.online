import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import {
  Skeleton,
  ReservationSkeleton,
  SlotGridSkeleton,
  DatePickerSkeleton
} from '@/components/common/skeleton'

describe('Skeleton', () => {
  it('renders div with aria-hidden="true"', () => {
    const { container } = render(<Skeleton />)
    const skeleton = container.querySelector('div')
    expect(skeleton).toBeInTheDocument()
    expect(skeleton).toHaveAttribute('aria-hidden', 'true')
  })

  it('merges custom className', () => {
    const { container } = render(<Skeleton className='h-10 w-full' />)
    const div = container.querySelector('div')
    expect(div).toHaveClass('h-10', 'w-full')
  })
})

describe('ReservationSkeleton', () => {
  it('renders without crashing', () => {
    const { container } = render(<ReservationSkeleton />)
    expect(container.firstChild).toBeInTheDocument()
  })
})

describe('SlotGridSkeleton', () => {
  it('renders 8 skeleton items', () => {
    const { container } = render(<SlotGridSkeleton />)
    const skeletons = container.querySelectorAll('.skeleton')
    expect(skeletons).toHaveLength(8)
  })
})

describe('DatePickerSkeleton', () => {
  it('renders 7 skeleton items', () => {
    const { container } = render(<DatePickerSkeleton />)
    const skeletons = container.querySelectorAll('.skeleton')
    expect(skeletons).toHaveLength(7)
  })
})
