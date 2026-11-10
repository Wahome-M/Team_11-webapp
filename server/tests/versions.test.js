// Week 13: v1 is frozen, v2 has the new { data, count } envelope, and v1 announces its sunset.
// Week 12: /stats needs a key and counts requests.
// Needs MySQL with the sample data from schema.sql (node server/setup-db.js --yes).
process.env.API_KEYS = 'test-key';
const request = require('supertest');
const app = require('../app');

const KEY = { 'X-API-Key': 'test-key' };
const V1_JOB_FIELDS = ['category', 'description', 'duration', 'employer', 'employerId', 'id',
  'isActive', 'location', 'pay', 'payType', 'title', 'urgent'];

describe('v1 is frozen', () => {
  test('GET /v1/jobs is still a bare list with the original fields', async () => {
    const res = await request(app).get('/v1/jobs').set(KEY);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(Object.keys(res.body[0]).sort()).toEqual(V1_JOB_FIELDS);
  });

  test('old unversioned /jobs answers exactly like /v1/jobs', async () => {
    const a = await request(app).get('/jobs').set(KEY);
    const b = await request(app).get('/v1/jobs').set(KEY);
    expect(a.status).toBe(200);
    expect(a.body).toEqual(b.body);
  });

  test('v1 single user is a bare object', async () => {
    const res = await request(app).get('/v1/users/1').set(KEY);
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(1);
    expect(res.body.data).toBeUndefined();
  });

  test('v1 error shape is unchanged', async () => {
    const res = await request(app).get('/v1/users/99999').set(KEY);
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: 'User not found' });
  });
});

describe('v2 has the new shape', () => {
  test('lists are wrapped in { data, count }', async () => {
    const res = await request(app).get('/v2/jobs').set(KEY);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.count).toBe(res.body.data.length);
    expect(Object.keys(res.body.data[0]).sort()).toEqual(V1_JOB_FIELDS); // same fields inside
  });

  test('filters still work on v2', async () => {
    const res = await request(app).get('/v2/users?role=worker&trade=plumbing&verified=true').set(KEY);
    expect(res.status).toBe(200);
    expect(res.body.data.every((u) => u.trade === 'plumbing' && u.verified)).toBe(true);
  });

  test('single items are wrapped in { data }', async () => {
    const res = await request(app).get('/v2/users/1').set(KEY);
    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(1);
  });

  test('errors keep the same { error } shape', async () => {
    const res = await request(app).get('/v2/users/99999').set(KEY);
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: 'User not found' });
  });

  test('v2 needs an API key like everything else', async () => {
    const res = await request(app).get('/v2/jobs');
    expect(res.status).toBe(401);
  });
});

describe('deprecation headers', () => {
  test('v1 and the old URLs announce the sunset and point to v2', async () => {
    for (const path of ['/v1/jobs', '/jobs', '/v1/users/1', '/users/1']) {
      const res = await request(app).get(path).set(KEY);
      expect(res.headers.deprecation).toBe('true');
      expect(res.headers.sunset).toBe('Fri, 20 Nov 2026 00:00:00 GMT');
      expect(res.headers.link).toMatch(/^<\/v2\/(jobs|users\/1)>; rel="successor-version"$/);
    }
  });

  test('v2 and unknown paths do not carry them', async () => {
    for (const path of ['/v2/jobs', '/nope']) {
      const res = await request(app).get(path).set(KEY);
      expect(res.headers.deprecation).toBeUndefined();
    }
  });
});

describe('/stats (Week 12)', () => {
  test('needs a key', async () => {
    const res = await request(app).get('/stats');
    expect(res.status).toBe(401);
  });

  test('counts requests per route pattern, with v1 and v2 as separate rows', async () => {
    const res = await request(app).get('/stats').set(KEY);
    expect(res.status).toBe(200);
    expect(res.body.total).toBeGreaterThan(0);
    expect(res.body.routes['GET /v1/jobs'].count).toBeGreaterThan(0);
    expect(res.body.routes['GET /v2/jobs'].count).toBeGreaterThan(0);
    expect(res.body.routes['GET /v1/users/:id']).toBeDefined(); // pattern, not /v1/users/1
    expect(res.body).toHaveProperty('errorRatePercent');
  });
});
