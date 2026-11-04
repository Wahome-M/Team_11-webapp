const express = require('express');
const cors = require('cors');
const { requireApiKey, rateLimit } = require('./server/security');

const app = express();
app.disable('x-powered-by'); // don't advertise which framework we run

// CORS first, so a browser's preflight (OPTIONS, sent without a key) gets an answer instead of a 401
app.use(cors());
app.use(express.json());

// Public health check: returns only a fixed string, no data. Lets a tester confirm the server is up.
app.get('/', (req, res) => res.send('FundiLink API is running'));

// Week 10: our own web page reads partner (NyumbaHub) data through this route. It's open without
// a FundiLink key because a browser page can't keep a key secret; it returns only non-sensitive
// listing info (no contact details), and an IP rate limit stops anyone using it to burn
// through our partner's rate limit.
app.use('/partner', rateLimit({ windowMs: 60000, max: 30 }), require('./server/routes/partner'));

// Our own website (Casual-Worker-Sourcing-App) can't keep an API key secret either, so it gets
// three open routes of its own, sharing a strict per-IP limit (slows password guessing and spam sign-ups):
//   POST /web/signup  same code as POST /users (new accounts always start unverified)
//   POST /web/login   same code as POST /users/login
//   GET  /web/jobs    same code as GET /jobs (job listings are meant to be public)
// Everything else, including user profiles and bookings, still needs a key.
const users = require('./server/routes/users');
const jobs = require('./server/routes/jobs');
const webLimit = rateLimit({ windowMs: 60000, max: 20 });
app.post('/web/signup', webLimit, users.registerUser);
app.post('/web/login', webLimit, users.loginUser);
app.get('/web/jobs', webLimit, jobs.listJobs);

// Everything below needs a valid key, then is rate limited per key
app.use(requireApiKey);
app.use(rateLimit({
  windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS) || 60000,
  max: Number(process.env.RATE_LIMIT_MAX) || 100,
}));

app.use('/users', users);
app.use('/jobs', jobs);
app.use('/bookings', require('./server/routes/bookings'));

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
