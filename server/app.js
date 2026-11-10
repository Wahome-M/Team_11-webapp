const path = require('path');
const express = require('express');
const cors = require('cors');
const { requireApiKey, rateLimit } = require('./server/security');
const { monitor, statsHandler } = require('./server/monitoring');
const { deprecated, v2Shape } = require('./server/versions');

const users = require('./server/routes/users');
const jobs = require('./server/routes/jobs');
const bookings = require('./server/routes/bookings');

const app = express();
app.disable('x-powered-by'); // don't advertise which framework we run

// On Render (or any host with a proxy in front), every request reaches us from the proxy's address.
// TRUST_PROXY tells Express to read the visitor's real IP from X-Forwarded-For instead, so the
// per-IP limits on /web and /partner apply per visitor, not to everyone together.
// Unset on a laptop (no proxy). On Render: TRUST_PROXY=true.
if (process.env.TRUST_PROXY) {
  const hops = Number(process.env.TRUST_PROXY);
  app.set('trust proxy', Number.isInteger(hops) ? hops : process.env.TRUST_PROXY === 'true');
}

// Week 12: log every request FIRST, so requests rejected below (401, 429) are logged too
app.use(monitor);

// Our website, served by this same server at /app/ (e.g. http://localhost:5000/app/login.html).
// Same address as the API, so pages need no ?api= and nothing extra to host. Only the site's own
// files are served: not its tests or old mock data.
app.use('/app', (req, res, next) => {
  if (/^\/(_tests_|db\.json)/.test(req.path)) return res.status(404).json({ error: 'Route not found' });
  next();
}, express.static(path.join(__dirname, '..', 'Casual-Worker-Sourcing-App', 'src')));

// CORS before the key check, so a browser's preflight (OPTIONS, sent without a key) gets an answer instead of a 401
app.use(cors());
app.use(express.json());

// Public health check: returns only a fixed string, no data. Lets a tester confirm the server is up.
app.get('/', (req, res) => res.send('FundiLink API is running'));

// Week 10/11: our own web page reads partner (NyumbaHub) data through this route. It's open without
// a FundiLink key because a browser page can't keep a key secret; it returns only non-sensitive
// listing info (no contact details), and an IP rate limit stops anyone using it to burn
// through our partner's rate limit.
app.use('/partner', rateLimit({ windowMs: 60000, max: 30 }), require('./server/routes/partner'));

// Our own website: signup, login and the job list are public; everything else needs the session
// token from login (see routes/web.js). Per-IP limits: strict on signup/login (slows password
// guessing and spam sign-ups), looser for a logged-in person clicking around.
const authLimit = rateLimit({ windowMs: 60000, max: 20 });
app.post('/web/signup', authLimit);
app.post('/web/login', authLimit);
app.use('/web', rateLimit({ windowMs: 60000, max: 120 }), require('./server/routes/web'));

// Everything below needs a valid key, then is rate limited per key
app.use(requireApiKey);
app.use(rateLimit({
  windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS) || 60000,
  max: Number(process.env.RATE_LIMIT_MAX) || 100,
}));

// Week 12: running totals (needs a key like everything else)
app.get('/stats', statsHandler);

// Week 13: v2 is the same handlers with the new { data, count } envelope
const v2 = express.Router();
v2.use(v2Shape);
v2.use('/users', users);
v2.use('/jobs', jobs);
v2.use('/bookings', bookings);
app.use('/v2', v2);

// v1 is frozen, and every v1 response says it's going away (Deprecation, Sunset, Link headers).
// It answers at /v1/... AND at the old unversioned URLs, which our partner calls today:
// dropping those would break them with no warning.
for (const prefix of ['/v1', '']) {
  app.use(`${prefix}/users`, deprecated('/v2/users'), users);
  app.use(`${prefix}/jobs`, deprecated('/v2/jobs'), jobs);
  app.use(`${prefix}/bookings`, deprecated('/v2/bookings'), bookings);
}

// Unknown routes return JSON, not Express's HTML page
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Return contract-shaped errors instead of Express's HTML page (no stack traces to the caller)
app.use((err, req, res, next) => {
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Request body is not valid JSON' });
  }
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

module.exports = app;
