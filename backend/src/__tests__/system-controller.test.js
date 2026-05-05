const mockListSystems = jest.fn();
const mockGetSystemById = jest.fn();
const mockCreateSystem = jest.fn();
const mockUpdateSystem = jest.fn();
const mockDeleteSystem = jest.fn();

jest.mock('../lib/prisma', () => ({
  system: {
    findMany: jest.fn(),
    count: jest.fn(),
    findUnique: jest.fn(),
  },
  $disconnect: jest.fn(),
}));

jest.mock('../services/system-service', () => ({
  listSystems: (...args) => mockListSystems(...args),
  getSystemById: (...args) => mockGetSystemById(...args),
  createSystem: (...args) => mockCreateSystem(...args),
  updateSystem: (...args) => mockUpdateSystem(...args),
  deleteSystem: (...args) => mockDeleteSystem(...args),
}));

const request = require('supertest');
const app = require('../app');

const SYSTEM_STUB = {
  id: 'sys-1',
  name: 'Spektrix',
  vendor: 'Spektrix Ltd',
  category: 'INTEGRATED',
  deploymentModel: 'SAAS',
  pricingModel: 'SUBSCRIPTION',
  geographicFocus: 'UK',
  description: 'Integrated ticketing platform',
  membershipCapability: 'YES',
  donationCapability: 'YES',
  reservedSeatingCapability: 'YES',
  seasonSubscriptionsCapability: 'UNKNOWN',
  dynamicPricingCapability: 'UNKNOWN',
  multiVenueSupportCapability: 'UNKNOWN',
  marketingAutomationCapability: 'UNKNOWN',
  accessibilityFeaturesCapability: 'UNKNOWN',
  sourceReference: 'https://www.spektrix.com',
  fieldSources: null,
  customAttributes: null,
  lastUpdated: '2026-04-01T00:00:00.000Z',
  createdAt: '2026-01-01T00:00:00.000Z',
};

const SYSTEM_DETAIL_STUB = {
  ...SYSTEM_STUB,
  organisations: [
    {
      id: 'link-1',
      role: 'INTEGRATED_SUITE',
      sourceReference: null,
      note: null,
      lastUpdated: '2026-04-01T00:00:00.000Z',
      organisation: {
        id: 'org-1',
        name: 'Royal Opera House',
        type: 'Venue',
        country: 'United Kingdom',
      },
    },
  ],
};

const EXTENDED_CAPABILITY_KEYS = [
  'seasonSubscriptionsCapability',
  'dynamicPricingCapability',
  'multiVenueSupportCapability',
  'marketingAutomationCapability',
  'accessibilityFeaturesCapability',
];

