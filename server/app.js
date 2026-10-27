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

// Everything below needs a valid key, then is rate limited per key
app.use(requireApiKey);
app.use(rateLimit({
  windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS) || 60000,
  max: Number(process.env.RATE_LIMIT_MAX) || 100,
}));

app.use('/users', require('./server/routes/users'));
app.use('/jobs', require('./server/routes/jobs'));
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
