import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Input } from '@/components/common/input'

describe('Input', () => {
  it('renders label text', () => {
    render(<Input label='Email' />)
    expect(screen.getByText('Email')).toBeInTheDocument()
  })

  it('renders input element with correct id', () => {
    render(<Input label='Email' id='email-field' />)
    expect(screen.getByLabelText('Email')).toHaveAttribute('id', 'email-field')
  })

  it('auto-generates id from label when no id/name provided', () => {
    render(<Input label='First Name' />)
    expect(screen.getByLabelText('First Name')).toHaveAttribute(
      'id',
      'first-name'
    )
  })

  it('uses provided id prop', () => {
    render(<Input label='Email' id='custom-id' />)
    expect(screen.getByLabelText('Email')).toHaveAttribute('id', 'custom-id')
  })

  it('uses name prop for id when no id provided', () => {
    render(<Input label='Email' name='user-email' />)
    expect(screen.getByLabelText('Email')).toHaveAttribute('id', 'user-email')
  })

  it('shows hint text when no error', () => {
    render(<Input label='Email' hint='Enter your email' />)
    expect(screen.getByText('Enter your email')).toBeInTheDocument()
  })

  it('shows error text when error is provided (hides hint)', () => {
    render(
      <Input label='Email' hint='Enter your email' error='Invalid email' />
    )
    expect(screen.getByText('Invalid email')).toBeInTheDocument()
    expect(screen.queryByText('Enter your email')).not.toBeInTheDocument()
  })

  it('sets aria-invalid when error', () => {
    render(<Input label='Email' error='Invalid' />)
    expect(screen.getByLabelText('Email')).toHaveAttribute(
      'aria-invalid',
      'true'
    )
  })

  it('sets aria-invalid to false when no error', () => {
    render(<Input label='Email' />)
    expect(screen.getByLabelText('Email')).toHaveAttribute(
      'aria-invalid',
      'false'
    )
  })

  it('sets aria-describedby to error id when error', () => {
    render(<Input label='Email' id='email' error='Invalid' />)
    expect(screen.getByLabelText('Email')).toHaveAttribute(
      'aria-describedby',
      'email-error'
    )
  })

  it('sets aria-describedby to hint id when hint', () => {
    render(<Input label='Email' id='email' hint='Helpful text' />)
    expect(screen.getByLabelText('Email')).toHaveAttribute(
      'aria-describedby',
      'email-hint'
    )
  })

  it('renders icon when provided', () => {
    render(
      <Input label='Email' icon={<span data-testid='test-icon'>@</span>} />
    )
    expect(screen.getByTestId('test-icon')).toBeInTheDocument()
  })

  it('does not render icon span when not provided', () => {
    const { container } = render(<Input label='Email' />)
    const spans = container.querySelectorAll('span')
    expect(spans.length).toBe(0)
  })

  it('passes through input attributes (type, placeholder, required, autoFocus)', () => {
    render(
      <Input
        label='Email'
        type='email'
        placeholder='you@example.com'
        required
        autoFocus
      />
    )
    const input = screen.getByLabelText('Email')
    expect(input).toHaveAttribute('type', 'email')
    expect(input).toHaveAttribute('placeholder', 'you@example.com')
    expect(input).toBeRequired()
  })

  it('calls onChange when user types', async () => {
    const onChange = vi.fn()
    render(<Input label='Email' onChange={onChange} />)
    const input = screen.getByLabelText('Email')
    await userEvent.type(input, 'a')
    expect(onChange).toHaveBeenCalled()
  })
})
