# Versioning Notes: Week 13

## The change we shipped

1. **The change:** v2 wraps every successful response in an envelope. Lists become `{ data, count }`, and single items become `{ data }`.
2. **Why it's worth a break:** with bare lists we can never add paging (`next`, `total`) without breaking Faraja again. The envelope lets us add fields beside `data` later as non-breaking changes. Doing it now, with one consumer, is the cheapest it will ever be.
3. **Prediction: the line in Faraja's code that fails.** Faraja's Week 10 feature searches verified workers by trade and location (`GET /users?role=worker&trade=…&verified=true`) and shows them to funeral committees. The line that loops over that response (something like `workers.map(...)` or `data.forEach(...)`) will fail: the body is now an object, so `.map` is not a function. Their `GET /bookings/{id}` check will then read `undefined` for `status`, because it's now at `body.data.status`. **We haven't seen their code, so we've asked them to confirm.** TODO: their answer.

## How it's built

- `server/server/versions.js`: `toV2()` is the one place that makes the new shape, and `v2Shape` applies it to successful responses. `deprecated()` adds the `Deprecation`, `Sunset` and `Link` headers.
- `server/app.js`: `/v2/...` uses the **same route handlers** as v1, behind `v2Shape`. v1 is mounted at `/v1/...` **and** at the old unversioned URLs, because Faraja calls `/users` today. Both versions are mounted after the API-key check.
- Monitoring logs `baseUrl + path`, so `/stats` shows `GET /users`, `GET /v1/users` and `GET /v2/users` as separate rows.

## Proof that v1 didn't change

- **Test that stays:** `server/tests/versions.test.js` pins the exact v1 job fields, checks that `/jobs` equals `/v1/jobs`, checks the v1 404 shape, the v2 envelope, and the headers on v1 but not v2. It passes.
- **Diff:** TODO, on the demo machine: `curl -s -H "X-API-Key: <key>" <url>/jobs > v1_before.json` on the old code, the same after the update to `v1_after.json`, then `diff v1_before.json v1_after.json`.

## Who still uses v1?

TODO, after Faraja migrates: read `/stats` rows `GET /users`, `GET /v1/users` and `GET /v2/users`, and the `caller` labels in the log. Our partner's key shows up as `key-xxxxxx`. Until their calls move to the `/v2` rows, we can't switch v1 off.

## Our upstream: NyumbaHub (Team 10)

As of 10 Nov we have **not received a deprecation notice or a v2 from NyumbaHub**. We're ready for one: `server/server/partnerVersions.js` is the only file that knows their response shape, and `PARTNER_VERSION` in `.env` picks the version. Migrating means adding their v2 path and parser there, plus a test in `server/tests/resilience.test.js`, then setting `PARTNER_VERSION=v2` and checking the partner page says `"stale": false`. TODO: ask Team 10 whether a v2 is coming.

## Reflection (150–250 words, each of us in our own words)

TODO: write after the exchange with Team 10 and Team 12. Answer the handout's four questions with specifics: how you found out, what you did first, what the notice did well or left out, what you'd change in ours, and what you'd do differently as the API owner.
