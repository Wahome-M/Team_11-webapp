// Where the website finds the FundiLink API. Every page loads this before its own script.
//   1. ?api=<link> in the address always wins (e.g. someone's tunnel link). It's remembered for
//      this browser tab, so clicking to another page keeps using it.
//   2. Served by our API at /app/ (the normal way: http://localhost:5000/app/, the tunnel link
//      + /app/, or Render + /app/): the API is at the same address
//   3. Opened as a file, or on localhost: the server on this laptop
//   4. Anywhere else (hosted separately): our API on Render
// If Render gives the API a different address, change DEPLOYED_API below.
// Note: open the site at /app/, not as a file. Chrome won't load the Browse Jobs page's React
// code from a file:// address.
(function () {
  const DEPLOYED_API = 'https://fundilink-api.onrender.com';
  let fromUrl = new URLSearchParams(location.search).get('api');
  try {
    if (fromUrl) sessionStorage.setItem('fundilinkApi', fromUrl);
    else fromUrl = sessionStorage.getItem('fundilinkApi');
  } catch { /* storage blocked: just use the address bar */ }
  const servedByApi = location.protocol.startsWith('http') && location.pathname.startsWith('/app/');
  const isLocal = location.protocol === 'file:' || ['localhost', '127.0.0.1'].includes(location.hostname);
  const fallback = servedByApi ? location.origin : (isLocal ? 'http://localhost:5000' : DEPLOYED_API);
  window.FUNDILINK_API = (fromUrl || fallback).replace(/\/+$/, '');
})();

// The logged-in person (saved by login.js), or null
window.fundilinkUser = function () {
  try { return JSON.parse(localStorage.getItem('fundilinkUser') || 'null'); } catch { return null; }
};

// Calls our website routes (/web/...) with the logged-in person's session token.
// Returns { ok, status, body }. A 401 means the session ran out, so it goes back to the login page.
window.fundilinkApi = async function (path, { method = 'GET', body } = {}) {
  const user = window.fundilinkUser();
  const headers = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (user && user.token) headers.Authorization = `Bearer ${user.token}`;
  const res = await fetch(window.FUNDILINK_API + path, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  let data = null;
  try { data = await res.json(); } catch { /* empty or not JSON */ }
  if (res.status === 401 && !/\/web\/(login|signup)$/.test(path)) {
    try { localStorage.removeItem('fundilinkUser'); } catch { /* ignore */ }
    location.href = 'login.html';
  }
  return { ok: res.ok, status: res.status, body: data };
};

// Turns a server error body into one readable sentence for an alert or message
window.fundilinkError = function (r) {
  const b = r.body || {};
  const details = Array.isArray(b.details) ? ` (${b.details.join('; ')})` : '';
  return `${b.error || 'Something went wrong'}${details}`;
};
