import { describe, expect, it } from 'vitest'
import { deriveCompareOrganisationsSystemUnion } from './compare-organisations-system-union.js'

function successOrg(systems) {
  return {
    isPending: false,
    isSuccess: true,
    data: { data: { systems } },
  }
}

describe('deriveCompareOrganisationsSystemUnion', () => {
  it('is pending if any query is pending', () => {
    expect(
      deriveCompareOrganisationsSystemUnion(['a', 'b'], [
        successOrg([{ system: { id: 's1' } }]),
        { isPending: true, isSuccess: false },
      ]),
    ).toEqual({ kind: 'pending' })
  })

  it('is incomplete if org count is not 2–4', () => {
    expect(deriveCompareOrganisationsSystemUnion(['a'], [successOrg([])])).toEqual({
      kind: 'incomplete',
    })
  })

  it('builds first-seen order across org columns', () => {
    const r = deriveCompareOrganisationsSystemUnion(
      ['o1', 'o2'],
      [
        successOrg([{ system: { id: 's1' } }, { system: { id: 's2' } }]),
        successOrg([{ system: { id: 's2' } }, { system: { id: 's3' } }]),
      ],
    )
    expect(r).toEqual({ kind: 'ready', orderedSystemIds: ['s1', 's2', 's3'] })
  })

  it('is incomplete if a column failed', () => {
    expect(
      deriveCompareOrganisationsSystemUnion(
        ['a', 'b'],
        [successOrg([]), { isPending: false, isSuccess: false }],
      ),
    ).toEqual({ kind: 'incomplete' })
  })
})
