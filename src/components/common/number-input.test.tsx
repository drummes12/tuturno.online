import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { useState } from 'react'
import { NumberInput } from './number-input'

function Harness({ initial = 30, fallback = 30, min }: { initial?: number; fallback?: number; min?: number }) {
  const [value, setValue] = useState(initial)
  return (
    <div>
      <NumberInput
        label='Minutos'
        value={value}
        onCommit={setValue}
        fallback={fallback}
        min={min}
      />
      <output data-testid='value'>{value}</output>
    </div>
  )
}

describe('NumberInput', () => {
  it('permite borrar todo el valor mientras está enfocado', () => {
    render(<Harness />)
    const input = screen.getByLabelText('Minutos')
    fireEvent.focus(input)
    fireEvent.change(input, { target: { value: '3' } })
    fireEvent.change(input, { target: { value: '' } })
    expect(input).toHaveValue(null)
  })

  it('aplica el fallback al perder foco con el campo vacío', () => {
    render(<Harness fallback={30} />)
    const input = screen.getByLabelText('Minutos')
    fireEvent.focus(input)
    fireEvent.change(input, { target: { value: '' } })
    fireEvent.blur(input)
    expect(screen.getByTestId('value')).toHaveTextContent('30')
    expect(input).toHaveValue(30)
  })

  it('propaga valores válidos mientras se escribe', () => {
    render(<Harness />)
    const input = screen.getByLabelText('Minutos')
    fireEvent.focus(input)
    fireEvent.change(input, { target: { value: '45' } })
    expect(screen.getByTestId('value')).toHaveTextContent('45')
  })

  it('clampea al mínimo al perder foco', () => {
    render(<Harness initial={20} fallback={20} min={15} />)
    const input = screen.getByLabelText('Minutos')
    fireEvent.focus(input)
    fireEvent.change(input, { target: { value: '5' } })
    fireEvent.blur(input)
    expect(screen.getByTestId('value')).toHaveTextContent('15')
    expect(input).toHaveValue(15)
  })
})
