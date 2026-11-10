// Stand-in for NyumbaHub's API, returning the example responses from their README.
// Use it to build and test while their server is unavailable, or to rehearse the
// "partner down" demo. Run:  node partner-standin.js   (listens on port 5050)
// Then set PARTNER_URL=http://localhost:5050 in server/.env and restart our server.
//
// Week 11: it can also misbehave on purpose, switched without restarting:
//   curl http://localhost:5050/__mode/slow    every call answers after 10 seconds
//   curl http://localhost:5050/__mode/flaky   /listings fails with 503 twice, then works (and repeats)
//   curl http://localhost:5050/__mode/error   every call fails with 500
//   curl http://localhost:5050/__mode/ok      back to normal
const http = require('http');

const PORT = process.env.STANDIN_PORT || 5050;
const send = (res, status, body) => {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(body));
};

const listings = [
  { id: '1', status: 'available', reason: 'vacated', updatedAt: '2026-09-21T22:54:06.000Z' },
  { id: '2', status: 'available', reason: 'newly_listed', updatedAt: '2026-09-21T22:54:06.000Z' },
];
const locations = { 1: { area: 'Kilimani', city: 'Nairobi' }, 2: { area: 'Westlands', city: 'Nairobi' } };
const sizes = { 1: { bedrooms: 2, bathrooms: 1 }, 2: { bedrooms: 3, bathrooms: 2 } };

let mode = 'ok'; // ok | slow | flaky | error
let calls = 0;
const MODES = ['ok', 'slow', 'flaky', 'error'];

http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  const modeSwitch = url.pathname.match(/^\/__mode\/(\w+)$/);
  if (modeSwitch) {
    if (!MODES.includes(modeSwitch[1])) return send(res, 400, { message: `mode must be one of ${MODES.join(', ')}` });
    mode = modeSwitch[1];
    calls = 0;
    console.log(`--- mode is now ${mode} ---`);
    return send(res, 200, { mode });
  }
  const isList = url.pathname === '/listings';
  if (isList) calls += 1;
  console.log(`${req.method} ${url.pathname}${url.search}  mode=${mode}${isList ? ` call=${calls}` : ''}  key header sent: ${req.headers['x-api-key'] ? 'yes' : 'no'}`);
  if (url.pathname === '/') return res.end('API is running');

  if (mode === 'slow') await new Promise((r) => setTimeout(r, 10000));
  if (mode === 'error') return send(res, 500, { code: 'internal_error', message: 'Internal error' });
  if (mode === 'flaky' && isList && calls % 3 !== 0) return send(res, 503, { code: 'unavailable', message: 'Try again' });

  if (isList) {
    if (url.searchParams.get('status') !== 'available' || !url.searchParams.get('updatedSince')) {
      return send(res, 400, { code: 'invalid_query_param', message: 'status and updatedSince are required query parameters' });
    }
    return send(res, 200, { listings });
  }
  const m = url.pathname.match(/^\/listings\/([^/]+)\/(location|size)$/);
  if (m) {
    const table = m[2] === 'location' ? locations : sizes;
    if (!table[m[1]]) return send(res, 404, { code: 'listing_not_found', message: `No listing with id ${m[1]}` });
    return send(res, 200, table[m[1]]);
  }
  send(res, 404, { code: 'not_found', message: 'Not found' });
}).listen(PORT, () => console.log(`NyumbaHub stand-in on http://localhost:${PORT}`));
