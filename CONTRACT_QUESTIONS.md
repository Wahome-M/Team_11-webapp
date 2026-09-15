# Contract Questions — NyumbaHub API (received from ring partner)

Reviewed `openapi.yaml` (NyumbaHub API v1.0.0) as if building against it for the first time. Three specific ambiguities/questions below.

## 1. Inconsistent `updatedAt` typing between endpoints

In `GET /listings`, the `updatedAt` field is typed as:
```yaml
updatedAt:
  type: string
  format: date-time
```

But in `GET /bookings`, the same conceptual field is typed as just:
```yaml
updatedAt:
  type: string
```
with no `format` specified.

**Question:** Is the missing `format: date-time` on the `/bookings` response an oversight, or is `bookings.updatedAt` intentionally a different format (e.g. a Unix timestamp string, or a different date convention)? As written, a consumer can't safely assume it's parseable the same way as `listings.updatedAt`.

## 2. No way to distinguish "listing doesn't exist" from "landlord opted out" on `/listings/{id}/landlord-contact`

The endpoint description says it returns "not available" if the landlord hasn't opted in to contact, and the response schema is:
```yaml
available: boolean
contact: object (nullable)
```

Only a `200` response is documented anywhere in the entire contract — no `404` or other error case exists for any endpoint.

**Question:** If I request `/listings/{id}/landlord-contact` for an `id` that doesn't exist at all, do I get a `404`, or the same `200 { available: false, contact: null }` response as a listing that exists but whose landlord opted out? These are very different situations (invalid input vs. valid-but-restricted data) and right now they appear indistinguishable from the response alone.

## 3. Why is `status` a required query parameter with only one legal value?

Both `GET /listings` and `GET /bookings` define `status` as `required: true`, but the enum only permits a single value in each case (`[available]` and `[refunded]` respectively).

**Question:** Since no other value is valid, is this parameter meant to support additional statuses in a future version (e.g. `pending`, `withdrawn`)? And if a caller sends a value outside the enum today, what's the actual behavior — a `400` rejection, or is it silently ignored? Right now this isn't specified, and the parameter's purpose (as opposed to just hardcoding the filter into the endpoint) isn't clear from the contract alone.