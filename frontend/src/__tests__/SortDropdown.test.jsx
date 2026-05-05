// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createElement } from 'react'
import { cleanup, render, fireEvent } from '@testing-library/react'
import SortDropdown from '../components/SortDropdown.jsx'

afterEach(() => {
  cleanup()
})

const OPTIONS = [
  { value: 'name:asc', label: 'Name (A→Z)' },
  { value: 'name:desc', label: 'Name (Z→A)' },
  { value: 'lastUpdated:desc', label: 'Last updated (newest first)' },
]

describe('SortDropdown', () => {
  it('renders one option per preset', () => {
    const { getByRole } = render(
      createElement(SortDropdown, {
        options: OPTIONS,
        sort: 'name',
        order: 'asc',
        onChange: () => {},
      }),
    )
    const select = getByRole('combobox', { name: /sort list/i })
    const opts = [...select.querySelectorAll('option')].map((o) => ({
      value: o.value,
      label: o.textContent,
    }))
    expect(opts).toEqual([
      { value: 'name:asc', label: 'Name (A→Z)' },
      { value: 'name:desc', label: 'Name (Z→A)' },
      { value: 'lastUpdated:desc', label: 'Last updated (newest first)' },
    ])
  })

  it('calls onChange with parsed sort and order', () => {
    const onChange = vi.fn()
    const { getByRole } = render(
      createElement(SortDropdown, {
        options: OPTIONS,
        sort: 'name',
        order: 'asc',
        onChange,
      }),
    )
    const select = getByRole('combobox', { name: /sort list/i })
    fireEvent.change(select, { target: { value: 'lastUpdated:desc' } })
    expect(onChange).toHaveBeenCalledWith({ sort: 'lastUpdated', order: 'desc' })
  })

  it('reflects current sort and order in selected option', () => {
    const { getByRole } = render(
      createElement(SortDropdown, {
        options: OPTIONS,
        sort: 'name',
        order: 'desc',
        onChange: () => {},
      }),
    )
    const select = getByRole('combobox', { name: /sort list/i })
    expect(select.value).toBe('name:desc')
  })

  it('parses organisationType with camelCase before direction', () => {
    const onChange = vi.fn()
    const orgOptions = [
      { value: 'organisationType:asc', label: 'Type (A→Z)' },
      { value: 'organisationType:desc', label: 'Type (Z→A)' },
    ]
    const { getByRole } = render(
      createElement(SortDropdown, {
        options: orgOptions,
        sort: 'organisationType',
        order: 'asc',
        onChange,
      }),
    )
    fireEvent.change(getByRole('combobox', { name: /sort list/i }), {
      target: { value: 'organisationType:desc' },
    })
    expect(onChange).toHaveBeenCalledWith({ sort: 'organisationType', order: 'desc' })
  })
})
