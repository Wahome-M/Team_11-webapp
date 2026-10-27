# Security Audit: Week 9

FundiLink API (`server/`). We read every success and error response the API can return as an attacker would, using the Part D checklist. Each item says what we checked, what we found, and what we did about it.

## Summary

| # | Area | Finding | Status |
|---|---|---|---|
| 1 | Authentication | Every endpoint was open to anyone with the URL | **Fixed**: API key required on every endpoint |
| 2 | Rate limiting | No limit; one buggy loop could hammer the API and database | **Fixed**: 100 requests/minute per key |
| 3 | Sensitive fields | Passwords stored and compared as **plain text** in the database | **Fixed**: hashed with scrypt |
| 4 | Sensitive fields | `GET /users` returned every user's email in one call | **Fixed**: search results no longer include `email` |
| 5 | Write endpoints | Callers could send `"verified": true` and mark themselves verified | **Fixed**: `verified` is ignored on create and update |
| 6 | Error messages | `X-Powered-By: Express` header advertised our framework | **Fixed**: header removed |
| 7 | Other people's data | Any key holder can read any user's profile by ID | **Accepted for now** (see below) |
| 8 | Our own frontend | The web frontend calls the API from the browser with no key, so it now gets 401 | **Open**: to fix in Week 10 |

## 1. Authentication (Part B)

- **Checked:** called every route with no key, a wrong key and a valid key.
- **Found:** before this week, every endpoint answered anyone.
- **Fixed:** `server/server/security.js` adds `requireApiKey`, registered in `server/app.js` **before** every route, so a request without a valid `X-API-Key` header gets `401 {"error":"Missing or invalid API key"}` and the route handler never runs.
- **Keys:** one per consumer (our team for testing, plus our downstream partner), stored in `API_KEYS` in `server/.env`, which is git-ignored. The repo only has `server/.env.example`, with placeholders. Each key is 48 random hex characters, generated with `crypto.randomBytes(24)`. The partner's key was sent by direct message, not in the class channel or the repo.
- **Only open path:** `GET /` (health check). It returns the fixed text `FundiLink API is running` and no data, so a tester can confirm the server is up before they have a key. Leaving it open exposes nothing.
- **CORS:** `cors()` runs before the key check, so a browser's preflight `OPTIONS` request (sent without the key) gets a proper answer instead of a 401 that would show up as a confusing CORS error.
- **Evidence:** `test-all-endpoints.sh` (Authentication section) and the Jest suite (`API key authentication` block) check: no key gets 401, a wrong key gets 401, a valid key gets 200, and a `POST /jobs` sent with no key gets 401 and is **not** saved.

## 2. Rate limiting (Part C)

- **Limit:** 100 requests per minute **per key**, set by `RATE_LIMIT_MAX` and `RATE_LIMIT_WINDOW_MS` in `server/.env`. Over the limit returns `429`, a `Retry-After` header (seconds to wait) and `{"error":"Too many requests","retryAfter":N}`.
- **Why 100 per minute:**
  - A normal client page makes 1â€“3 calls per load, so a real user stays far below 100.
  - Our full test suite (about 50 requests) fits in one window.
  - A runaway loop is cut off within a minute instead of hammering MySQL.
  - Limits are per key, so one consumer's bug can't lock out anyone else.
- **Known limits of this limiter:** it lives in server memory, so it resets when the server restarts, and it wouldn't be shared across several copies of the server. Production would use a shared store such as Redis.
- **Demo:** set `RATE_LIMIT_MAX=3` in `server/.env`, restart, run `API_KEY=<your-api-key> bash test-rate-limit.sh`, then set it back to 100. Output from our machine:

```
=== Rate limit demo against http://localhost:5000 (Tue, Oct 27, 2026 10:41:33 PM) ===
Status codes for 5 quick requests to GET /jobs: 200 200 200 429 429 

--- Full 6th response (should be 429 with Retry-After and a JSON body) ---
HTTP/1.1 429 Too Many Requests
Retry-After: 60
Content-Type: application/json; charset=utf-8
{"error":"Too many requests","retryAfter":60}
```

Expected shape, from our own run of the same script while building this:

```
Status codes for 5 quick requests to GET /jobs: 200 200 200 429 429

--- Full 6th response (should be 429 with Retry-After and a JSON body) ---
HTTP/1.1 429 Too Many Requests
Retry-After: 60
Content-Type: application/json; charset=utf-8
{"error":"Too many requests","retryAfter":60}
```

A second key sent straight after still got `200`, which shows the limit really is per key.

## 3. Sensitive fields

