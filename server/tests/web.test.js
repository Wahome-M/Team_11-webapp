// The website's /web routes: public signup/login/jobs, and session tokens for everything else.
// Needs MySQL with the sample data (Peter Mwangi, id 2, is the seed employer).
process.env.API_KEYS = 'test-key';
const request = require('supertest');
const app = require('../app');

const stamp = Date.now();
let worker; let employer; let jobId;

beforeAll(async () => {
  const signup = await request(app).post('/web/signup').send({
    firstName: 'Test', lastName: 'Worker', email: `web-worker-${stamp}@example.com`,
    password: 'password123', role: 'worker', trade: 'painting', location: 'Kilimani, Nairobi',
  });
  worker = signup.body;
  const login = await request(app).post('/web/login').send({ email: 'peter@example.com', password: 'password123' });
  employer = login.body;
});

const as = (who) => ({ Authorization: `Bearer ${who.token}` });

test('signup and login return a session token, never a password', () => {
  expect(worker.token).toEqual(expect.any(String));
  expect(employer.token).toEqual(expect.any(String));
  expect(worker.password).toBeUndefined();
  expect(worker.verified).toBe(false);
});

test('a wrong password gets 401 and no token', async () => {
  const res = await request(app).post('/web/login').send({ email: 'peter@example.com', password: 'nope' });
  expect(res.status).toBe(401);
  expect(res.body.token).toBeUndefined();
});

test('the job list is public', async () => {
  const res = await request(app).get('/web/jobs');
  expect(res.status).toBe(200);
  expect(Array.isArray(res.body)).toBe(true);
});

test('an employer posts a job; the server sets who posted it', async () => {
  const res = await request(app).post('/web/jobs').set(as(employer)).send({
    title: 'Web test job', category: 'painting', location: 'Kilimani, Nairobi', pay: 3000,
    employerId: 999, // ignored: taken from the session
  });
  expect(res.status).toBe(201);
  expect(res.body.employerId).toBe(employer.id);
  jobId = res.body.id;
});

test('a worker cannot post a job (403)', async () => {
  const res = await request(app).post('/web/jobs').set(as(worker)).send({ title: 'x', category: 'x', location: 'x', pay: 1 });
  expect(res.status).toBe(403);
});

test('no token or a tampered token gets 401', async () => {
  expect((await request(app).post('/web/bookings').send({ jobId })).status).toBe(401);
  const tampered = { Authorization: `Bearer ${worker.token}x` };
  expect((await request(app).post('/web/bookings').set(tampered).send({ jobId })).status).toBe(401);
});

test('a worker applies once; applying again gets 409', async () => {
  const first = await request(app).post('/web/bookings').set(as(worker)).send({ jobId });
  expect(first.status).toBe(201);
  expect(first.body.workerId).toBe(worker.id);
  const again = await request(app).post('/web/bookings').set(as(worker)).send({ jobId });
  expect(again.status).toBe(409);
});

test('the worker sees the application; the employer sees the applicant and confirms', async () => {
  const mine = await request(app).get('/web/my-bookings').set(as(worker));
  const booking = mine.body.find((b) => b.jobId === jobId);
  expect(booking.status).toBe('pending');

  const jobs = await request(app).get('/web/my-jobs').set(as(employer));
  const job = jobs.body.find((j) => j.id === jobId);
  expect(job.applicants.map((a) => a.workerId)).toContain(worker.id);

  const confirm = await request(app).put(`/web/bookings/${booking.id}`).set(as(employer)).send({ status: 'confirmed' });
  expect(confirm.status).toBe(200);
  expect(confirm.body.status).toBe('confirmed');
});

test("another employer cannot change this employer's applications (403)", async () => {
  const other = (await request(app).post('/web/signup').send({
    firstName: 'Other', lastName: 'Employer', email: `web-employer-${stamp}@example.com`, password: 'password123', role: 'employer',
  })).body;
  const mine = await request(app).get('/web/my-bookings').set(as(worker));
  const booking = mine.body.find((b) => b.jobId === jobId);
  const res = await request(app).put(`/web/bookings/${booking.id}`).set(as(other)).send({ status: 'rejected' });
  expect(res.status).toBe(403);
});
