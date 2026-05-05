import { describe, expect, it } from 'vitest'
import { pickFieldSourceUrl, systemCompareRowFieldSourceKey } from './field-source-keys.js'

describe('pickFieldSourceUrl', () => {
  it('returns null for missing or invalid fieldSources', () => {
    expect(pickFieldSourceUrl(null, 'vendor')).toBeNull()
    expect(pickFieldSourceUrl(undefined, 'vendor')).toBeNull()
    expect(pickFieldSourceUrl([], 'vendor')).toBeNull()
  })

  it('returns trimmed string URL when present', () => {
    expect(pickFieldSourceUrl({ vendor: 'https://a.test' }, 'vendor')).toBe('https://a.test')
    expect(pickFieldSourceUrl({ vendor: '' }, 'vendor')).toBeNull()
  })
})

describe('systemCompareRowFieldSourceKey', () => {
  it('maps static compare rows to field keys', () => {
    expect(systemCompareRowFieldSourceKey(1, 0)).toBe('vendor')
    expect(systemCompareRowFieldSourceKey(6, 2)).toBe('membershipCapability')
    expect(systemCompareRowFieldSourceKey(9, 0)).toBe('seasonSubscriptionsCapability')
    expect(systemCompareRowFieldSourceKey(13, 0)).toBe('accessibilityFeaturesCapability')
  })

  it('returns null for provenance, union, and adopted rows', () => {
    expect(systemCompareRowFieldSourceKey(15, 1)).toBeNull()
    expect(systemCompareRowFieldSourceKey(17, 1)).toBeNull()
    expect(systemCompareRowFieldSourceKey(18, 1)).toBeNull()
  })
})
