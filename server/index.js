// Entry point: loads settings, then starts the app defined in app.js.
// All routes and middleware live in app.js (so tests can import the app without starting a server).
require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const app = require('./app');
const { loadKeys } = require('./server/security');

const PORT = process.env.PORT || 5000;

// Print how many keys loaded (never the keys themselves)
const keyCount = loadKeys().length;
console.log(`API keys loaded: ${keyCount}`);
if (keyCount === 0) {
  console.warn('WARNING: no API_KEYS set in server/.env, so every request will get 401.');
}
console.log(`Rate limit: ${Number(process.env.RATE_LIMIT_MAX) || 100} requests per ${(Number(process.env.RATE_LIMIT_WINDOW_MS) || 60000) / 1000}s per key`);

// Express 5 passes startup errors (e.g. port already in use) to this callback,
// so only announce success when there's no error; the 'error' handler below explains failures.
const server = app.listen(PORT, (err) => {
  if (err) return;
  console.log(`Server running on http://localhost:${PORT}`);
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use. Is the server already running in another terminal?`);
  } else {
    console.error(err);
  }
  process.exit(1);
});
