// Stand-in for NyumbaHub's API, returning the example responses from their README.
// Use it to build and test while their server is unavailable, or to rehearse the
// "partner down" demo. Run:  node partner-standin.js   (listens on port 5050)
// Then set PARTNER_URL=http://localhost:5050 in server/.env and restart our server.
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

http.createServer((req, res) => {
  const url = new URL(req.url, 'http://x');
  console.log(`${req.method} ${url.pathname}${url.search}  key header sent: ${req.headers['x-api-key'] ? 'yes' : 'no'}`);
  if (url.pathname === '/') return res.end('API is running');
  if (url.pathname === '/listings') {
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
