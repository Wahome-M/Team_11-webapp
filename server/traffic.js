// Week 12: sends a random mix of requests to our API, so /stats and the log have real data.
// Run (from server/):
//   Mac/Linux/Git Bash:  API=http://localhost:5000 KEY=<your-api-key> node traffic.js
//   PowerShell:          $env:API="http://localhost:5000"; $env:KEY="<your-api-key>"; node traffic.js
// Optional: N=200 for more requests (the per-key rate limit is 100 a minute, so expect some 429s).
const API = (process.env.API || 'http://localhost:5000').replace(/\/+$/, '');
const KEY = process.env.KEY;
const N = Number(process.env.N || 60);

if (!KEY) {
  console.error('Set KEY to one of the keys in API_KEYS (server/.env).');
  process.exit(1);
}

// Roughly what a real consumer (Faraja) does, plus mistakes: missing ids, no key, wrong paths
const mix = [
  { path: '/users?role=worker&trade=plumbing&location=Westlands&verified=true', key: true },
  { path: '/users?role=worker&verified=true', key: true },
  { path: '/jobs', key: true },
  { path: '/jobs', key: true },
  { path: '/v2/jobs', key: true },
  { path: '/users/1', key: true },
  { path: '/users/999', key: true }, // no such user: 404
  { path: '/jobs/1/bookings', key: true },
  { path: '/jobs/999/bookings', key: true }, // no such job: 404
  { path: '/bookings/1', key: true },
  { path: '/jobs', key: false }, // no key: 401
  { path: '/not-a-route', key: true }, // no such path: 404
];

const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

(async () => {
  const counts = {};
  for (let i = 0; i < N; i++) {
    const r = mix[Math.floor(Math.random() * mix.length)];
    try {
      const res = await fetch(API + r.path, { headers: r.key ? { 'X-API-Key': KEY } : {} });
      counts[res.status] = (counts[res.status] || 0) + 1;
    } catch {
      counts.failed = (counts.failed || 0) + 1;
    }
    await pause(50);
  }
  console.log(`Sent ${N} requests to ${API}. Status codes received:`, counts);
})();
