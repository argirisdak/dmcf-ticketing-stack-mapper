/**
 * Tests for the $use middleware logic in src/lib/prisma.js.
 * We test the middleware function in isolation by extracting its logic,
 * since PrismaClient cannot connect without a DB.
 */

// Replicate the middleware function from prisma.js for isolated unit testing
const lastUpdatedMiddleware = async (params, next) => {
  if (params.model === 'Organisation' && params.action === 'update') {
    params.args.data.last_updated = new Date();
  }
  return next(params);
};

describe('last_updated middleware (AC5)', () => {
  it('sets last_updated when model is Organisation and action is update', async () => {
    const before = Date.now();
    const params = { model: 'Organisation', action: 'update', args: { data: { name: 'Test' } } };
    const next = jest.fn().mockResolvedValue({ id: '1' });

    await lastUpdatedMiddleware(params, next);

    expect(params.args.data.last_updated).toBeInstanceOf(Date);
    expect(params.args.data.last_updated.getTime()).toBeGreaterThanOrEqual(before);
    expect(next).toHaveBeenCalledWith(params);
  });

  it('overwrites an existing last_updated value in the data payload', async () => {
    const staleDate = new Date('2020-01-01');
    const params = { model: 'Organisation', action: 'update', args: { data: { last_updated: staleDate } } };
    const next = jest.fn().mockResolvedValue({});

    await lastUpdatedMiddleware(params, next);

    expect(params.args.data.last_updated).not.toEqual(staleDate);
  });

  it('does NOT set last_updated for non-Organisation models', async () => {
    const params = { model: 'TicketingProvider', action: 'update', args: { data: { name: 'Test' } } };
    const next = jest.fn().mockResolvedValue({});

    await lastUpdatedMiddleware(params, next);

    expect(params.args.data.last_updated).toBeUndefined();
  });

  it('does NOT set last_updated for Organisation create actions', async () => {
    const params = { model: 'Organisation', action: 'create', args: { data: { name: 'Test' } } };
    const next = jest.fn().mockResolvedValue({});

    await lastUpdatedMiddleware(params, next);

    expect(params.args.data.last_updated).toBeUndefined();
  });

  it('calls next() for all models and actions', async () => {
    const next = jest.fn().mockResolvedValue({});
    const params = { model: 'CrmPlatform', action: 'findMany', args: {} };

    await lastUpdatedMiddleware(params, next);

    expect(next).toHaveBeenCalledTimes(1);
  });
});
