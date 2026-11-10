# Deprecation notice: FundiLink API v1

**To:** Team 12 (Faraja) **From:** Team 11 (FundiLink) **Date:** 10 November 2026

## Summary

The unversioned FundiLink URLs (`/users`, `/jobs`, `/bookings`) and `/v1/...` are deprecated. **v2 is live now at `/v2/...`.** v1 will stop working on **Friday 20 November 2026**. Please move before then. v1 keeps working, unchanged, until that date, including through Demo Day.

## What is changing

- **Lists are wrapped:** `[ ... ]` becomes `{ "data": [ ... ], "count": N }`. This applies to `GET /users`, `GET /jobs` and `GET /jobs/{id}/bookings`.
- **Single items are wrapped:** `{ ...item }` becomes `{ "data": { ...item } }`. This applies to `GET /users/{id}`, `GET /bookings/{id}`, `POST /jobs`, `POST /bookings` and `PUT /bookings/{id}`.
- **Nothing else changes:** the same fields inside each item (`id`, `firstName`, `trade`, `verified`, `pay`, `status`…), the same filters (`?role=worker&trade=…&location=…&verified=true`), the same status codes, the same error shape (`{ "error": "…" }`), and **the same API key** in `X-API-Key`.

## Why

With a bare list, we can't add paging later (a next page, a total count) without breaking you again. With `{ data, count }`, we can add new fields beside `data` at any time, and your code won't notice.

## Before and after

v1 `GET /users?role=worker&trade=plumbing&verified=true`

```json
[ { "id": 1, "firstName": "John", "lastName": "Kamau", "role": "worker", "trade": "plumbing", "location": "Westlands, Nairobi", "verified": true } ]
```

v2 `GET /v2/users?role=worker&trade=plumbing&verified=true`

```json
{ "data": [ { "id": 1, "firstName": "John", "lastName": "Kamau", "role": "worker", "trade": "plumbing", "location": "Westlands, Nairobi", "verified": true } ],
  "count": 1 }
```

v2 `GET /v2/bookings/1`

```json
{ "data": { "id": 1, "jobId": 1, "workerId": 1, "workerName": "John Kamau", "status": "pending", "appliedAt": "…" } }
```

## How to migrate

1. Put `/v2` in front of every path: `/users` becomes `/v2/users`, `/jobs` becomes `/v2/jobs`, and so on. Same key, same query parameters, same request bodies.
2. Read lists from `body.data` instead of from the body itself. You can use `body.count` instead of `body.length`.
3. Read single items from `body.data`. For example, `body.data.status` instead of `body.status`.
4. Error handling doesn't change: errors are still `{ "error": "…" }` with the same status codes.
5. Test it, then tell us. We'll check that your calls appear on the `GET /v2/...` rows of our `/stats`.

## How you'll know you're still on v1

Every v1 response now carries three headers:

```
Deprecation: true
Sunset: Fri, 20 Nov 2026 00:00:00 GMT
Link: </v2/users>; rel="successor-version"
```

## Timeline

- **10 Nov 2026:** v2 is live. v1 still works and sends the headers above.
- **Demo Day:** v1 and v2 both work, so nobody's demo breaks.
- **20 Nov 2026:** v1 stops working.

## Questions

Message Kwezikulu (Team 11) any time. We'll reply the same day.