- **Checked:** every response body from users, jobs and bookings, including create, update and login.
- **Found: plain-text passwords.** `POST /users` saved the password as typed, and login compared it with `WHERE email = ? AND password = ?`. Anyone with database access (or a future SQL bug) would see every user's real password.
  - **Fixed:** `server/server/passwords.js` hashes passwords with Node's built-in `scrypt`, with a random salt per user. Login now loads the user by email and checks the hash with a constant-time comparison. The sample users in `schema.sql` are stored hashed too; their password is still `password123`.
  - **Action for anyone with an existing database:** re-run `schema.sql`. Accounts saved with plain-text passwords can't log in until they're reset this way.
- **Found: emails in search results.** `GET /users` with no filters returned every user's email, so anyone with a key could collect them all in one call.
  - **Fixed:** search results use a summary without `email`. A single profile (`GET /users/{id}`) still includes it.
- **Login error message:** the same `Invalid email or password` for a wrong email and a wrong password, so callers can't use login to find out which emails are registered. Already correct; no change needed.
- **Passwords in responses:** user responses are built from an explicit list of fields (`mapUserToContract`), so the password hash is never returned. Already correct; no change needed.
- **Jobs and bookings:** every field returned is in the contract and meant to be public (title, pay, location, statusâ€¦). Nothing sensitive found.

## 4. Other people's data

- **Checked:** changed IDs in `GET /users/{id}`, `GET /bookings/{id}` and `GET /jobs/{id}/bookings`.
- **Found:** any key holder can read any user's profile (including email) and any booking by ID.
- **Accepted for now:** API keys identify a **consumer app**, not an individual user, and this week has one access level. There's no "logged-in user" to compare the ID against yet. Limiting a worker to their own bookings needs per-user login tokens, which is planned future work. We've reduced the exposure by removing emails from search results (item 4 in the summary).

## 5. Error messages

- **Checked:** sent malformed JSON, unknown routes, non-numeric IDs, wrong types and duplicate emails, and stopped MySQL during a request.
- **Found:** no stack traces, file paths, SQL or table names in any response. Every error is a short JSON message. Database errors are logged to the server terminal only, and the caller gets a generic `500 {"error":"Failed to â€¦"}`. Malformed JSON returns `400 Request body is not valid JSON`, not Express's HTML page.
- **Fixed:** the `X-Powered-By: Express` response header told attackers our framework, so it's now disabled with `app.disable('x-powered-by')`.
- **Also checked:** every query uses `?` placeholders, so request values never become SQL. No SQL injection found.

## 6. Write endpoints (extra fields)

- **Checked:** sent extra fields such as `id`, `verified`, `isActive` and `status` to every create and update endpoint.
- **Found:** `POST /users` and `PUT /users/{id}` saved `verified` straight from the request, so a user could mark themselves as a verified worker.
  - **Fixed:** `verified` is no longer read from the request. New users always start unverified, and the API can't change the flag. `test-all-endpoints.sh` checks this.
- **Already safe (no change needed):**
  - `POST /jobs` only saves its listed fields and always sets `isActive` itself.
  - `POST /bookings` always starts at `pending`.
  - `id` is never read from any request body.
- **Also tightened:** `role` must now be `worker` or `employer`. Before, any other value hit a database error and returned 500.

## 7. Keys in the wrong place

- **`.env` ignored:** `server/.gitignore` and the new root `.gitignore` both ignore `.env`. `git status` before pushing confirmed it isn't listed.
- **Git history:** checked with `git log --all --full-history -- "*.env"`. Result: empty, so no `.env` file has ever been committed.
- **Logs:** the server prints only `API keys loaded: N` at startup, never a key. Middleware errors don't log the key.
- **README and docs:** they only use the placeholder `<your-api-key>`. No real key appears in the repo.

## 8. Open item: our own web frontend

`Casual-Worker-Sourcing-App` calls `http://localhost:5000` straight from the browser (`jobs.jsx`, `login.js`). Those calls now get 401.

Putting a key in the page's JavaScript would leak it to anyone who opens dev tools, so we haven't done that. The planned fix is for the frontend to call through a small backend route that adds the key server-side, which is the Week 10 pattern.

## Tests

- `server/test-all-endpoints.sh`, run as `API_KEY=<your-api-key> bash test-all-endpoints.sh`: **46 checks, all passing**, including 7 new authentication checks plus the email and self-verify checks. It makes about 50 requests, so wait a minute between back-to-back runs, or the rate limit will (correctly) return 429.
- Jest suite, `Casual-Worker-Sourcing-App/src/_tests_/faraja.test.js`: **24 tests, all passing**. It has 4 new tests: no key gets 401, a wrong key gets 401, a valid key gets 200, and a write with no key saves nothing. The existing tests now send a test key, and their seed values were aligned with `schema.sql`.


