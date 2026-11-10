// Week 10: calls our upstream partner (NyumbaHub) from OUR server, so their API key
// never reaches the browser. Our frontend calls GET /partner/vacant-homes instead.
// Week 11: every partner call has a timeout and careful retries (resilientFetch.js), and if
// NyumbaHub can't be reached we serve the last good answer, clearly marked as saved.
// Week 13: the shape of NyumbaHub's responses lives in partnerVersions.js (PARTNER_VERSION).
//
// Settings (server/.env):
//   PARTNER_URL            NyumbaHub base URL, e.g. https://nyumbahub-api-gdit.onrender.com
//   PARTNER_API_KEY        the key NyumbaHub issued to us (never hardcode, never log)
//   PARTNER_KEY_HEADER     header name for that key (default X-API-Key)
//   PARTNER_UPDATED_SINCE  only homes that became available on/after this date (default 2026-01-01)
//   PARTNER_TIMEOUT_MS     give up on one partner call after this long (default 2000)
//   PARTNER_VERSION        which NyumbaHub API version to call (default v1)
const express = require('express');
const router = express.Router();
const { fetchWithRetry } = require('../resilientFetch');
const { partnerVersion } = require('../partnerVersions');
const { countPartnerFallback } = require('../monitoring');

const MAX_HOMES = 10; // each home costs 2 extra partner calls, so keep it small (their rate limit)

// What a vacant home means for FundiLink: the job a fundi could do there
const SUGGESTED_JOB = {
  vacated: 'Move-out deep clean and repairs',
  newly_listed: 'Move-in cleaning and inspection',
};

class PartnerError extends Error {}

// Last good answer, kept in memory (gone after a restart). Served, marked stale, when NyumbaHub fails.
let lastGood = null; // { homes, asOf }

function partnerSettings() {
  return {
    baseUrl: (process.env.PARTNER_URL || '').replace(/\/+$/, ''),
    key: process.env.PARTNER_API_KEY || '',
    keyHeader: process.env.PARTNER_KEY_HEADER || 'X-API-Key',
    timeoutMs: Number(process.env.PARTNER_TIMEOUT_MS) || 2000,
  };
}

// One GET to the partner, with timeout and retries. Returns parsed JSON or throws a PartnerError
// with a useful (key-free) reason for the log.
async function partnerGet(path, { retries }) {
  const { baseUrl, key, keyHeader, timeoutMs } = partnerSettings();
  if (!baseUrl) throw new PartnerError('PARTNER_URL is not set in server/.env');
  const shortPath = path.split('?')[0];

  let r;
  try {
    r = await fetchWithRetry(
      `${baseUrl}${path}`,
      { headers: key ? { [keyHeader]: key } : {} },
      { timeoutMs, retries, delayMs: 200, label: shortPath },
    );
  } catch (err) {
    // timeout: too slow. ECONNREFUSED: nothing listening (partner down / wrong port). ENOTFOUND: hostname wrong.
    const reason = err.name === 'TimeoutError'
      ? `timeout after ${timeoutMs} ms`
      : (err.cause?.code || err.cause?.message || err.message);
    throw new PartnerError(`call to ${shortPath} failed: ${reason}`);
  }
  if (!r.ok) {
    let detail = '';
    try { const body = await r.json(); detail = body.code || body.message || body.error || ''; } catch { /* not JSON */ }
    const retry = r.headers.get('retry-after');
    throw new PartnerError(`partner returned ${r.status} for ${shortPath}${detail ? ` (${detail})` : ''}${retry ? ` retry-after=${retry}s` : ''}`);
  }
  try {
    return await r.json();
  } catch {
    throw new PartnerError(`partner returned non-JSON for ${shortPath}`);
  }
}

// Location/size are extras: one try, no retries. If one fails, still show the home without that detail.
async function optionalDetail(path) {
  try {
    return await partnerGet(path, { retries: 0 });
  } catch (err) {
    console.error('partner detail unavailable:', err.message);
    return null;
  }
}

// GET /partner/vacant-homes  ->  homes on NyumbaHub that just became available, with area and size
//   200 { source, count, homes, stale: false, asOf }   live data
//   200 { source, count, homes, stale: true,  asOf }   NyumbaHub failed: saved data from asOf
//   502 { error: 'Partner data unavailable' }           NyumbaHub failed and nothing is saved yet
router.get('/vacant-homes', async (req, res) => {
  const since = process.env.PARTNER_UPDATED_SINCE || '2026-01-01';
  try {
    const ver = partnerVersion();
    const body = await partnerGet(`${ver.listPath}?status=available&updatedSince=${encodeURIComponent(since)}`, { retries: 2 });

    let listings;
    try {
      listings = ver.parseList(body);
    } catch (err) {
      const got = Array.isArray(body) ? 'a bare array' : `keys: ${Object.keys(body || {}).join(', ') || 'none'}`;
      throw new PartnerError(`${err.message} from ${ver.listPath} (got ${got})`);
    }

    const homes = await Promise.all(listings.slice(0, MAX_HOMES).map(async (l) => {
      const id = encodeURIComponent(l.id);
      const [location, size] = await Promise.all([
        optionalDetail(ver.detailPath(id, 'location')),
        optionalDetail(ver.detailPath(id, 'size')),
      ]);
      // Return only what our page needs
      return {
        listingId: String(l.id),
        reason: l.reason,
        suggestedJob: SUGGESTED_JOB[l.reason] || 'General cleaning and repairs',
        availableSince: l.updatedAt,
        area: location?.area ?? null,
        city: location?.city ?? null,
        bedrooms: Number.isInteger(size?.bedrooms) ? size.bedrooms : null,
        bathrooms: Number.isInteger(size?.bathrooms) ? size.bathrooms : null,
      };
    }));

    lastGood = { homes, asOf: new Date().toISOString() };
    res.json({ source: 'NyumbaHub', count: homes.length, homes, stale: false, asOf: lastGood.asOf });
  } catch (err) {
    console.error('partner call failed:', err instanceof PartnerError ? err.message : err.message || err);
    if (lastGood) {
      countPartnerFallback();
      return res.json({ source: 'NyumbaHub', count: lastGood.homes.length, homes: lastGood.homes, stale: true, asOf: lastGood.asOf });
    }
    res.status(502).json({ error: 'Partner data unavailable' });
  }
});

module.exports = router;
