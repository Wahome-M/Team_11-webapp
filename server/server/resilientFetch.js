// Week 11: fetch with a timeout and a small number of careful retries.
//
// Retries only when another attempt could help:
//   - the call timed out, or the connection failed
//   - the partner answered 429 (we wait for its Retry-After, up to 5 s) or a 5xx
// Never retries:
//   - 400/401/403/404: our request is wrong, asking again changes nothing
//   - writes (POST/PUT/PATCH/DELETE): a retry could do the change twice
const RETRY_STATUSES = new Set([429, 500, 502, 503, 504]);
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function fetchWithRetry(url, options = {}, config = {}) {
  const { timeoutMs = 2000, retries = 2, delayMs = 200, label = url } = config;
  const method = (options.method || 'GET').toUpperCase();
  const maxRetries = method === 'GET' ? retries : 0;

  for (let attempt = 0; ; attempt++) {
    let wait = delayMs * 2 ** attempt; // 200 ms, then 400 ms
    let problem;
    try {
      const res = await fetch(url, { ...options, signal: AbortSignal.timeout(timeoutMs) });
      if (!RETRY_STATUSES.has(res.status) || attempt >= maxRetries) return res;
      problem = `status ${res.status}`;
      const retryAfter = Number(res.headers.get('Retry-After'));
      if (res.status === 429 && retryAfter > 0) {
        wait = Math.min(retryAfter * 1000, 5000); // wait as asked, but never more than 5 s
      }
    } catch (err) {
      if (attempt >= maxRetries) throw err; // out of retries: let the caller decide what the user sees
      problem = err.name === 'TimeoutError' ? `timeout after ${timeoutMs} ms` : (err.cause?.code || err.message);
    }
    console.warn(`partner ${label}: attempt ${attempt + 1} failed (${problem}), retrying in ${wait} ms`);
    await sleep(wait);
  }
}

module.exports = { fetchWithRetry };
