# Error codes

Every error returned by the relay uses the same JSON envelope:

```json
{
  "error": "CODE",
  "message": "Human-readable detail",
  "details": { "optional": "context" }
}
```

## Canonical codes

| `error`                | HTTP                  | Cause                                                                                                                         | Raised by                                                                                                             |
| ---------------------- | --------------------- | ----------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `SELLER_NOT_FOUND`     | `404`                 | Unknown `merchantId`.                                                                                                         | `/discover`, `/settle`, `/merchants/:id/mpp/config`, `/merchants/:id/mpp/charge`, `/bazaar/transactions?merchantId=…` |
| `INVALID_PAYMENT`      | `400`                 | Payment validation failed (missing `merchantId`, zero amount, `payTo` mismatch, invalid signature, amount over per-tx limit). | `/verify`, `/settle`                                                                                                  |
| `REPLAY_DETECTED`      | `409`                 | Signature / nonce already settled.                                                                                            | `/settle`                                                                                                             |
| `CIRCUIT_BREAKER`      | `503`                 | Per-tx limit, daily volume limit, or global pause is active.                                                                  | `/settle`                                                                                                             |
| `RATE_LIMIT`           | `429`                 | Per-IP rate limit exceeded on this endpoint.                                                                                  | All rate-limited endpoints                                                                                            |
| `ROUTE_NOT_CONFIGURED` | `404`                 | No gas allowance schedule for the `from` / `to` pair.                                                                         | `/bridge/fees`, `/bazaar/cost-comparison`                                                                             |
| `ERROR`                | varies (defaults 500) | Custom operational error raised by a route handler.                                                                           | Any                                                                                                                   |
| `INTERNAL_ERROR`       | `500`                 | Unhandled exception.                                                                                                          | Any — check logs / traces.                                                                                            |

There is no `UnsupportedNetworkError` in the canonical list because it is raised during registration only; it surfaces with HTTP `404` and the same envelope.

## Validation failures

Request-shape failures (missing required fields, wrong types, `minLength` violations) return `400 Bad Request` with Elysia's default error format — not the envelope above. You will see:

```json
{
  "type": "validation",
  "on": "body",
  "property": "/wallet",
  "message": "Expected string to have a length of at least 10"
}
```

If you write a client, handle both shapes.

## `invalidReason` inside `/verify`

`POST /verify` returns HTTP `200` with `isValid: false` and a machine-readable `invalidReason`. These are not top-level errors. Common values:

| `invalidReason`         | Meaning                                             |
| ----------------------- | --------------------------------------------------- |
| `missing_merchantId`    | `extra.merchantId` not set.                         |
| `seller_not_found`      | `merchantId` unknown.                               |
| `network_not_supported` | `network` not enabled on this relay.                |
| `payTo_mismatch`        | `payTo` is not the relay's address on this network. |
| `invalid_signature`     | Cryptographic check failed.                         |
| `amount_too_small`      | Amount ≤ 0 or below scheme minimum.                 |
| `expired_authorization` | `validBefore` already passed.                       |

`invalidMessage` is the human-readable counterpart. Surface it to the buyer's client so they can retry correctly.

## Troubleshooting by `error`

- **`CIRCUIT_BREAKER` on every settle** — check `redis-cli GET facilitator:pause`, `GET volume:daily:YYYY-MM-DD`, and `MAX_TX_AMOUNT`. See [trigger circuit breakers](../how-to/operations/trigger-circuit-breakers.md).
- **`REPLAY_DETECTED`** — the EIP-3009 nonce or Stellar authorization nonce has already been consumed. The buyer must sign a fresh one. There is no "release nonce" — this is a security feature.
- **`SELLER_NOT_FOUND` on a newly-registered merchant** — check you are hitting the same relay instance you registered with (PostgreSQL, not Redis, persists sellers).
- **`ROUTE_NOT_CONFIGURED`** — the pair does not have a gas schedule entry. Add one in `packages/shared/src/networks/gas-schedule.ts` and redeploy.
- **`INTERNAL_ERROR`** — always a bug. Report it with the `workflowId` (if applicable) and the request `id` from the logs.

## No alerting on `RATE_LIMIT`

`429`s are part of normal operation — chatty agents hit them. Do not alert on `RATE_LIMIT` at the infra level; monitor it per-endpoint for abuse patterns instead.
