import { describe, expect, it } from 'vitest'
import {
  buildCustomAttributesPayload,
  customAttributeRowHasErrors,
  customAttributesEditorHasErrors,
} from './custom-attributes-form.js'

describe('buildCustomAttributesPayload', () => {
  it('strips _key and drops rows where label and value are both empty after trim', () => {
    const rows = [
      { _key: 'a', label: '  ', value: '  ', sourceReference: '' },
      { _key: 'b', label: 'L', value: '', sourceReference: 'https://x.com' },
      { _key: 'c', label: '', value: 'V', sourceReference: '' },
    ]
    expect(buildCustomAttributesPayload(rows)).toEqual([
      { label: 'L', value: '', sourceReference: 'https://x.com' },
      { label: '', value: 'V', sourceReference: '' },
    ])
  })

  it('returns empty array when all rows are blank', () => {
    expect(
      buildCustomAttributesPayload([{ _key: 'x', label: '', value: '', sourceReference: '' }]),
    ).toEqual([])
  })
})

describe('customAttributeRowHasErrors', () => {
  const limits = { labelMax: 200, valueMax: 200, urlMax: 500 }

  it('flags label over limit', () => {
    expect(
      customAttributeRowHasErrors(
        { _key: 'k', label: 'x'.repeat(201), value: '', sourceReference: '' },
        limits,
      ),
    ).toBe(true)
  })

  it('flags invalid non-empty URL scheme', () => {
    expect(
      customAttributeRowHasErrors(
        { _key: 'k', label: 'a', value: 'b', sourceReference: 'ftp://a' },
        limits,
      ),
    ).toBe(true)
  })

  it('allows empty source URL and valid http(s)', () => {
    expect(
      customAttributeRowHasErrors({ _key: 'k', label: 'a', value: 'b', sourceReference: '' }, limits),
    ).toBe(false)
    expect(
      customAttributeRowHasErrors(
        { _key: 'k', label: 'a', value: 'b', sourceReference: 'https://a' },
        limits,
      ),
    ).toBe(false)
  })
})

describe('customAttributesEditorHasErrors', () => {
  const limits = { labelMax: 200, valueMax: 200, urlMax: 500 }

  it('is true if any row has errors', () => {
    const rows = [
      { _key: 'a', label: 'ok', value: 'ok', sourceReference: '' },
      { _key: 'b', label: 'ok', value: 'ok', sourceReference: 'bad' },
    ]
    expect(customAttributesEditorHasErrors(rows, limits)).toBe(true)
  })

  it('is false for empty list', () => {
    expect(customAttributesEditorHasErrors([], limits)).toBe(false)
  })
})
