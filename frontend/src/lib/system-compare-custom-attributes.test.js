import { describe, expect, it } from 'vitest'
import { buildUnionCustomAttributeLabels } from './system-compare-custom-attributes.js'

describe('buildUnionCustomAttributeLabels', () => {
  it('returns empty for non-array input', () => {
    expect(buildUnionCustomAttributeLabels(null)).toEqual([])
    expect(buildUnionCustomAttributeLabels(undefined)).toEqual([])
  })

  it('merges left-to-right with case-insensitive dedupe and first-seen casing', () => {
    const dtos = [
      {
        customAttributes: [
          { label: 'Foo', value: '1' },
          { label: 'foo', value: 'skip' },
        ],
      },
      {
        customAttributes: [
          { label: 'Bar', value: '2' },
          { label: 'FOO', value: 'skip' },
        ],
      },
    ]
    expect(buildUnionCustomAttributeLabels(dtos)).toEqual(['Foo', 'Bar'])
  })

  it('skips null columns and still respects order of remaining columns', () => {
    const dtos = [
      null,
      { customAttributes: [{ label: 'Zed', value: 'z' }] },
      { customAttributes: [{ label: 'A', value: '1' }] },
    ]
    expect(buildUnionCustomAttributeLabels(dtos)).toEqual(['Zed', 'A'])
  })

  it('uses top-to-bottom order within each column', () => {
    const dtos = [
      {
        customAttributes: [{ label: 'Second', value: '2' }, { label: 'First', value: '1' }],
      },
    ]
    expect(buildUnionCustomAttributeLabels(dtos)).toEqual(['Second', 'First'])
  })
})
