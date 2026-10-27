const request = require('supertest');
const app = require('../../../Server/app');

// Week 9: every endpoint needs an API key. The tests register their own key, so they
// don't depend on (or reveal) the real keys in server/.env.
const TEST_KEY = 'jest-test-key';
process.env.API_KEYS = TEST_KEY;

// Sends the key header on every request
const api = () => ({
  get: (path) => request(app).get(path).set('X-API-Key', TEST_KEY),
  post: (path) => request(app).post(path).set('X-API-Key', TEST_KEY),
  put: (path) => request(app).put(path).set('X-API-Key', TEST_KEY),
  delete: (path) => request(app).delete(path).set('X-API-Key', TEST_KEY),
});

describe('API key authentication (Week 9)', () => {
  it('rejects a request with no key: 401 and a JSON error', async () => {
    const res = await request(app).get('/jobs');

    expect(res.status).toBe(401);
    expect(res.body).toEqual({ error: 'Missing or invalid API key' });
  });

  it('rejects a request with a wrong key: 401', async () => {
    const res = await request(app).get('/jobs').set('X-API-Key', 'wrong-key');

    expect(res.status).toBe(401);
  });

  it('accepts a request with a valid key: 200', async () => {
    const res = await request(app).get('/jobs').set('X-API-Key', TEST_KEY);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('does not save anything when a write has no key', async () => {
    const res = await request(app).post('/jobs').send({ title: 'No key job', category: 'x', location: 'y', pay: 1 });
    expect(res.status).toBe(401);

    const list = await api().get('/jobs');
    expect(list.body.some((j) => j.title === 'No key job')).toBe(false);
  });
});

const SEED = {
  workerId: 1,          
  jobId: 1,             
  bookingId: 1,         
  trade: 'plumbing',            // matches server/schema.sql: John Kamau, verified plumber
  location: 'Westlands, Nairobi',
};

const MISSING_ID = 999999;

const validJob = () => ({
  title: 'Cook for a funeral committee',
  category: 'cooking',
  location: 'Nairobi',
  pay: 1500,
  employerId: 1,
});

afterAll(() => require('../../../Server/server/db').end());

describe('GET /users (filtered verified workers)', () => {
  it('happy path: returns verified workers matching trade and location', async () => {
    const res = await api().get('/users').query({
      role: 'worker',
      trade: SEED.trade,
      location: SEED.location,
      verified: true,
    });
 
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
 
    res.body.forEach((u) => {
      expect(u).toHaveProperty('id');
      expect(u.role).toBe('worker');
      expect(u.trade).toBe(SEED.trade);
      expect(u.location).toBe(SEED.location);
      expect(u.verified).toBe(true);
    });
  });
 
  it('edge case: returns 200 and an empty array when nobody matches', async () => {
    const res = await api().get('/users').query({
      role: 'worker',
      trade: 'no-such-trade',
      location: SEED.location,
      verified: true,
    });
 
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });
 
  it('edge case: filter is applied (different trade gives different results)', async () => {
    const res = await api().get('/users').query({
      role: 'worker',
      trade: 'no-such-trade',
      verified: true,
    });
 
    expect(res.status).toBe(200);
    res.body.forEach((u) => expect(u.trade).toBe('no-such-trade'));
  });
});


describe('POST /jobs', () => {
  it('happy path: creates a job and returns it with an id', async () => {
    const body = validJob();
    const res = await api().post('/jobs').send(body);
 
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('id');
    expect(res.body.category).toBe(body.category);
    expect(res.body.location).toBe(body.location);
    expect(res.body.pay).toBe(body.pay);
    expect(typeof res.body.pay).toBe('number');
  });
 
  it('happy path: the created job can be fetched afterwards via its bookings route', async () => {
    const created = await api().post('/jobs').send(validJob());
    const res = await api().get(`/jobs/${created.body.id}/bookings`);
 
    expect(res.status).toBe(200);
  });
 
  it.each(['category', 'location', 'pay'])(
    'validation: rejects a job missing "%s"',
    async (field) => {
      const body = validJob();
      delete body[field];
      const res = await api().post('/jobs').send(body);
 
      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error');
    }
  );
 
  it('validation: rejects pay of the wrong type', async () => {
    const res = await api()
      .post('/jobs')
      .send({ ...validJob(), pay: 'lots' });
 
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });
 
  it('edge case: rejects a negative pay', async () => {
    const res = await api()
      .post('/jobs')
      .send({ ...validJob(), pay: -100 });
 
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });
 
  it('edge case: rejects an empty body', async () => {
    const res = await api().post('/jobs').send({});
 
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });
});


describe('GET /jobs/:id/bookings', () => {
  it('happy path: lists bookings for a job, each with an id and status', async () => {
    const res = await api().get(`/jobs/${SEED.jobId}/bookings`);
 
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
 
    res.body.forEach((b) => {
      expect(b).toHaveProperty('id');
      expect(b).toHaveProperty('status');
      expect(typeof b.status).toBe('string');
    });
  });
 
  it('not found: returns 404 for a job that does not exist', async () => {
    const res = await api().get(`/jobs/${MISSING_ID}/bookings`);
 
    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty('error');
  });
 
  it('edge case: a brand-new job has an empty bookings list (200, [])', async () => {
    const created = await api().post('/jobs').send(validJob());
    const res = await api().get(`/jobs/${created.body.id}/bookings`);
 
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });
});


describe('GET /bookings/:id', () => {
  it('happy path: returns a single booking with its status', async () => {
    const res = await api().get(`/bookings/${SEED.bookingId}`);
 
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('id');
    expect(res.body).toHaveProperty('status');
    expect(typeof res.body.status).toBe('string');
  });
 
  it('not found: returns 404 for a booking that does not exist', async () => {
    const res = await api().get(`/bookings/${MISSING_ID}`);
 
    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty('error');
  });
 
  it('edge case: a malformed id is rejected (400 or 404), never a 200 or 500', async () => {
    const res = await api().get('/bookings/not-an-id');
 
    expect([400, 404]).toContain(res.status);
  });
});


describe('GET /users/:id', () => {
  it('happy path: returns a worker profile with verification details', async () => {
    const res = await api().get(`/users/${SEED.workerId}`);
 
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('id');
    expect(res.body).toHaveProperty('role');
    expect(res.body).toHaveProperty('verified');
    expect(typeof res.body.verified).toBe('boolean');
  });
 
  it('not found: returns 404 for a user that does not exist', async () => {
    const res = await api().get(`/users/${MISSING_ID}`);
 
    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty('error');
  });
 
  it('edge case: a malformed id is rejected (400 or 404), never a 200 or 500', async () => {
    const res = await api().get('/users/not-an-id');
 
    expect([400, 404]).toContain(res.status);
  });
});

afterAll(async () => {
  try {
    await require('../../../Server/server/db').end();
  } catch (e) {
    // pool already closed, nothing to do
  }
});