describe('GET /api/systems', () => {
  beforeEach(() => {
    mockListSystems.mockReset();
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('returns HTTP 200 with envelope and pagination meta', async () => {
    mockListSystems.mockResolvedValue({ data: [SYSTEM_STUB], total: 11, totalPages: 1 });

    const res = await request(app).get('/api/systems');
    expect(res.status).toBe(200);
    expect(res.body.error).toBeNull();
    expect(res.body.meta).toEqual({ page: 1, limit: 20, total: 11, totalPages: 1 });
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].name).toBe('Spektrix');
  });

  it('passes page and limit to service', async () => {
    mockListSystems.mockResolvedValue({ data: [], total: 0, totalPages: 0 });

    await request(app).get('/api/systems?page=2&limit=5');
    expect(mockListSystems).toHaveBeenCalledWith(expect.objectContaining({ page: 2, limit: 5 }));
  });

  it('defaults page=1 limit=20 when omitted', async () => {
    mockListSystems.mockResolvedValue({ data: [], total: 0, totalPages: 0 });

    await request(app).get('/api/systems');
    expect(mockListSystems).toHaveBeenCalledWith(expect.objectContaining({ page: 1, limit: 20 }));
  });

  it('passes q to service', async () => {
    mockListSystems.mockResolvedValue({ data: [], total: 0, totalPages: 0 });

    await request(app).get('/api/systems?q=spektrix');
    expect(mockListSystems).toHaveBeenCalledWith(expect.objectContaining({ q: 'spektrix' }));
  });

  it('accepts single category param and passes as array', async () => {
    mockListSystems.mockResolvedValue({ data: [], total: 0, totalPages: 0 });

    await request(app).get('/api/systems?category=INTEGRATED');
    expect(mockListSystems).toHaveBeenCalledWith(
      expect.objectContaining({ categories: ['INTEGRATED'] })
    );
  });

  it('accepts multiple category params and passes as array', async () => {
    mockListSystems.mockResolvedValue({ data: [], total: 0, totalPages: 0 });

    await request(app).get('/api/systems?category=INTEGRATED&category=TICKETING');
    expect(mockListSystems).toHaveBeenCalledWith(
      expect.objectContaining({ categories: ['INTEGRATED', 'TICKETING'] })
    );
  });

  it('returns 400 for invalid category value', async () => {
    const res = await request(app).get('/api/systems?category=BADVAL');
    expect(res.status).toBe(400);
    expect(res.body.data).toBeNull();
    expect(res.body.meta).toBeNull();
    expect(res.body.error.message).toBe('Validation failed');
    expect(res.body.error.fields[0].field).toBe('category');
  });

  it('returns 400 for invalid deployment_model value', async () => {
    const res = await request(app).get('/api/systems?deployment_model=CLOUD');
    expect(res.status).toBe(400);
    expect(res.body.error.fields[0].field).toBe('deployment_model');
  });

  it('returns 400 for invalid pricing_model value', async () => {
    const res = await request(app).get('/api/systems?pricing_model=FREEMIUM');
    expect(res.status).toBe(400);
    expect(res.body.error.fields[0].field).toBe('pricing_model');
  });

  it('returns 400 for invalid geographic_focus value', async () => {
    const res = await request(app).get('/api/systems?geographic_focus=Mars');
    expect(res.status).toBe(400);
    expect(res.body.error.fields[0].field).toBe('geographic_focus');
  });

  it('returns 400 for invalid membership capability value', async () => {
    const res = await request(app).get('/api/systems?membership=MAYBE');
    expect(res.status).toBe(400);
    expect(res.body.error.fields[0].field).toBe('membership');
  });

  it('accepts valid geographic_focus value and passes to service', async () => {
    mockListSystems.mockResolvedValue({ data: [], total: 0, totalPages: 0 });

    await request(app).get('/api/systems?geographic_focus=UK');
    expect(mockListSystems).toHaveBeenCalledWith(
      expect.objectContaining({ geographicFocus: 'UK' })
    );
  });

  it('accepts valid capability filters and passes to service', async () => {
    mockListSystems.mockResolvedValue({ data: [], total: 0, totalPages: 0 });

    await request(app).get('/api/systems?membership=YES&donation=NO&seating=UNKNOWN');
    expect(mockListSystems).toHaveBeenCalledWith(
      expect.objectContaining({ membership: 'YES', donation: 'NO', seating: 'UNKNOWN' })
    );
  });

  it.each(EXTENDED_CAPABILITY_KEYS)('accepts %s filter and passes to service', async (param) => {
    mockListSystems.mockResolvedValue({ data: [], total: 0, totalPages: 0 });

    await request(app).get(`/api/systems?${param}=YES`);
    expect(mockListSystems).toHaveBeenCalledWith(
      expect.objectContaining({ [param]: 'YES' })
    );
  });

  it('composes extended capability filters with AND via service args', async () => {
    mockListSystems.mockResolvedValue({ data: [], total: 0, totalPages: 0 });

    await request(app).get(
      '/api/systems?seasonSubscriptionsCapability=YES&dynamicPricingCapability=NO'
    );
    expect(mockListSystems).toHaveBeenCalledWith(
      expect.objectContaining({
        seasonSubscriptionsCapability: 'YES',
        dynamicPricingCapability: 'NO',
      })
    );
  });

  it.each(EXTENDED_CAPABILITY_KEYS)('returns 400 for invalid %s query value', async (param) => {
    const res = await request(app).get(`/api/systems?${param}=MAYBE`);
    expect(res.status).toBe(400);
    expect(res.body.error.fields.some(
      (f) => f.field === param && f.message === 'Select a valid option'
    )).toBe(true);
  });

  it('returns 400 for invalid page param', async () => {
    const res = await request(app).get('/api/systems?page=abc');
    expect(res.status).toBe(400);
    expect(res.body.error.fields[0].field).toBe('page');
  });

  it('returns 400 for limit exceeding max', async () => {
    const res = await request(app).get('/api/systems?limit=999');
    expect(res.status).toBe(400);
    expect(res.body.error.fields[0].field).toBe('limit');
  });

  it('returns 400 when q exceeds max length', async () => {
    const res = await request(app).get(`/api/systems?q=${'x'.repeat(201)}`);
    expect(res.status).toBe(400);
    expect(res.body.error.fields[0].field).toBe('q');
  });

  it('returns 400 when pagination offset exceeds safe integer range', async () => {
    const res = await request(app).get('/api/systems?page=562949953421312&limit=16000');
    expect(res.status).toBe(400);
    expect(res.body.error.fields.some(f => f.field === 'page')).toBe(true);
  });

  it('returns 400 for invalid sort', async () => {
    const res = await request(app).get('/api/systems?sort=notAllowed');
    expect(res.status).toBe(400);
    expect(res.body.error.fields.find((f) => f.field === 'sort')?.message).toMatch(/^Sort field must be one of: /);
    expect(mockListSystems).not.toHaveBeenCalled();
  });

  it('returns 400 for invalid order', async () => {
    const res = await request(app).get('/api/systems?order=upward');
    expect(res.status).toBe(400);
    expect(res.body.error.fields).toEqual(
      expect.arrayContaining([expect.objectContaining({ field: 'order', message: 'Order must be asc or desc' })]),
    );
    expect(mockListSystems).not.toHaveBeenCalled();
  });

  it('forwards validated sort and order with filters to the service', async () => {
    mockListSystems.mockResolvedValue({ data: [], total: 0, totalPages: 0 });
    const res = await request(app).get('/api/systems?geographic_focus=UK&sort=geographicFocus&order=desc');
    expect(res.status).toBe(200);
    expect(mockListSystems).toHaveBeenCalledWith(
      expect.objectContaining({ geographicFocus: 'UK', sort: 'geographicFocus', order: 'desc' }),
    );
  });

  it('returns 500 on unexpected service error', async () => {
    mockListSystems.mockRejectedValue(new Error('DB down'));

    const res = await request(app).get('/api/systems');
    expect(res.status).toBe(500);
    expect(res.body.error.message).toBe('An unexpected error occurred');
    expect(res.body.data).toBeNull();
    expect(res.body.meta).toBeNull();
  });
});

