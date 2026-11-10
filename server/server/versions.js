// Week 13: v2 beside v1.
//
// The breaking change: v2 wraps every successful response in an envelope.
//   lists:        [ ... ]            becomes  { "data": [ ... ], "count": N }
//   single items: { ...item }        becomes  { "data": { ...item } }
// Why: with a bare list we can't add paging (next page, total) later without breaking callers
// again. With { data, count } we can add fields beside data at any time without a break.
// Errors keep the same { "error": "..." } shape in both versions.
//
// v1 (and the old unversioned URLs) are FROZEN: same handlers, same shapes, plus three headers
// that tell every caller it's going away: Deprecation, Sunset and Link.

const SUNSET = process.env.API_V1_SUNSET || '2026-11-20';

// Adds the standard "this is going away" headers. Used only on v1 routes.
function deprecated(successorBase) {
  const sunset = new Date(`${SUNSET}T00:00:00Z`).toUTCString();
  return (req, res, next) => {
    res.set('Deprecation', 'true');
    res.set('Sunset', sunset);
    res.set('Link', `<${successorBase}${req.path === '/' ? '' : req.path}>; rel="successor-version"`);
    next();
  };
}

// The ONE place that turns a v1 response body into the v2 shape.
function toV2(body) {
  if (Array.isArray(body)) return { data: body, count: body.length };
  return { data: body };
}

// Lets v2 reuse the v1 handlers unchanged: it only rewraps successful JSON bodies on the way out.
function v2Shape(req, res, next) {
  const json = res.json.bind(res);
  res.json = (body) => (res.statusCode >= 400 ? json(body) : json(toV2(body)));
  next();
}

module.exports = { deprecated, v2Shape, toV2, SUNSET };
