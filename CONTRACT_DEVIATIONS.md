# Contract Deviations

## Week 6

- **POST /jobs: added 400 Bad Request response.** Validation rejects missing required fields, wrong types, empty strings, non-positive pay, employerIds that don't match an existing employer, and malformed JSON, returning the contract's `Error` shape. The original contract only listed 201 and 500.
- **POST /jobs: 201 response now returns the stored record.** It includes defaults (`payType`, `urgent`, `isActive`) instead of echoing the request body.
- **GET /jobs is implemented but not in openapi.yaml** (carried over from Week 5). To be added to the contract or removed.

## Week 8

`openapi.yaml` was brought in line with what the server actually does, so the published docs (`docs/index.html`) match the running API.

- **Added 7 implemented endpoints that were missing from the contract:** `GET /jobs`, `POST /users`, `PUT /users/{id}`, `DELETE /users/{id}`, `POST /users/login`, `POST /bookings`, `PUT /bookings/{id}`. This closes the Week 6 note about `GET /jobs`.
- **Error shape updated.** Validation errors return `{ "error": "Validation failed", "details": [...] }`; the `Error` schema now includes the optional `details` array. Old examples such as `error: title is required` didn't match the code.
- **Added 404s:** `GET /jobs/{id}/bookings` (unknown job) and any unknown route (`Route not found`).
- **POST /jobs: `employerId` is now optional in the contract**, matching the code. If it's given but doesn't exist, the API returns 400.
- **POST /jobs validation is currently simpler than Week 6 described.** A teammate's recent push replaced the detailed per-field checks with one combined check, so `pay: 0` is accepted and the message is a single combined line. The contract documents the current behaviour; restoring the per-field messages is a to-do.
- **POST /jobs 201 again returns the stored record** (it had regressed to echoing the request body).
- **POST /bookings and PUT /bookings/{id}:** bad input used to return 500. They now return 400 (invalid fields or status) or 404 (job, worker or booking not found), and both return the full stored booking.
- **Declared `security: []`:** no authentication until Week 9 (replaced in Week 9, below).
- **Server fix:** `server/index.js` crashed on start (`ReferenceError: cors is not defined`) after the last merge. Routes and middleware now live only in `app.js`, and `index.js` just starts it.
- **Added `server/schema.sql` and `server/.env.example`** so the API can be set up from a clean clone.

## Week 9

Breaking change for consumers: **every endpoint except `GET /` now needs an `X-API-Key` header.** Consumers were sent their own key privately.

- **Security scheme added:** `ApiKeyAuth` (header `X-API-Key`), applied to every operation. Replaces Week 8's `security: []`.
- **New responses on every protected endpoint:** `401` (`Missing or invalid API key`) and `429` (`Too many requests`, with a `Retry-After` header and a `retryAfter` field). `retryAfter` was added to the `Error` schema.
- **Added `GET /` health check** to the contract. It's the only operation that needs no key.
- **`GET /users` returns `UserSummary` (no `email`).** This came from the security audit; `GET /users/{id}` still includes `email`.
- **`verified` removed from `NewUser` and `UserUpdate`.** It's ignored if sent, and new users always start unverified.
- **`role` must be `worker` or `employer`.** Other values now get 400 instead of 500.
- **Login now checks hashed passwords.** There's no change to the request or response shape.
- **Version bumped to 1.2.0.**

## Week 10

- **Added `GET /partner/vacant-homes`** (tag Partner, `security: []`). Our web page calls it to show NyumbaHub homes that just became available. It returns `{ source, count, homes: [...] }`, or `502 {"error":"Partner data unavailable"}` when NyumbaHub can't be reached or answers unexpectedly. It's limited to 30 requests a minute per IP.
- **Version bumped to 1.3.0.**
