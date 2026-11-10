// Week 11: timeout and retry rules, against a tiny local server we control. No database needed.
// Week 13: the NyumbaHub version parsers.
const http = require('http');
const { fetchWithRetry } = require('../server/resilientFetch');
const { versions } = require('../server/partnerVersions');

let server; let base; let hits; let plan;

beforeAll(async () => {
  server = http.createServer((req, res) => {
    hits += 1;
    const step = plan[Math.min(hits - 1, plan.length - 1)];
    if (step === 'slow') return setTimeout(() => res.end('{}'), 1000);
    res.writeHead(step, { 'Content-Type': 'application/json' });
    res.end('{}');
  });
  await new Promise((r) => server.listen(0, r));
  base = `http://127.0.0.1:${server.address().port}`;
});
afterAll(() => new Promise((r) => server.close(r)));
beforeEach(() => { hits = 0; });

const quiet = { timeoutMs: 200, retries: 2, delayMs: 10 };
beforeAll(() => jest.spyOn(console, 'warn').mockImplementation(() => {}));

test('retries a 503 and succeeds on the third try', async () => {
  plan = [503, 503, 200];
  const res = await fetchWithRetry(base, {}, quiet);
  expect(res.status).toBe(200);
  expect(hits).toBe(3);
});

test('stops after 2 retries (3 calls in total) when the partner keeps failing', async () => {
  plan = [500];
  const res = await fetchWithRetry(base, {}, quiet);
  expect(res.status).toBe(500);
  expect(hits).toBe(3);
});

test('never retries a 404 or 401: asking again changes nothing', async () => {
  plan = [404];
  expect((await fetchWithRetry(base, {}, quiet)).status).toBe(404);
  expect(hits).toBe(1);
  hits = 0; plan = [401];
  expect((await fetchWithRetry(base, {}, quiet)).status).toBe(401);
  expect(hits).toBe(1);
});

test('never retries a write, even on a 503', async () => {
  plan = [503];
  const res = await fetchWithRetry(base, { method: 'POST' }, quiet);
  expect(res.status).toBe(503);
  expect(hits).toBe(1);
});

test('a slow partner is cut off at the timeout, then retried, then gives up', async () => {
  plan = ['slow'];
  const started = Date.now();
  await expect(fetchWithRetry(base, {}, quiet)).rejects.toMatchObject({ name: 'TimeoutError' });
  expect(hits).toBe(3);
  expect(Date.now() - started).toBeLessThan(1000); // 3 x 200 ms + small delays, not 3 x 1000 ms
});

describe('NyumbaHub version parsers', () => {
  const v1Body = { listings: [{ id: '2', status: 'available', reason: 'newly_listed', updatedAt: '2026-09-21T22:54:06.000Z', extra: 'ignored' }] };

  test('v1 turns their body into the list our route uses', () => {
    expect(versions.v1.parseList(v1Body)).toEqual([
      { id: '2', status: 'available', reason: 'newly_listed', updatedAt: '2026-09-21T22:54:06.000Z' },
    ]);
  });

  test('the wrong shape fails loudly, not quietly', () => {
    expect(() => versions.v1.parseList([])).toThrow('unexpected v1 shape');
    expect(() => versions.v1.parseList({ data: [] })).toThrow('unexpected v1 shape');
  });
});
