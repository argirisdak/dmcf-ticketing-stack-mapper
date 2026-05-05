// @vitest-environment jsdom
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { createElement } from 'react'
import { render, fireEvent, cleanup } from '@testing-library/react'
import CustomAttributeEditor from '../components/CustomAttributeEditor.jsx'

describe('CustomAttributeEditor', () => {
  beforeEach(() => {
    let n = 0
    vi.stubGlobal('crypto', {
      randomUUID: () => {
        n += 1
        return `00000000-0000-4000-8000-${String(1000 + n).padStart(12, '0')}`
      },
    })
  })

  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
  })

  it('renders one row per value entry with placeholders', () => {
    const rows = [
      { _key: 'r1', label: 'A', value: '1', sourceReference: '' },
      { _key: 'r2', label: 'B', value: '2', sourceReference: 'https://ex.com' },
    ]
    const { getAllByPlaceholderText } = render(
      createElement(CustomAttributeEditor, {
        value: rows,
        onChange: () => {},
      }),
    )
    expect(getAllByPlaceholderText('e.g. B Corp certified')).toHaveLength(2)
  })

  it('appends a row when Add is clicked', () => {
    const onChange = vi.fn()
    const { getByRole } = render(
      createElement(CustomAttributeEditor, {
        value: [{ _key: 'only', label: '', value: '', sourceReference: '' }],
        onChange,
      }),
    )
    fireEvent.click(getByRole('button', { name: /Add custom attribute/i }))
    expect(onChange).toHaveBeenCalledTimes(1)
    const next = onChange.mock.calls[0][0]
    expect(next).toHaveLength(2)
    expect(next[1]).toMatchObject({ label: '', value: '', sourceReference: '' })
    expect(next[1]._key).toMatch(/^[0-9a-f-]{36}$/i)
  })

  it('removes a row when remove is clicked', () => {
    const onChange = vi.fn()
    const { getAllByRole } = render(
      createElement(CustomAttributeEditor, {
        value: [
          { _key: 'a', label: 'x', value: 'y', sourceReference: '' },
          { _key: 'b', label: 'p', value: 'q', sourceReference: '' },
        ],
        onChange,
      }),
    )
    const removeButtons = getAllByRole('button', { name: 'Remove custom attribute' })
    fireEvent.click(removeButtons[0])
    expect(onChange).toHaveBeenCalledWith([{ _key: 'b', label: 'p', value: 'q', sourceReference: '' }])
  })

  it('shows URL scheme error for non-http(s) values', () => {
    const { getByRole } = render(
      createElement(CustomAttributeEditor, {
        value: [{ _key: 'a', label: 'L', value: 'V', sourceReference: 'ftp://bad' }],
        onChange: () => {},
      }),
    )
    expect(getByRole('alert').textContent).toContain(
      'Source URL must start with http:// or https://',
    )
  })

  it('shows label char counter at and above 80% of limit', () => {
    const atThreshold = 'x'.repeat(160)
    const { rerender, queryByText } = render(
      createElement(CustomAttributeEditor, {
        value: [{ _key: 'a', label: atThreshold, value: '', sourceReference: '' }],
        onChange: () => {},
      }),
    )
    expect(queryByText('160 / 200')).not.toBeNull()

    const belowThreshold = 'x'.repeat(159)
    rerender(
      createElement(CustomAttributeEditor, {
        value: [{ _key: 'a', label: belowThreshold, value: '', sourceReference: '' }],
        onChange: () => {},
      }),
    )
    expect(queryByText('159 / 200')).toBeNull()
  })

  it('shows value and source URL counters at 80% threshold', () => {
    const valueStr = 'y'.repeat(160)
    const urlPrefix = 'https://ex.com/'
    const urlStr = `${urlPrefix}${'z'.repeat(400 - urlPrefix.length)}`
    expect(urlStr.length).toBe(400)
    const { getByText } = render(
      createElement(CustomAttributeEditor, {
        value: [{ _key: 'a', label: 'L', value: valueStr, sourceReference: urlStr }],
        onChange: () => {},
      }),
    )
    expect(getByText('160 / 200')).not.toBeNull()
    expect(getByText('400 / 500')).not.toBeNull()
  })

  it('notifies validation state when URL is invalid', () => {
    const onValidationChange = vi.fn()
    const { rerender } = render(
      createElement(CustomAttributeEditor, {
        value: [{ _key: 'a', label: '', value: '', sourceReference: '' }],
        onChange: () => {},
        onValidationChange,
      }),
    )
    expect(onValidationChange).toHaveBeenCalledWith(false)

    onValidationChange.mockClear()
    rerender(
      createElement(CustomAttributeEditor, {
        value: [{ _key: 'a', label: 'x', value: 'y', sourceReference: 'nope' }],
        onChange: () => {},
        onValidationChange,
      }),
    )
    expect(onValidationChange).toHaveBeenCalledWith(true)
  })
})
