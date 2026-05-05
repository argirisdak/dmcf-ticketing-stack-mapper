import { createElement } from 'react'
import { renderToString } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import FieldSourceIcon from './FieldSourceIcon.jsx'

describe('FieldSourceIcon', () => {
  it('renders nothing when url is null', () => {
    const html = renderToString(createElement(FieldSourceIcon, { url: null, fieldLabel: 'Test' }))
    expect(html).toBe('')
  })

  it('renders nothing when url is blank', () => {
    const html = renderToString(createElement(FieldSourceIcon, { url: '   ', fieldLabel: 'Test' }))
    expect(html).toBe('')
  })

  it('renders an anchor with correct attributes when url is valid', () => {
    const html = renderToString(
      createElement(FieldSourceIcon, {
        url: 'https://example.com/doc',
        fieldLabel: 'Vendor',
      }),
    )
    expect(html).toContain('href="https://example.com/doc"')
    expect(html).toContain('target="_blank"')
    expect(html).toContain('rel="noopener noreferrer"')
    expect(html).toContain('title="https://example.com/doc"')
    expect(html).toContain('View source for Vendor')
  })
})
