const {
  stripClientControlledTimestampKeys,
  stripClientControlledSystemWriteKeys,
  stripClientControlledOrganisationSystemWriteKeys,
} = require('../lib/strip-client-controlled-write-keys');

describe('strip-client-controlled-write-keys', () => {
  it('stripClientControlledTimestampKeys removes camel and snake timestamp keys', () => {
    const body = {
      name: 'X',
      lastUpdated: 'a',
      last_updated: 'b',
      createdAt: 'c',
      created_at: 'd',
      updatedAt: 'e',
      updated_at: 'f',
    };
    const out = stripClientControlledTimestampKeys(body);
    expect(out).toEqual({ name: 'X' });
    expect(body.lastUpdated).toBe('a');
  });

  it('stripClientControlledSystemWriteKeys also removes id', () => {
    const out = stripClientControlledSystemWriteKeys({
      id: 'uuid',
      name: 'Spektrix',
      last_updated: 'x',
    });
    expect(out).toEqual({ name: 'Spektrix' });
  });

  it('stripClientControlledOrganisationSystemWriteKeys matches system strip for junction bodies', () => {
    const out = stripClientControlledOrganisationSystemWriteKeys({
      id: 'x',
      lastUpdated: 'y',
      role: 'PRIMARY_CRM',
    });
    expect(out).toEqual({ role: 'PRIMARY_CRM' });
  });

  it('passes through non-objects', () => {
    expect(stripClientControlledTimestampKeys(null)).toBeNull();
    expect(stripClientControlledSystemWriteKeys(undefined)).toBeUndefined();
  });
});
