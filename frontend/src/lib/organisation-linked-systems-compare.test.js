import { describe, expect, it } from 'vitest'
import {
  buildOrganisationContextualSystemCompare,
  distinctSystemIdsInRoleDisplayOrder,
  topFourSystemIdsByJunctionLastUpdated,
} from './organisation-linked-systems-compare.js'

const ROLE_ORDER = ['PRIMARY_TICKETING', 'PRIMARY_CRM', 'INTEGRATED_SUITE', 'SECONDARY']

describe('distinctSystemIdsInRoleDisplayOrder', () => {
  it('follows role order then row order', () => {
    const systems = [
      { role: 'PRIMARY_CRM', system: { id: 'b' }, id: 'l1' },
      { role: 'PRIMARY_TICKETING', system: { id: 'a' }, id: 'l2' },
    ]
    expect(distinctSystemIdsInRoleDisplayOrder(systems, ROLE_ORDER)).toEqual(['a', 'b'])
  })
})

describe('topFourSystemIdsByJunctionLastUpdated', () => {
  it('picks four newest by junction lastUpdated with tie-break on link id', () => {
    const t0 = '2020-01-01T00:00:00.000Z'
    const t1 = '2021-01-01T00:00:00.000Z'
    const systems = [
      { id: 'z', system: { id: 's1' }, lastUpdated: t0 },
      { id: 'a', system: { id: 's2' }, lastUpdated: t1 },
      { id: 'm', system: { id: 's3' }, lastUpdated: t1 },
      { id: 'b', system: { id: 's4' }, lastUpdated: t1 },
      { id: 'c', system: { id: 's5' }, lastUpdated: t1 },
    ]
    const top = topFourSystemIdsByJunctionLastUpdated(systems)
    expect(top).toHaveLength(4)
    expect(top[0]).toBe('s2')
    expect(top).toContain('s3')
    expect(top).toContain('s4')
    expect(top).toContain('s5')
    expect(top).not.toContain('s1')
  })
})

describe('buildOrganisationContextualSystemCompare', () => {
  it('returns null when fewer than two links', () => {
    expect(buildOrganisationContextualSystemCompare([], ROLE_ORDER)).toBeNull()
    expect(
      buildOrganisationContextualSystemCompare(
        [{ role: 'PRIMARY_TICKETING', system: { id: 'a' }, id: '1' }],
        ROLE_ORDER,
      ),
    ).toBeNull()
  })

  it('uses all distinct ids for 2–4 systems', () => {
    const systems = [
      { role: 'PRIMARY_TICKETING', system: { id: 'x' }, id: '1' },
      { role: 'PRIMARY_CRM', system: { id: 'y' }, id: '2' },
    ]
    expect(buildOrganisationContextualSystemCompare(systems, ROLE_ORDER)).toEqual({
      to: '/compare/systems?ids=x,y',
      label: 'Compare these systems →',
    })
  })
})
