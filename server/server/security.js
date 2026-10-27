// API key authentication and rate limiting (Week 9).
// Keys come from the environment (server/.env), never from source code, and are never logged.

// Read keys on each request so a restart is the only thing needed after editing .env,
// and tests can set process.env.API_KEYS before making requests.
function loadKeys() {
  return (process.env.API_KEYS || '')
    .split(',')
    .map((k) => k.trim())
    .filter(Boolean);
}

// Every request must send a valid key in the X-API-Key header, or it stops here with 401.
function requireApiKey(req, res, next) {
  const key = req.get('X-API-Key');
  if (!key || !loadKeys().includes(key)) {
    return res.status(401).json({ error: 'Missing or invalid API key' });
  }
  req.apiKey = key;
  next();
}

// Simple in-memory limiter: counts requests per key in a fixed time window.
// Limits: it resets when the server restarts and does not work across several server copies.
function rateLimit({ windowMs, max }) {
  const hits = new Map(); // key -> { count, resetAt }
  return (req, res, next) => {
    const id = req.apiKey || req.ip;
    const now = Date.now();
    let entry = hits.get(id);
    if (!entry || now >= entry.resetAt) {
      entry = { count: 0, resetAt: now + windowMs };
      hits.set(id, entry);
    }
    entry.count += 1;
    if (entry.count > max) {
      const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
      res.set('Retry-After', String(retryAfter));
      return res.status(429).json({ error: 'Too many requests', retryAfter });
    }
    next();
  };
}

module.exports = { requireApiKey, rateLimit, loadKeys };
