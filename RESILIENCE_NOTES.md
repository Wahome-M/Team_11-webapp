# Resilience Notes: Week 11

Our feature: the **"Homes needing a fundi"** page (`/app/opportunities.html`). Our server's `GET /partner/vacant-homes` calls NyumbaHub (Team 10): one `GET /listings` call, then `GET /listings/{id}/location` and `/size` for each home (up to 10, in parallel).

Code: `server/server/resilientFetch.js` (timeout and retries), `server/server/routes/partner.js` (fallback), `Casual-Worker-Sourcing-App/src/opportunities.js` (saved-data banner). Stand-in partner with failure modes: `server/partner-standin.js` (`/__mode/ok|slow|flaky|error`).

## Before (Week 10 code)

| Partner mode | What the user saw |
|---|---|
| Slow (answers after 10 s) | The page sat on "Loading homes…" for the full 10 s. No timeout, so one slow partner held the request open as long as it liked. |
| Flaky (503 twice, then works) | "NyumbaHub listings are unavailable" two loads out of three, although a second try a moment later would have worked. |

## What we tested (10 Nov, against the stand-in, `PARTNER_TIMEOUT_MS=1500`)

| Failure | What the user saw | What our log said | Time to answer |
|---|---|---|---|
| Slow, nothing saved yet (just restarted) | "NyumbaHub listings are unavailable right now…" (502). No crash. | `attempt 1 failed (timeout after 1500 ms), retrying in 200 ms`, then attempt 2, then `partner call failed: call to /listings failed: timeout after 1500 ms` | 5.1 s |
| Normal | Live homes, no banner (`stale: false`) | nothing | 0.015 s |
| Slow, with a saved copy | Same homes plus the banner "Showing saved NyumbaHub data from 11:16…" (`stale: true`) | same three timeout lines | 5.1 s |
| Flaky (503, 503, 200) | Live homes, no banner. The user never saw the failures. | `attempt 1 failed (status 503)`, `attempt 2 failed (status 503)` | 0.6 s |
| Always 500 | Saved homes with the banner | two retries, then `partner returned 500 for /listings (internal_error)` | 0.6 s |
| Partner stopped | Saved homes with the banner | `attempt 1 failed (ECONNREFUSED)` ×2, then `call to /listings failed: ECONNREFUSED` | 0.6 s |
| Partner back | Live homes, banner gone, no code changed | nothing | 0.015 s |

`/stats` afterwards showed `"partnerFallbacks": 3`, one for each time saved data was served.

**Real partner drill (Part E):** TODO with NyumbaHub. Agree a window, have them stop and restart their Render service, and fill in a row for each step.

## Our numbers, and why

| Setting | Value | Why |
|---|---|---|
| Timeout per call | **2000 ms** (default, `PARTNER_TIMEOUT_MS`) | The stand-in answers in about 1 ms. NyumbaHub is on Render's free tier in another region, so a warm call is slower: TODO, measure with `curl -w "%{time_total}"` from the demo network. 2 s leaves plenty of room above a normal call, and is still well under how long someone waits for one section of a page. We used 1500 ms in the drill. |
| Retries on `/listings` | **2** (3 attempts at most) | The cap the lab sets. Only for timeouts, connection failures, 429 and 5xx. Never for 4xx, never for writes. |
| Delay between attempts | **200 ms, then 400 ms** (429: their `Retry-After`, up to 5 s) | Short enough not to matter to the user, and growing so we don't hammer a partner that's struggling. |
| Retries on `/location` and `/size` | **0** | They're extras. If one fails, the home still shows, with "Size not available". Retrying them could multiply our calls by up to 20 per page load. |
| **Worst-case wait** | **(2 + 1) × 2000 + 200 + 400 = 6600 ms** for `/listings`, plus up to 2000 ms for the parallel detail calls: **about 8.6 s** | Measured with 1500 ms: 5.1 s, matching (2 + 1) × 1500 + 600. |

**Known gap: Render cold start.** NyumbaHub's free Render service sleeps after 15 minutes idle and takes about a minute to wake. No timeout we'd accept covers that, so the first load after a quiet spell shows saved data (or "unavailable" if we have none). Before a demo, open `https://nyumbahub-api-gdit.onrender.com/` a minute early.

## What a real user would experience without this

A fundi opens "Homes needing a fundi" on their phone to find move-out cleaning work. If NyumbaHub is slow, the page shows "Loading homes from NyumbaHub…" for 10 seconds or more, and the fundi assumes FundiLink is broken and closes it. If NyumbaHub has a bad moment, they get "unavailable" two times in three, even though one quiet retry would have worked. With this code they get live homes after at most a few seconds. When NyumbaHub really is down, they still see the homes from the last good load, with a clear note of the time it was saved. So they can still call about a Kilimani move-out clean, knowing it may already be taken.

## What we did not build

A **circuit breaker** would notice that NyumbaHub had failed, say, 5 times in a row, stop calling it for a minute (serving saved data straight away), and then let one test call through to see if it's back. Ours still tries every page load three times, so during a long outage every visitor waits the full worst case and NyumbaHub gets three calls per visitor while it's trying to recover.

The saved copy lives in memory, so it's gone after a restart (row 1 in the table above). Production would keep it in the database or a cache.