describe('GET /api/systems/:id', () => {
  beforeEach(() => {
    mockGetSystemById.mockReset();
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('returns 200 with system + organisations array', async () => {
    mockGetSystemById.mockResolvedValue(SYSTEM_DETAIL_STUB);

    const res = await request(app).get('/api/systems/aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee');
    expect(res.status).toBe(200);
    expect(res.body.error).toBeNull();
    expect(res.body.meta).toBeNull();
    expect(res.body.data.name).toBe('Spektrix');
    expect(Array.isArray(res.body.data.organisations)).toBe(true);
    expect(res.body.data.organisations[0].organisation.name).toBe('Royal Opera House');
  });

  it('returns 404 for non-existent system', async () => {
    mockGetSystemById.mockResolvedValue(null);

    const res = await request(app).get('/api/systems/aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee');
    expect(res.status).toBe(404);
    expect(res.body.data).toBeNull();
    expect(res.body.error.message).toBe('System not found');
    expect(res.body.error.fields).toEqual([]);
  });

  it('returns 404 for malformed (non-UUID) id', async () => {
    const res = await request(app).get('/api/systems/not-a-uuid');
    expect(res.status).toBe(404);
    expect(res.body.error.message).toBe('System not found');
  });

  it('returns 500 on unexpected service error', async () => {
    mockGetSystemById.mockRejectedValue(new Error('DB down'));

    const res = await request(app).get('/api/systems/aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee');
    expect(res.status).toBe(500);
    expect(res.body.error.message).toBe('An unexpected error occurred');
  });
});

describe('GET /api/systems — response shape', () => {
  beforeEach(() => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('response always has data, error, meta keys', async () => {
    mockListSystems.mockResolvedValue({ data: [], total: 0, totalPages: 0 });

    const res = await request(app).get('/api/systems');
    expect(res.body).toHaveProperty('data');
    expect(res.body).toHaveProperty('error');
    expect(res.body).toHaveProperty('meta');
  });
});

const VALID_UUID = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';

describe('POST /api/systems', () => {
  beforeEach(() => {
    mockCreateSystem.mockReset();
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('returns 201 with system DTO on valid body', async () => {
    mockCreateSystem.mockResolvedValue(SYSTEM_STUB);

    const res = await request(app)
      .post('/api/systems')
      .send({ name: 'Spektrix', vendor: 'Spektrix Ltd', category: 'INTEGRATED' });

    expect(res.status).toBe(201);
    expect(res.body.error).toBeNull();
    expect(res.body.meta).toBeNull();
    expect(res.body.data.name).toBe('Spektrix');
  });

  it('returns 400 when name is missing', async () => {
    const res = await request(app)
      .post('/api/systems')
      .send({ vendor: 'Spektrix Ltd', category: 'INTEGRATED' });

    expect(res.status).toBe(400);
    expect(res.body.data).toBeNull();
    expect(res.body.error.message).toBe('Validation failed');
    expect(res.body.error.fields[0].field).toBe('name');
  });

  it('returns 400 when vendor is missing', async () => {
    const res = await request(app)
      .post('/api/systems')
      .send({ name: 'Spektrix', category: 'INTEGRATED' });

    expect(res.status).toBe(400);
    expect(res.body.error.fields[0].field).toBe('vendor');
  });

  it('returns 400 for invalid category value', async () => {
    const res = await request(app)
      .post('/api/systems')
      .send({ name: 'Spektrix', vendor: 'Spektrix Ltd', category: 'INTEGRATEDX' });

    expect(res.status).toBe(400);
    expect(res.body.error.fields[0].field).toBe('category');
    expect(res.body.error.fields[0].message).toBe('Select a category');
  });

  it('returns 400 for non-object body', async () => {
    const res = await request(app)
      .post('/api/systems')
      .send('not json')
      .set('Content-Type', 'text/plain');

    expect(res.status).toBe(400);
  });

  it('strips server-managed keys before passing to service', async () => {
    mockCreateSystem.mockResolvedValue(SYSTEM_STUB);

    await request(app)
      .post('/api/systems')
      .send({
        name: 'Spektrix',
        vendor: 'Spektrix Ltd',
        category: 'INTEGRATED',
        id: 'should-be-stripped',
        last_updated: '2020-01-01',
      });

    expect(mockCreateSystem).toHaveBeenCalled();
    const receivedPayload = mockCreateSystem.mock.calls[0][0];
    expect(receivedPayload).not.toHaveProperty('id');
    expect(receivedPayload).not.toHaveProperty('last_updated');
    expect(receivedPayload).not.toHaveProperty('custom_attributes');
    expect(receivedPayload).not.toHaveProperty('customAttributes');
  });

  it('returns 409 when service throws P2002 (duplicate name)', async () => {
    const p2002 = Object.assign(new Error('Unique constraint'), { code: 'P2002' });
    mockCreateSystem.mockRejectedValue(p2002);

    const res = await request(app)
      .post('/api/systems')
      .send({ name: 'Spektrix', vendor: 'Spektrix Ltd', category: 'INTEGRATED' });

    expect(res.status).toBe(409);
    expect(res.body.data).toBeNull();
    expect(res.body.meta).toBeNull();
    expect(res.body.error.fields[0].field).toBe('name');
    expect(res.body.error.fields[0].message).toBe('A system with this name already exists');
  });

  it('returns 500 on unexpected service error', async () => {
    mockCreateSystem.mockRejectedValue(new Error('DB down'));

    const res = await request(app)
      .post('/api/systems')
      .send({ name: 'Spektrix', vendor: 'Spektrix Ltd', category: 'INTEGRATED' });

    expect(res.status).toBe(500);
    expect(res.body.error.message).toBe('An unexpected error occurred');
  });
});

const MINIMAL_CREATE_BODY = { name: 'Spektrix', vendor: 'Spektrix Ltd', category: 'INTEGRATED' };

describe('POST /api/systems — extended capabilities', () => {
  beforeEach(() => {
    mockCreateSystem.mockReset();
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it.each(EXTENDED_CAPABILITY_KEYS)('POST normalises lowercase yes for %s (201 + service payload)', async (key) => {
    mockCreateSystem.mockResolvedValue({ ...SYSTEM_STUB, [key]: 'YES' });

    const res = await request(app)
      .post('/api/systems')
      .send({ ...MINIMAL_CREATE_BODY, [key]: 'yes' });

    expect(res.status).toBe(201);
    expect(res.body.data[key]).toBe('YES');
    expect(mockCreateSystem).toHaveBeenCalledWith(expect.objectContaining({ [key]: 'YES' }));
  });

  it('accepts season_subscriptions_capability snake_case alias on create', async () => {
    mockCreateSystem.mockResolvedValue({ ...SYSTEM_STUB, seasonSubscriptionsCapability: 'YES' });

    const res = await request(app)
      .post('/api/systems')
      .send({ ...MINIMAL_CREATE_BODY, season_subscriptions_capability: 'YES' });

    expect(res.status).toBe(201);
    expect(mockCreateSystem).toHaveBeenCalledWith(
      expect.objectContaining({ seasonSubscriptionsCapability: 'YES' })
    );
  });

  it.each(EXTENDED_CAPABILITY_KEYS)('returns 400 when %s is MAYBE', async (key) => {
    const res = await request(app)
      .post('/api/systems')
      .send({ ...MINIMAL_CREATE_BODY, [key]: 'MAYBE' });

    expect(res.status).toBe(400);
    expect(res.body.error.fields.some(
      (f) => f.field === key && f.message === 'Must be YES, NO, or UNKNOWN'
    )).toBe(true);
  });
});

describe('POST /api/systems — fieldSources', () => {
  const minimalBody = { name: 'Spektrix', vendor: 'Spektrix Ltd', category: 'INTEGRATED' };

  beforeEach(() => {
    mockCreateSystem.mockReset();
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('returns 201 and passes validated fieldSources to service (round-trip)', async () => {
    const stub = { ...SYSTEM_STUB, fieldSources: { vendor: 'https://example.com/doc' } };
    mockCreateSystem.mockResolvedValue(stub);

    const res = await request(app)
      .post('/api/systems')
      .send({ ...minimalBody, fieldSources: { vendor: 'https://example.com/doc' } });

    expect(res.status).toBe(201);
    expect(res.body.data.fieldSources).toEqual({ vendor: 'https://example.com/doc' });
    expect(mockCreateSystem).toHaveBeenCalledWith(
      expect.objectContaining({ fieldSources: { vendor: 'https://example.com/doc' } }),
    );
  });

  it('returns 400 for unknown fieldSources key', async () => {
    const res = await request(app)
      .post('/api/systems')
      .send({ ...minimalBody, fieldSources: { notARealKey: 'https://x.com' } });

    expect(res.status).toBe(400);
    expect(res.body.error.fields.some((f) => f.field === 'fieldSources.notARealKey')).toBe(true);
  });

  it('returns 400 when fieldSources URL does not start with http:// or https://', async () => {
    const res = await request(app)
      .post('/api/systems')
      .send({ ...minimalBody, fieldSources: { vendor: 'ftp://example.com/x' } });

    expect(res.status).toBe(400);
    expect(res.body.error.fields.some(
      (f) => f.field === 'fieldSources.vendor'
        && f.message === 'Source URL must start with http:// or https://'
    )).toBe(true);
  });

  it('returns 400 when fieldSources is not a plain object', async () => {
    const res = await request(app).post('/api/systems').send({ ...minimalBody, fieldSources: [] });

    expect(res.status).toBe(400);
    expect(
      res.body.error.fields.some(
        (f) => f.field === 'fieldSources' && f.message === 'Must be an object.',
      ),
    ).toBe(true);
  });
});

describe('POST /api/systems — customAttributes', () => {
  const minimalBody = { name: 'Spektrix', vendor: 'Spektrix Ltd', category: 'INTEGRATED' };

  beforeEach(() => {
    mockCreateSystem.mockReset();
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('returns 201 and passes cleaned customAttributes to service (round-trip)', async () => {
    const attrs = [
      { label: '  Footprint ', value: ' Mid ', sourceReference: 'https://example.com/a' },
    ];
    const stub = {
      ...SYSTEM_STUB,
      customAttributes: [{ label: 'Footprint', value: 'Mid', sourceReference: 'https://example.com/a' }],
    };
    mockCreateSystem.mockResolvedValue(stub);

    const res = await request(app)
      .post('/api/systems')
      .send({
        ...minimalBody,
        customAttributes: attrs,
      });

    expect(res.status).toBe(201);
    expect(res.body.data.customAttributes).toEqual(stub.customAttributes);
    expect(mockCreateSystem).toHaveBeenCalledWith(
      expect.objectContaining({
        customAttributes: [{ label: 'Footprint', value: 'Mid', sourceReference: 'https://example.com/a' }],
      }),
    );
  });

  it('strips unknown keys on each element before persist', async () => {
    mockCreateSystem.mockResolvedValue({
      ...SYSTEM_STUB,
      customAttributes: [{ label: 'L', value: 'V' }],
    });

    const res = await request(app)
      .post('/api/systems')
      .send({
        ...minimalBody,
        customAttributes: [{ label: 'L', value: 'V', extra: 'drop-me' }],
      });

    expect(res.status).toBe(201);
    expect(mockCreateSystem).toHaveBeenCalledWith(
      expect.objectContaining({ customAttributes: [{ label: 'L', value: 'V' }] }),
    );
  });

  it('drops rows where label and value are both empty after trim', async () => {
    mockCreateSystem.mockResolvedValue({
      ...SYSTEM_STUB,
      customAttributes: [{ label: 'Keep', value: 'Yes' }],
    });

    const res = await request(app)
      .post('/api/systems')
      .send({
        ...minimalBody,
        customAttributes: [{ label: '   ', value: '   ' }, { label: 'Keep', value: 'Yes' }],
      });

    expect(res.status).toBe(201);
    expect(mockCreateSystem).toHaveBeenCalledWith(
      expect.objectContaining({ customAttributes: [{ label: 'Keep', value: 'Yes' }] }),
    );
  });

  it('sets customAttributes null in service payload when array is empty', async () => {
    mockCreateSystem.mockResolvedValue({ ...SYSTEM_STUB, customAttributes: null });

    const res = await request(app)
      .post('/api/systems')
      .send({ ...minimalBody, customAttributes: [] });

    expect(res.status).toBe(201);
    expect(mockCreateSystem).toHaveBeenCalledWith(expect.objectContaining({ customAttributes: null }));
  });

  it('all-whitespace-only rows strip to empty array then null', async () => {
    mockCreateSystem.mockResolvedValue({ ...SYSTEM_STUB, customAttributes: null });

    const res = await request(app)
      .post('/api/systems')
      .send({ ...minimalBody, customAttributes: [{ label: ' ', value: ' ' }] });

    expect(res.status).toBe(201);
    expect(mockCreateSystem).toHaveBeenCalledWith(expect.objectContaining({ customAttributes: null }));
  });

  it('returns 400 when customAttributes is not an array', async () => {
    const res = await request(app)
      .post('/api/systems')
      .send({ ...minimalBody, customAttributes: {} });

    expect(res.status).toBe(400);
    expect(res.body.error.fields.some(
      (f) => f.field === 'customAttributes' && f.message === 'Must be an array.',
    )).toBe(true);
  });

  it('returns 400 when an element is not a plain object', async () => {
    const res = await request(app)
      .post('/api/systems')
      .send({ ...minimalBody, customAttributes: [[]] });

    expect(res.status).toBe(400);
    expect(res.body.error.fields[0].field).toBe('customAttributes[0]');
    expect(res.body.error.fields[0].message).toBe('Must be a plain object.');
  });

  it('returns 400 when label empty but value set', async () => {
    const res = await request(app)
      .post('/api/systems')
      .send({ ...minimalBody, customAttributes: [{ label: '  ', value: 'x' }] });

    expect(res.status).toBe(400);
    expect(res.body.error.fields.some((f) => f.field === 'customAttributes[0].label')).toBe(true);
  });

  it('returns 400 when value empty but label set', async () => {
    const res = await request(app)
      .post('/api/systems')
      .send({ ...minimalBody, customAttributes: [{ label: 'L', value: '  ' }] });

    expect(res.status).toBe(400);
    expect(res.body.error.fields.some((f) => f.field === 'customAttributes[0].value')).toBe(true);
  });

  it('returns 400 when label exceeds 200 chars', async () => {
    const res = await request(app)
      .post('/api/systems')
      .send({ ...minimalBody, customAttributes: [{ label: 'x'.repeat(201), value: 'y' }] });

    expect(res.status).toBe(400);
    expect(res.body.error.fields.some((f) => f.field === 'customAttributes[0].label')).toBe(true);
  });

  it('returns 400 when value exceeds 200 chars', async () => {
    const res = await request(app)
      .post('/api/systems')
      .send({ ...minimalBody, customAttributes: [{ label: 'L', value: 'x'.repeat(201) }] });

    expect(res.status).toBe(400);
    expect(res.body.error.fields.some((f) => f.field === 'customAttributes[0].value')).toBe(true);
  });

  it('returns 400 when sourceReference is non-empty and not http(s)', async () => {
    const res = await request(app)
      .post('/api/systems')
      .send({
        ...minimalBody,
        customAttributes: [{ label: 'L', value: 'V', sourceReference: 'ftp://x.com' }],
      });

    expect(res.status).toBe(400);
    expect(res.body.error.fields.some(
      (f) => f.field === 'customAttributes[0].sourceReference'
        && f.message === 'Source URL must start with http:// or https://',
    )).toBe(true);
  });

  it('accepts uppercase HTTP scheme on sourceReference and normalises to lowercase prefix', async () => {
    mockCreateSystem.mockResolvedValue({
      ...SYSTEM_STUB,
      customAttributes: [{ label: 'L', value: 'V', sourceReference: 'http://example.com/x' }],
    });

    const res = await request(app)
      .post('/api/systems')
      .send({
        ...minimalBody,
        customAttributes: [{ label: 'L', value: 'V', sourceReference: 'HTTP://example.com/x' }],
      });

    expect(res.status).toBe(201);
    expect(mockCreateSystem).toHaveBeenCalledWith(
      expect.objectContaining({
        customAttributes: [{ label: 'L', value: 'V', sourceReference: 'http://example.com/x' }],
      }),
    );
  });

  it('returns 400 when sourceReference exceeds 500 chars', async () => {
    const longUrl = `https://example.com/${'x'.repeat(490)}`;
    const res = await request(app)
      .post('/api/systems')
      .send({
        ...minimalBody,
        customAttributes: [{ label: 'L', value: 'V', sourceReference: longUrl }],
      });

    expect(res.status).toBe(400);
    expect(res.body.error.fields.some((f) => f.field === 'customAttributes[0].sourceReference')).toBe(true);
  });

  it('accepts custom_attributes snake_case key as alias', async () => {
    mockCreateSystem.mockResolvedValue({
      ...SYSTEM_STUB,
      customAttributes: [{ label: 'A', value: 'B' }],
    });

    const res = await request(app)
      .post('/api/systems')
      .send({
        ...minimalBody,
        custom_attributes: [{ label: 'A', value: 'B' }],
      });

    expect(res.status).toBe(201);
    expect(mockCreateSystem).toHaveBeenCalledWith(
      expect.objectContaining({ customAttributes: [{ label: 'A', value: 'B' }] }),
    );
  });

  it('returns 400 when both customAttributes and custom_attributes are sent', async () => {
    const res = await request(app)
      .post('/api/systems')
      .send({
        ...minimalBody,
        customAttributes: [{ label: 'A', value: 'B' }],
        custom_attributes: [{ label: 'C', value: 'D' }],
      });

    expect(res.status).toBe(400);
    expect(res.body.error.fields.some(
      (f) => f.field === 'customAttributes'
        && f.message === 'Cannot provide both customAttributes and custom_attributes.',
    )).toBe(true);
    expect(mockCreateSystem).not.toHaveBeenCalled();
  });

  it('returns 400 when label is not a string', async () => {
    const res = await request(app)
      .post('/api/systems')
      .send({ ...minimalBody, customAttributes: [{ label: 1, value: 'v' }] });

    expect(res.status).toBe(400);
    expect(res.body.error.fields.some((f) => f.field === 'customAttributes[0].label')).toBe(true);
  });

  it('returns 400 when sourceReference is not a string', async () => {
    const res = await request(app)
      .post('/api/systems')
      .send({ ...minimalBody, customAttributes: [{ label: 'L', value: 'V', sourceReference: 1 }] });

    expect(res.status).toBe(400);
    expect(res.body.error.fields.some((f) => f.field === 'customAttributes[0].sourceReference')).toBe(true);
  });
});

describe('PUT /api/systems/:id', () => {
  beforeEach(() => {
    mockUpdateSystem.mockReset();
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('returns 200 with updated system DTO on valid partial body', async () => {
    mockUpdateSystem.mockResolvedValue({ ...SYSTEM_STUB, name: 'Updated Name' });

    const res = await request(app)
      .put(`/api/systems/${VALID_UUID}`)
      .send({ name: 'Updated Name' });

    expect(res.status).toBe(200);
    expect(res.body.error).toBeNull();
    expect(res.body.meta).toBeNull();
    expect(res.body.data.name).toBe('Updated Name');
  });

  it('returns 200 on empty body (no-op) when service returns current DTO', async () => {
    mockUpdateSystem.mockResolvedValue(SYSTEM_STUB);

    const res = await request(app).put(`/api/systems/${VALID_UUID}`).send({});

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual(SYSTEM_STUB);
    expect(mockUpdateSystem).toHaveBeenCalledWith(VALID_UUID, expect.any(Object));
  });

  it('maps membershipCapability null to UNKNOWN for service', async () => {
    mockUpdateSystem.mockResolvedValue(SYSTEM_STUB);

    await request(app)
      .put(`/api/systems/${VALID_UUID}`)
      .send({ membershipCapability: null });

    expect(mockUpdateSystem).toHaveBeenCalledWith(
      VALID_UUID,
      expect.objectContaining({ membershipCapability: 'UNKNOWN' })
    );
  });

  it('returns 404 for non-UUID :id', async () => {
    const res = await request(app)
      .put('/api/systems/not-a-uuid')
      .send({ name: 'Updated' });

    expect(res.status).toBe(404);
    expect(res.body.error.message).toBe('System not found');
  });

  it('returns 404 when service returns null (system not found)', async () => {
    mockUpdateSystem.mockResolvedValue(null);

    const res = await request(app)
      .put(`/api/systems/${VALID_UUID}`)
      .send({ name: 'Updated' });

    expect(res.status).toBe(404);
    expect(res.body.error.message).toBe('System not found');
  });

  it('returns 409 when service throws P2002 (duplicate name)', async () => {
    const p2002 = Object.assign(new Error('Unique constraint'), { code: 'P2002' });
    mockUpdateSystem.mockRejectedValue(p2002);

    const res = await request(app)
      .put(`/api/systems/${VALID_UUID}`)
      .send({ name: 'Tessitura' });

    expect(res.status).toBe(409);
    expect(res.body.error.fields[0].field).toBe('name');
    expect(res.body.error.message).toBe('A system with this name already exists');
  });

  it('returns 400 for invalid category value on update', async () => {
    const res = await request(app)
      .put(`/api/systems/${VALID_UUID}`)
      .send({ category: 'BADCATEGORY' });

    expect(res.status).toBe(400);
    expect(res.body.error.fields[0].field).toBe('category');
  });

  it.each(EXTENDED_CAPABILITY_KEYS)('PUT normalises lowercase yes for %s', async (key) => {
    mockUpdateSystem.mockResolvedValue({ ...SYSTEM_STUB, [key]: 'YES' });

    const res = await request(app)
      .put(`/api/systems/${VALID_UUID}`)
      .send({ [key]: 'yes' });

    expect(res.status).toBe(200);
    expect(res.body.data[key]).toBe('YES');
    expect(mockUpdateSystem).toHaveBeenCalledWith(
      VALID_UUID,
      expect.objectContaining({ [key]: 'YES' })
    );
  });

  it.each(EXTENDED_CAPABILITY_KEYS)('returns 400 when PUT %s is MAYBE', async (key) => {
    const res = await request(app)
      .put(`/api/systems/${VALID_UUID}`)
      .send({ [key]: 'MAYBE' });

    expect(res.status).toBe(400);
    expect(res.body.error.fields.some(
      (f) => f.field === key && f.message === 'Must be YES, NO, or UNKNOWN'
    )).toBe(true);
  });

  it('strips server-managed keys before passing to service', async () => {
    mockUpdateSystem.mockResolvedValue(SYSTEM_STUB);

    await request(app)
      .put(`/api/systems/${VALID_UUID}`)
      .send({ name: 'New Name', id: 'injected' });

    const receivedPayload = mockUpdateSystem.mock.calls[0][1];
    expect(receivedPayload).not.toHaveProperty('id');
    expect(receivedPayload).not.toHaveProperty('custom_attributes');
    expect(receivedPayload).not.toHaveProperty('customAttributes');
  });

  it('returns 500 on unexpected service error', async () => {
    mockUpdateSystem.mockRejectedValue(new Error('DB down'));

    const res = await request(app)
      .put(`/api/systems/${VALID_UUID}`)
      .send({ name: 'Updated' });

    expect(res.status).toBe(500);
    expect(res.body.error.message).toBe('An unexpected error occurred');
  });

  it('passes fieldSources: {} to clear stored sources', async () => {
    mockUpdateSystem.mockResolvedValue({ ...SYSTEM_STUB, fieldSources: {} });

    const res = await request(app)
      .put(`/api/systems/${VALID_UUID}`)
      .send({ fieldSources: {} });

    expect(res.status).toBe(200);
    expect(mockUpdateSystem).toHaveBeenCalledWith(
      VALID_UUID,
      expect.objectContaining({ fieldSources: {} }),
    );
  });

  it('omits fieldSources from update payload when key not in body', async () => {
    mockUpdateSystem.mockResolvedValue(SYSTEM_STUB);

    await request(app).put(`/api/systems/${VALID_UUID}`).send({ name: 'Only Name' });

    const payload = mockUpdateSystem.mock.calls[0][1];
    expect(payload).not.toHaveProperty('fieldSources');
  });

  it('passes customAttributes: null when body sends empty array (clear)', async () => {
    mockUpdateSystem.mockResolvedValue({ ...SYSTEM_STUB, customAttributes: null });

    const res = await request(app)
      .put(`/api/systems/${VALID_UUID}`)
      .send({ customAttributes: [] });

    expect(res.status).toBe(200);
    expect(mockUpdateSystem).toHaveBeenCalledWith(
      VALID_UUID,
      expect.objectContaining({ customAttributes: null }),
    );
  });

  it('omits customAttributes from update payload when key not in body (preserve)', async () => {
    mockUpdateSystem.mockResolvedValue(SYSTEM_STUB);

    await request(app).put(`/api/systems/${VALID_UUID}`).send({ name: 'Only Name' });

    const payload = mockUpdateSystem.mock.calls[0][1];
    expect(payload).not.toHaveProperty('customAttributes');
  });

  it('PUT round-trip passes cleaned customAttributes to service', async () => {
    const next = { ...SYSTEM_STUB, customAttributes: [{ label: 'A', value: 'B' }] };
    mockUpdateSystem.mockResolvedValue(next);

    const res = await request(app)
      .put(`/api/systems/${VALID_UUID}`)
      .send({ customAttributes: [{ label: ' A ', value: ' B ' }] });

    expect(res.status).toBe(200);
    expect(mockUpdateSystem).toHaveBeenCalledWith(
      VALID_UUID,
      expect.objectContaining({ customAttributes: [{ label: 'A', value: 'B' }] }),
    );
  });

  it('returns 400 when PUT sends both customAttributes and custom_attributes', async () => {
    const res = await request(app)
      .put(`/api/systems/${VALID_UUID}`)
      .send({
        customAttributes: [{ label: 'A', value: 'B' }],
        custom_attributes: [{ label: 'C', value: 'D' }],
      });

    expect(res.status).toBe(400);
    expect(res.body.error.fields.some(
      (f) => f.field === 'customAttributes'
        && f.message === 'Cannot provide both customAttributes and custom_attributes.',
    )).toBe(true);
    expect(mockUpdateSystem).not.toHaveBeenCalled();
  });
});

describe('DELETE /api/systems/:id', () => {
  beforeEach(() => {
    mockDeleteSystem.mockReset();
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('returns 200 with { data: { id } } on successful delete', async () => {
    mockDeleteSystem.mockResolvedValue(VALID_UUID);

    const res = await request(app).delete(`/api/systems/${VALID_UUID}`);

    expect(res.status).toBe(200);
    expect(res.body.error).toBeNull();
    expect(res.body.meta).toBeNull();
    expect(res.body.data).toEqual({ id: VALID_UUID });
  });

  it('returns 404 for non-UUID :id', async () => {
    const res = await request(app).delete('/api/systems/not-a-uuid');

    expect(res.status).toBe(404);
    expect(res.body.error.message).toBe('System not found');
  });

  it('returns 404 when service returns null (system not found)', async () => {
    mockDeleteSystem.mockResolvedValue(null);

    const res = await request(app).delete(`/api/systems/${VALID_UUID}`);

    expect(res.status).toBe(404);
    expect(res.body.error.message).toBe('System not found');
  });

  it('returns 409 with linkedOrganisationCount when service throws SYSTEM_HAS_LINKS', async () => {
    mockDeleteSystem.mockRejectedValue({ code: 'SYSTEM_HAS_LINKS', linkedOrganisationCount: 3 });

    const res = await request(app).delete(`/api/systems/${VALID_UUID}`);

    expect(res.status).toBe(409);
    expect(res.body.data).toBeNull();
    expect(res.body.meta).toBeNull();
    expect(res.body.error.linkedOrganisationCount).toBe(3);
    expect(res.body.error.message).toContain('3 organisations');
  });

  it('uses singular organisation when linkedOrganisationCount is 1', async () => {
    mockDeleteSystem.mockRejectedValue({ code: 'SYSTEM_HAS_LINKS', linkedOrganisationCount: 1 });

    const res = await request(app).delete(`/api/systems/${VALID_UUID}`);

    expect(res.status).toBe(409);
    expect(res.body.error.message).toContain('1 organisation');
    expect(res.body.error.message).not.toContain('1 organisations');
  });

  it('returns 500 on unexpected service error', async () => {
    mockDeleteSystem.mockRejectedValue(new Error('DB down'));

    const res = await request(app).delete(`/api/systems/${VALID_UUID}`);

    expect(res.status).toBe(500);
    expect(res.body.error.message).toBe('An unexpected error occurred');
  });
});
