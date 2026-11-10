# Monitoring Notes: Week 12

Code: `server/server/monitoring.js` (log line and `/stats`), registered first in `server/app.js`. Traffic script: `server/traffic.js`.

## Part A: Predictions (written before we had data)

1. **Slowest endpoint:** `GET /users?role=worker&trade={trade}&location={location}&verified=true`.
   Reason: it returns verified workers filtered by trade and location. Much time will be taken in sorting out the data needed by a user who is looking for legitimate workers who do a specific job in a precise area. Sorting data based on these 2 data points causes delay, making the endpoint slow.

2. **Error-prone endpoint:** `POST /jobs` (create a new job posting with category, location and pay rate).
   Reason: one may accidentally create 2 or more jobs via double posting, or add a job with conditions they did not want.

## What we log

One JSON line per request: `time`, `method`, `path` (no query string), `status`, `ms`, `caller`. `caller` is `key-` plus the first 6 characters of the key's SHA-256 hash, or `none`. Never logged: keys, passwords, bodies, query strings. `LOG_FILE=requests.log` in `server/.env` also writes the lines to a file (`*.log` is git-ignored). Website file requests (`/app/...`) are left out, so the log shows API traffic only.

Example lines (10 Nov):

```
{"time":"2026-11-10T08:23:24.844Z","method":"GET","path":"/jobs/1/bookings","status":200,"ms":30,"caller":"key-8153ac"}
{"time":"2026-11-10T08:23:25.068Z","method":"GET","path":"/jobs","status":401,"ms":1.1,"caller":"none"}
```

Key check: `grep -c "<our key>" requests.log` and `grep -c "<partner key>" requests.log` both printed `0`.

## The data

`traffic.js` was run twice, from two different keys: our team key (80 requests) and the partner's key (60). We added 6 website logins (one with a wrong password) and one partner-page load. `/stats` afterwards, measured on a development machine with MySQL on the same machine:

| Route | Calls | 4xx | 5xx | avg ms | max ms |
|---|---|---|---|---|---|
| `POST /web/login` | 6 | 1 | 0 | **44.9** | 53.7 |
| `GET /partner/vacant-homes` | 1 | 0 | 0 | 36.7 | 36.7 |
| `GET /jobs/:id/bookings` | 22 | 8 | 0 | 3.5 | **30.0** |
| `GET /users` (filtered) | 27 | 0 | 0 | 2.0 | 4.6 |
| `GET /users/:id` | 17 | 6 | 0 | 1.9 | 4.4 |
| `GET /jobs` | 30 | 0 | 0 | 1.9 | 3.8 |
| `GET /bookings/:id` | 10 | 0 | 0 | 1.9 | 2.6 |
| `GET /v2/jobs` | 10 | 0 | 0 | 1.8 | 2.6 |
| `(no route)`: 401s and unknown paths | 24 | 24 | 0 | 0.7 | 1.2 |

Totals: **147 requests, 39 client errors (4xx), 0 server errors, error rate 0%, average 3.9 ms.** The log had 72 lines from `key-8153ac` (us), 54 from `key-d5f4a2` (the partner key) and 22 from `none`.

TODO: re-run `traffic.js` against the deployed API with our downstream partner (Faraja, Team 12) using their own key, and add their numbers.

## Prediction vs. data

1. **Slowest: we were wrong.** The filtered `GET /users` averaged **2.0 ms**, about the same as every other read. Filtering 4–14 rows in MySQL is no work at all. The slowest route was **`POST /web/login` at 44.9 ms**, about **22 times slower** than a read.
2. **Most errors: also wrong.** `POST /jobs` had no errors. The most 4xx came from `(no route)` (24: requests with no key, and a path that doesn't exist), then `GET /jobs/:id/bookings` (8 of 22 were `404 Job not found`) and `GET /users/:id` (6 of 17). These are all the deliberate mistakes in `traffic.js`. **No 5xx at all.**

## Two real patterns

1. **Login is slow on purpose.** `POST /web/login` averaged 44.9 ms (max 53.7) against about 2 ms for reads. Our guess was the Week 9 password hashing: `scrypt` is designed to be slow, so that stolen hashes are expensive to crack, and every login runs it once. **We checked:** timing `verifyPassword` on its own gave 52.3, 44.0, 47.7, 47.9, 48.3 and 48.0 ms over 6 runs, which is essentially the whole login time. That's a fair price for one login per session, and it's also why our per-IP limit on login is strict (20 a minute): each guess costs the server about 48 ms.
2. **The first database call after a restart is slow.** `GET /jobs/:id/bookings` averaged 3.5 ms, but its slowest call was **30 ms**, and that was the very first request after the server started (first line of the log). Our guess: the MySQL pool opens its first connection on the first query. The next step would be to restart, send the same request twice, and compare the two times. On Render, with TiDB in the cloud, this cold-connection cost will be bigger.

## One alert we'd want in production

**`errorRatePercent` above 2% for 5 minutes**: page whoever is on call. A 5xx means our code or our database failed, not the caller. While someone fixes it, users should already be protected by what we have: the website shows a friendly message instead of a blank page, and the partner page shows saved data. A second alert: **`partnerFallbacks` rising by more than 10 in 10 minutes** means NyumbaHub is down and people are seeing saved data. That needs a message to Team 10, not a fix from us.
