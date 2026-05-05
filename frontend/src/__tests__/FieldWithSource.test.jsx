// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest'
import { createElement } from 'react'
import { render, fireEvent } from '@testing-library/react'
import FieldWithSource from '../components/FieldWithSource.jsx'

describe('FieldWithSource', () => {
  it('renders main child and source URL input', () => {
    const { container, getByTestId, getByLabelText } = render(
      createElement(
        FieldWithSource,
        {
          fieldName: 'vendor',
          label: 'Vendor',
          sourceValue: '',
          onSourceChange: () => {},
        },
        createElement('span', { 'data-testid': 'main' }, 'main field'),
      ),
    )
    expect(getByTestId('main').textContent).toBe('main field')
    const src = getByLabelText('Source URL for Vendor')
    expect(src.getAttribute('placeholder')).toBe('Source URL (optional)')
    expect(container.querySelector('#field-src-vendor')).toBe(src)
  })

  it('calls onSourceChange with fieldName and new value', () => {
    const onSourceChange = vi.fn()
    const { getByLabelText } = render(
      createElement(FieldWithSource, {
        fieldName: 'category',
        label: 'Category',
        sourceValue: '',
        onSourceChange,
        children: createElement('input', { id: 'main-cat' }),
      }),
    )
    const src = getByLabelText('Source URL for Category')
    fireEvent.change(src, { target: { value: 'https://example.com/src' } })
    expect(onSourceChange).toHaveBeenCalledWith('category', 'https://example.com/src')
  })

  it('renders inline error when sourceError is set', () => {
    const { getByLabelText, getByRole } = render(
      createElement(FieldWithSource, {
        fieldName: 'city',
        label: 'City',
        sourceValue: 'bad',
        onSourceChange: () => {},
        sourceError: 'Source URL must start with http:// or https://',
        children: createElement('input'),
      }),
    )
    expect(getByRole('alert').textContent).toBe('Source URL must start with http:// or https://')
    expect(getByLabelText('Source URL for City').getAttribute('aria-invalid')).toBe('true')
  })
})
