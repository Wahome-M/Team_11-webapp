// Week 10: calls our upstream partner (NyumbaHub) from OUR server, so their API key
// never reaches the browser. Our frontend calls GET /partner/vacant-homes instead.
//
// Settings (server/.env):
//   PARTNER_URL            NyumbaHub base URL, e.g. https://nyumbahub-api-gdit.onrender.com
//   PARTNER_API_KEY        the key NyumbaHub issued to us (never hardcode, never log)
//   PARTNER_KEY_HEADER     header name for that key (default X-API-Key)
//   PARTNER_UPDATED_SINCE  only homes that became available on/after this date (default 2026-01-01)
const express = require('express');
const router = express.Router();

const MAX_HOMES = 10; // each home costs 2 extra partner calls, so keep it small (their rate limit)

// What a vacant home means for FundiLink: the job a fundi could do there
const SUGGESTED_JOB = {
  vacated: 'Move-out deep clean and repairs',
  newly_listed: 'Move-in cleaning and inspection',
};

class PartnerError extends Error {}

function partnerSettings() {
  return {
    baseUrl: (process.env.PARTNER_URL || '').replace(/\/+$/, ''),
    key: process.env.PARTNER_API_KEY || '',
    keyHeader: process.env.PARTNER_KEY_HEADER || 'X-API-Key',
  };
}

// One GET to the partner. Returns parsed JSON or throws a PartnerError with a useful (key-free) reason.
async function partnerGet(path) {
  const { baseUrl, key, keyHeader } = partnerSettings();
  if (!baseUrl) throw new PartnerError('PARTNER_URL is not set in server/.env');

  let r;
  try {
    r = await fetch(`${baseUrl}${path}`, { headers: key ? { [keyHeader]: key } : {} });
  } catch (err) {
    // ECONNREFUSED: nothing listening there (partner down / wrong port). ENOTFOUND: hostname wrong.
    throw new PartnerError(`call to ${path.split('?')[0]} failed: ${err.cause?.code || err.cause?.message || err.message}`);
  }
  if (!r.ok) {
    let detail = '';
    try { const body = await r.json(); detail = body.code || body.message || body.error || ''; } catch { /* not JSON */ }
    const retry = r.headers.get('retry-after');
    throw new PartnerError(`partner returned ${r.status} for ${path.split('?')[0]}${detail ? ` (${detail})` : ''}${retry ? ` retry-after=${retry}s` : ''}`);
  }
  try {
    return await r.json();
  } catch {
    throw new PartnerError(`partner returned non-JSON for ${path.split('?')[0]}`);
  }
}

// Location/size are extras: if one fails, still show the home, just without that detail.
async function optionalDetail(path) {
  try {
    return await partnerGet(path);
  } catch (err) {
    console.error('partner detail unavailable:', err.message);
    return null;
  }
}

// GET /partner/vacant-homes  ->  homes on NyumbaHub that just became available, with area and size
router.get('/vacant-homes', async (req, res) => {
  const since = process.env.PARTNER_UPDATED_SINCE || '2026-01-01';
  try {
    const data = await partnerGet(`/listings?status=available&updatedSince=${encodeURIComponent(since)}`);

    // Shape check against their contract: { listings: [ { id, status, reason, updatedAt } ] }
    if (!data || !Array.isArray(data.listings)) {
      const got = Array.isArray(data) ? 'a bare array' : `keys: ${Object.keys(data || {}).join(', ') || 'none'}`;
      throw new PartnerError(`unexpected shape from /listings: expected { listings: [...] }, got ${got}`);
    }

    const listings = data.listings.slice(0, MAX_HOMES);
    const homes = await Promise.all(listings.map(async (l) => {
      const id = encodeURIComponent(l.id);
      const [location, size] = await Promise.all([
        optionalDetail(`/listings/${id}/location`),
        optionalDetail(`/listings/${id}/size`),
      ]);
      // Return only what our page needs (contract field names, exactly)
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

    res.json({ source: 'NyumbaHub', count: homes.length, homes });
  } catch (err) {
    console.error('partner call failed:', err instanceof PartnerError ? err.message : err);
    res.status(502).json({ error: 'Partner data unavailable' });
  }
});

module.exports = router;
