# Integration Log: Week 10

**Upstream partner (we call them):** NyumbaHub (Group 10). Live at `https://nyumbahub-api-gdit.onrender.com`. Contract: their `openapi.yaml` and README. Our contact: TODO (name).

**Downstream partner (they call us):** Anderson's group. They use our tunnel URL and the key we issued them. Our contact for them: TODO (name).

**Feature built:** a "Homes needing a fundi" page (`Casual-Worker-Sourcing-App/src/opportunities.html`). It lists NyumbaHub rentals that were just vacated or newly listed, with area and size, because each one usually needs cleaning or repairs: work for FundiLink's fundis.

- **Server side:** our server calls NyumbaHub, not the browser. `GET /partner/vacant-homes` in `server/server/routes/partner.js` reads `PARTNER_URL` and `PARTNER_API_KEY` from `server/.env` and makes these calls:
  - `GET /listings?status=available&updatedSince=…`
  - `GET /listings/{id}/location` and `GET /listings/{id}/size` for each listing (at most 10)
- **What the page gets:** only the fields it needs.
- **The key:** it never reaches the browser and is never logged.

## Part B: First call, from a terminal

| When | Command (key removed) | Result | Matches contract? |
|---|---|---|---|
| 08:52 EAT, 28 Oct | `curl.exe -i -H "X-API-Key: <key>" "https://nyumbahub-api-gdit.onrender.com/listings?status=available&updatedSince=2026-01-01"` | `401 Unauthorized`, `{"message":"Missing or invalid API key"}` | No: the contract and README promise `200` with `{ listings: [...] }`. See bug 7. |
| 09:27 EAT, 28 Oct (after NyumbaHub's fix) | Same command | `200 OK`, `{"listings":[{"id":"1","status":"available","reason":"vacated","updatedAt":"2026-09-21T22:54:06.000Z"},{"id":"2","status":"available","reason":"newly_listed",…}]}` | Yes: `listings` array; `id`, `status`, `reason`, `updatedAt` exactly as in the contract. `/listings/2/location` returned `{"area":"Westlands","city":"Nairobi"}`, and `/listings/2/size` returned `{"bedrooms":3,"bathrooms":2}`. |

## Bugs and surprises

One row per bug or surprise. "Whose code" is about where the cause was, not blame.

| # | What broke (symptom) | Root cause | Fix | Whose code, and who fixed it |
|---|---|---|---|---|
| 1 | Found while reading their docs, before any call: the contract says `updatedSince` is an ISO date-time (`2026-09-01T06:00:00Z`), but their README says `YYYY-MM-DD` (`2026-01-01`). | The contract and README disagree, so it's unclear which format the server accepts. | We send `YYYY-MM-DD`, which their README shows working, and made it configurable (`PARTNER_UPDATED_SINCE`). Confirmed on the live API at 09:27: `updatedSince=2026-01-01` returns `200`. Suggested NyumbaHub align the contract with the README. | Partner's docs; clarified by testing |
| 2 | Found while reading their docs: the contract's example IDs look like `"lst_8841"`, but README responses use `"1"`, `"2"`. | Contract examples were written before the real data. | Our code treats IDs as plain strings and URL-encodes them, so both formats work. Live API confirmed IDs are `"1"`, `"2"` (strings). | Partner's docs; no fix needed |
| 3 | Found while reading their docs: their README says "Authentication: None required", but NyumbaHub issued us a key. | README not updated after Week 9. | We send the key in `X-API-Key` (header name configurable with `PARTNER_KEY_HEADER`). Confirmed: their server requires the key in `X-API-Key` (see bug 7). Their README still says no auth is needed. | Partner's docs; reported to NyumbaHub |
| 4 | Found while reading their contract: it lists `POST /fundi-requests` as hosted **by FundiLink** (NyumbaHub calls it), but our API has no such endpoint. | It came from the Week 3 endpoint list but was never built on our side. | Not built this week; the lab asks for one feature that reads their data. TODO: agree with NyumbaHub whether they still need it, then add it to our contract. | Ours (missing endpoint); open |
| 5 | Testing our error handling against a fake partner on port 5060: our log said only `call to /listings failed: fetch failed`, which gave no reason. | Node's `fetch` refuses some ports (5060 is a phone-system port browsers block) and puts the real reason in `err.cause.message`, which we weren't logging. | Moved the fake partner to port 5070, and improved our log so it prints the underlying cause (now `failed: bad port`). | Ours (test setup + logging), fixed by us |
| 6 | Their responses use errors like `{"code":"listing_not_found","message":"…"}`, which differ from our `{"error":"…"}` format. | Different teams, different error formats. | Our partner route reads `code`, `message` or `error`, whichever is present, and logs it. Our own page shows one friendly message either way. | Neither; handled on our side |
| 7 | Our first call to NyumbaHub (08:52) returned `401 Missing or invalid API key`. | Their server didn't accept the key they issued us. We ruled out our side at 08:58: the same key sent as `X-API-Key`, `Authorization: Bearer` and `?api_key=` all got 401. NyumbaHub replied with a command for `http://localhost:5000/api/students`, which works on **their** laptop, so the key was set on their local server but not on their Render deployment. | Sent NyumbaHub a bug report (what / expected / got / evidence / when) and explained that we can't reach their `localhost`. Built and tested against a stand-in meanwhile. They added our key on Render. Retested at 09:27: `200` with `{listings:[...]}`. | Theirs, fixed by NyumbaHub |
| 8 | Switching our server from the stand-in to NyumbaHub's real URL, the page kept showing data that might have come from the stand-in. Then, after we stopped the old process, the page showed "NyumbaHub listings are unavailable" and the browser showed `ERR_CONNECTION_REFUSED` for `localhost:5000`. | Our second `npm start` couldn't get port 5000 because the old server (still pointed at the stand-in) was running. Our startup log misleadingly printed `Server running` **before** `Port 5000 is already in use`, so we thought the new settings were live. When we stopped the old process, no server was left running. | Stopped the old process and started one clean server. Fixed `server/index.js` so `Server running` only prints when the server really starts (Express 5 passes startup errors to the `listen` callback). The page handled our own server being down without crashing. Live NyumbaHub data was back at 09:40. | Ours, fixed by us |

## What we tested on purpose

| Test | How | What happened |
|---|---|---|
| Partner up (stand-in) | 09:08: page open, stand-in returning NyumbaHub's README examples | 2 homes shown |
| Partner up (live) | 09:40: `PARTNER_URL` = NyumbaHub's Render URL, stand-in stopped | 2 homes shown from NyumbaHub's live API: listing 1 Kilimani (vacated), listing 2 Westlands (newly listed, 3 bed / 2 bath) |
| Our own server down | 09:33 (bug 8): page open while our server wasn't running | Page showed "NyumbaHub listings are unavailable right now…"; no crash or blank page |
| Partner down | TODO: partner stopped, or `PARTNER_URL` pointed at `http://localhost:5999` | TODO: page shows "NyumbaHub listings are unavailable right now…"; our server keeps running; terminal logs `ECONNREFUSED` |
| Partner back | TODO: partner restarted, page refreshed, no code changed | TODO: data returns |
| Wrong hostname | `PARTNER_URL=http://nyumbahub-typo.invalid` | During development: 502 to the page, server log `failed: ENOTFOUND` |
| Partner rejects our key | Fake partner returning 401 | During development: 502 to the page, server log `partner returned 401 for /listings (Missing or invalid API key)` |
| Partner rate-limits us | Fake partner returning 429 with `Retry-After: 30` | During development: 502 to the page, server log `partner returned 429 … retry-after=30s` |
| Partner changes response shape | Fake partner returning a bare array instead of `{ listings: [...] }` | During development: 502 to the page, server log `unexpected shape from /listings: expected { listings: [...] }, got a bare array` |
| One detail call fails | e.g. `/listings/{id}/size` errors | The home still shows, with "Size not available"; only the main `/listings` call is required |

## Part E: Supporting our downstream partner (Anderson's group)

| When | What they reported | Our side or theirs? | What we did |
|---|---|---|---|
| Earlier (Week 10 dry run) | `curl -i` in PowerShell failed with "Cannot find drive 'https'" | Theirs (PowerShell's `curl` alias) | Told them to use `curl.exe`; first call then returned 200 |
| TODO | | | |

## Demo checklist

1. Page shows live NyumbaHub data.
2. Partner stopped: the page shows the fallback message, and our terminal logs the reason.
3. Partner restarted: the data comes back after Refresh, with no code changes.
