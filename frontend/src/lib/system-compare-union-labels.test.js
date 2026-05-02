import { describe, expect, it } from 'vitest'
import {
  buildSystemCompareRowLabels,
  findCustomAttributeByLabel,
  mergeCustomAttributeUnionLabels,
  systemCompareSectionDividerRowIndexes,
} from './system-compare-union-labels.js'

function mockSuccessQuery(envelopeData) {
  return {
    isPending: false,
    isSuccess: true,
    data: { data: envelopeData },
  }
}

describe('mergeCustomAttributeUnionLabels', () => {
  it('returns empty when no successful queries', () => {
    expect(
      mergeCustomAttributeUnionLabels(
        ['a', 'b'],
        [
          { isPending: false, isSuccess: false },
          { isPending: false, isSuccess: false },
        ],
      ),
    ).toEqual([])
  })

  it('returns empty while any column query is still pending', () => {
    const ids = ['1', '2']
    const queries = [
      mockSuccessQuery({ customAttributes: [{ label: 'Foo', value: '1' }] }),
      { isPending: true, isSuccess: false },
    ]
    expect(mergeCustomAttributeUnionLabels(ids, queries)).toEqual([])
  })

  it('merges left-to-right with case-insensitive dedupe', () => {
    const ids = ['1', '2']
    const queries = [
      mockSuccessQuery({
        customAttributes: [{ label: 'Foo', value: '1' }, { label: 'foo', value: 'skip' }],
      }),
      mockSuccessQuery({
        customAttributes: [{ label: 'Bar', value: '2' }, { label: 'FOO', value: 'skip' }],
      }),
    ]
    expect(mergeCustomAttributeUnionLabels(ids, queries)).toEqual(['Foo', 'Bar'])
  })

  it('skips non-object or missing customAttributes', () => {
    const ids = ['1']
    const queries = [mockSuccessQuery({ customAttributes: null })]
    expect(mergeCustomAttributeUnionLabels(ids, queries)).toEqual([])
  })

  it('merges from successful columns only in left-to-right order', () => {
    const ids = ['1', '2', '3']
    const queries = [
      mockSuccessQuery({ customAttributes: [{ label: 'A', value: '1' }] }),
      { isPending: false, isSuccess: false, data: undefined },
      mockSuccessQuery({ customAttributes: [{ label: 'B', value: '2' }] }),
    ]
    expect(mergeCustomAttributeUnionLabels(ids, queries)).toEqual(['A', 'B'])
  })
})

describe('findCustomAttributeByLabel', () => {
  it('matches case-insensitively', () => {
    const attrs = [{ label: 'My Label', value: 'x' }]
    expect(findCustomAttributeByLabel(attrs, 'my label')?.value).toBe('x')
    expect(findCustomAttributeByLabel(attrs, 'nomatch')).toBeUndefined()
  })
})

describe('buildSystemCompareRowLabels', () => {
  it('orders provenance before union then adopted by (AC §1)', () => {
    const rows = buildSystemCompareRowLabels(['A', 'B'])
    expect(rows).toContain('Description')
    expect(rows).toContain('Deployment model')
    expect(rows).toContain('Membership capability')
    const descIdx = rows.indexOf('Description')
    const srcIdx = rows.indexOf('Source reference')
    const lastIdx = rows.indexOf('Last updated')
    const aIdx = rows.indexOf('A')
    const bIdx = rows.indexOf('B')
    const adoptedIdx = rows.indexOf('Adopted by')
    expect(descIdx).toBeLessThan(srcIdx)
    expect(srcIdx).toBeLessThan(lastIdx)
    expect(lastIdx).toBeLessThan(aIdx)
    expect(aIdx).toBeLessThan(bIdx)
    expect(bIdx).toBeLessThan(adoptedIdx)
    expect(rows[rows.length - 1]).toBe('Adopted by')
  })
})

describe('systemCompareSectionDividerRowIndexes', () => {
  it('includes provenance and adopted starts when union is empty', () => {
    const s = systemCompareSectionDividerRowIndexes(0)
    expect(s.has(6)).toBe(true)
    expect(s.has(9)).toBe(true)
    expect(s.has(10)).toBe(true)
    expect(s.has(12)).toBe(true)
  })

  it('includes union start when union is non-empty', () => {
    const s = systemCompareSectionDividerRowIndexes(2)
    expect(s.has(10)).toBe(true)
    expect(s.has(12)).toBe(true)
    expect(s.has(14)).toBe(true)
  })
})
