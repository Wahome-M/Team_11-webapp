// Week 12: request logging and /stats.
// One JSON line per request (time, method, path, status, ms, caller) and running totals in memory.
// Never logged: API keys, passwords, request or response bodies, query strings.
const crypto = require('crypto');
const fs = require('fs');

const round = (n) => Math.round(n * 10) / 10;

const stats = {
  startedAt: new Date().toISOString(),
  total: 0,
  clientErrors: 0, // 4xx: usually the caller's mistake
  serverErrors: 0, // 5xx: our fault
  totalMs: 0,
  partnerFallbacks: 0, // Week 11: times /partner/vacant-homes served saved data because NyumbaHub failed
  routes: {},
};

function newRoute() {
  return { count: 0, clientErrors: 0, serverErrors: 0, totalMs: 0, maxMs: 0 };
}

// A label for who called, without ever writing the key itself: the same key always gives the
// same 6 characters, and nobody can work the key back out of them.
function who(req) {
  if (!req.apiKey) return 'none';
  const hash = crypto.createHash('sha256').update(req.apiKey).digest('hex');
  return 'key-' + hash.slice(0, 6);
}

// Optional: also append each line to a file (LOG_FILE=requests.log in server/.env).
// *.log is git-ignored, so the file never gets committed.
function writeLine(line) {
  console.log(line);
  if (process.env.LOG_FILE) {
    fs.appendFile(process.env.LOG_FILE, line + '\n', () => {});
  }
}

function monitor(req, res, next) {
  // Website files (/app/...) aren't API calls: leave them out so the log shows API traffic only
  if (req.path === '/app' || req.path.startsWith('/app/')) return next();
  const start = process.hrtime.bigint();
  res.on('finish', () => { // runs after the response has been sent, so status and timing are final
    const ms = Number(process.hrtime.bigint() - start) / 1e6;
    // Path only, never the query string. baseUrl keeps the /v1 or /v2 prefix of a mounted router.
    const path = (req.baseUrl && req.path === '/') ? req.baseUrl : req.baseUrl + req.path;

    writeLine(JSON.stringify({
      time: new Date().toISOString(),
      method: req.method,
      path,
      status: res.statusCode,
      ms: round(ms),
      caller: who(req),
    }));

    // Group by route pattern (GET /users/:id), not the raw path, so the list doesn't grow with every id
    const route = req.route
      ? (req.baseUrl + (req.route.path === '/' ? '' : req.route.path)) || '/'
      : '(no route)';
    const label = `${req.method} ${route}`;
    const r = stats.routes[label] || newRoute();
    stats.routes[label] = r;

    stats.total += 1;
    stats.totalMs += ms;
    r.count += 1;
    r.totalMs += ms;
    r.maxMs = Math.max(r.maxMs, ms);
    if (res.statusCode >= 500) {
      stats.serverErrors += 1;
      r.serverErrors += 1;
    } else if (res.statusCode >= 400) {
      stats.clientErrors += 1;
      r.clientErrors += 1;
    }
  });
  next();
}

function countPartnerFallback() {
  stats.partnerFallbacks += 1;
}

function statsHandler(req, res) {
  const routes = {};
  for (const [label, r] of Object.entries(stats.routes)) {
    routes[label] = {
      count: r.count,
      clientErrors: r.clientErrors,
      serverErrors: r.serverErrors,
      avgMs: round(r.totalMs / r.count),
      maxMs: round(r.maxMs),
    };
  }
  const rate = stats.total ? (stats.serverErrors / stats.total) * 100 : 0;
  const avg = stats.total ? stats.totalMs / stats.total : 0;
  res.json({
    startedAt: stats.startedAt,
    uptimeSeconds: Math.round(process.uptime()),
    total: stats.total,
    clientErrors: stats.clientErrors,
    serverErrors: stats.serverErrors,
    errorRatePercent: round(rate),
    avgMs: round(avg),
    partnerFallbacks: stats.partnerFallbacks,
    routes,
  });
}

module.exports = { monitor, statsHandler, countPartnerFallback, who };
