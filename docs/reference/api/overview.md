# API overview

The 402md Facilitator exposes an HTTP API for seller registration, payment verification and settlement, discovery, and MPP charge-mode. All endpoints speak JSON unless otherwise stated.

## Base URL

| Environment | URL                       |
| ----------- | ------------------------- |
| Production  | `https://api.402md.com`   |
| Self-hosted | `http://<your-host>:3000` |
| Local       | `http://localhost:3000`   |

The relay also exposes an OpenAPI spec at `/swagger/json` and a Swagger UI at `/swagger`.

## Endpoint groups

| Group                                                                                                | Reference                       |
| ---------------------------------------------------------------------------------------------------- | ------------------------------- |
| Seller registration and discovery (`/register`, `/discover`, `/supported`, `/.well-known/x402.json`) | [sellers](./sellers.md)         |
| x402 settlement (`/verify`, `/settle`, `/bridge/*`)                                                  | [settlements](./settlements.md) |
| MPP charge mode (`/merchants/:id/mpp/*`)                                                             | [MPP](./mpp.md)                 |
| Bazaar and analytics (`/discovery/resources`, `/bazaar/*`)                                           | [discovery](./discovery.md)     |
| Fiat on-ramp (`/onramp`)                                                                             | [on-ramp](./onramp.md)          |
| Health (`/health`)                                                                                   | [health](./health.md)           |

## Authentication

None of the public endpoints require authentication. The x402 protocol authenticates the buyer's payment itself via EIP-3009 signatures (EVM), Soroban SAC signatures (Stellar), or transaction signatures (Solana). The `merchantId` identifies the seller — it is not a secret.

Administrative endpoints (not documented here) are protected by a separate key and are only intended for operators of a self-hosted relay.

## Request format

- `Content-Type: application/json` for all `POST` bodies.
- Query parameters are standard `?key=value` strings.
- Path parameters are URL-escaped.

## Response format

Successful responses return `200 OK` (or `201 Created` for `POST /register`) with a JSON body specific to the endpoint.

## Error envelope

All errors share one shape:

```json
{
  "error": "ERROR_CODE",
  "message": "Human-readable explanation",
  "details": { "optional": "context" }
}
```

| HTTP status                 | Common `error` codes                       |
| --------------------------- | ------------------------------------------ |
| `400 Bad Request`           | `INVALID_PAYMENT`, validation errors       |
| `404 Not Found`             | `SELLER_NOT_FOUND`, `ROUTE_NOT_CONFIGURED` |
| `409 Conflict`              | `REPLAY_DETECTED`                          |
| `429 Too Many Requests`     | `RATE_LIMIT`                               |
| `503 Service Unavailable`   | `CIRCUIT_BREAKER`                          |
| `500 Internal Server Error` | `INTERNAL_ERROR`, `ERROR`                  |

See the [error codes reference](../error-codes.md) for the canonical list.

## Rate limits

Rate limits are applied per IP address (read from `X-Forwarded-For` if present, else the connection IP). Limits are enforced by Redis keys with a rolling window.

| Endpoint                                                                                           | Limit           |
| -------------------------------------------------------------------------------------------------- | --------------- |
| `POST /register`                                                                                   | 3 per hour      |
| `POST /verify`                                                                                     | 1000 per minute |
| `POST /settle`                                                                                     | 500 per minute  |
| `GET /discover`                                                                                    | 100 per minute  |
| `GET /onramp`                                                                                      | 30 per minute   |
| `GET /merchants/:id/mpp/config`                                                                    | 100 per minute  |
| `* /merchants/:id/mpp/charge`                                                                      | 500 per minute  |
| `GET /bazaar`                                                                                      | 100 per minute  |
| `GET /bazaar/stats` · `/routes` · `/resources` · `/sellers` · `/transactions` · `/cost-comparison` | 200 per minute  |

Every other endpoint — including `GET /supported`, `GET /.well-known/x402.json`, `GET /bridge/fees`, `GET /bridge/status/:id`, `GET /discovery/resources`, `GET /health`, and the `/.well-known/agent-skills/*` tree — is currently unrate-limited.

When you exceed a limit you receive `429 Too Many Requests` with `error: "RATE_LIMIT"`.

## Networks

Networks are identified by [CAIP-2](https://github.com/ChainAgnostic/CAIPs/blob/main/CAIPs/caip-2.md) strings.

| Network     | CAIP-2                                             |
| ----------- | -------------------------------------------------- |
| Base        | `eip155:8453` (mainnet) / `eip155:84532` (sepolia) |
| Ethereum    | `eip155:1` / `eip155:11155111`                     |
| Optimism    | `eip155:10` / `eip155:11155420`                    |
| Arbitrum    | `eip155:42161` / `eip155:421614`                   |
| Linea       | `eip155:59144` / `eip155:59141`                    |
| Unichain    | `eip155:130` / `eip155:1301`                       |
| World Chain | `eip155:480` / `eip155:4801`                       |
| Solana      | `solana:mainnet` / `solana:devnet`                 |
| Stellar     | `stellar:pubnet` / `stellar:testnet`               |

Which networks are actually enabled depends on the relay's configuration. Call `GET /supported` or `GET /.well-known/x402.json` to ask the relay.

## USDC amounts

USDC amounts are represented as **strings in base units** (6 decimals for EVM and Solana, 7 decimals for Stellar). The API never returns USDC as a float or a number. `1.000000` USDC on EVM is the string `"1000000"`.

Never use `parseFloat` or `Number()` on amounts. Use a decimal library (`decimal.js`) or `BigInt` for arithmetic.

## Versioning

The API is not yet versioned in its URL. Breaking changes will be announced with at least one deprecation cycle and will bump the first digit of the OpenAPI `version` field in `/swagger/json`. The current version is `0.1.0`.

## CORS

The relay enables CORS for all origins by default on public endpoints, so browser-based buyers (for example, wallet-connected web agents) can call `/verify` and `/settle` without a proxy.
