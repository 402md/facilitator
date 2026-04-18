# API reference — MPP (Stellar)

MPP (Machine Payments Protocol) is Stripe and Tempo's push-mode payment protocol. On Stellar, the buyer broadcasts a Soroban SAC `transfer` directly — the facilitator verifies and acknowledges. No CCTP bridge, no workflow — the facilitator acts as a payment verifier only.

Both endpoints are scoped to a single seller via the `:merchantId` path parameter. The seller must be registered on `stellar:pubnet` or `stellar:testnet`.

## `GET /merchants/:merchantId/mpp/config`

Returns the MPP method spec for a seller. An agent uses this to know what currency, recipient, and network to sign over.

**Rate limit:** 100 requests per minute per IP.

### Path params

| Param        | Description                             |
| ------------ | --------------------------------------- |
| `merchantId` | The `merchantId` from `POST /register`. |

### Response `200 OK`

```json
{
  "merchantId": "hb-a1b2c3",
  "protocol": "mpp",
  "methods": [
    {
      "name": "stellar",
      "intent": "charge",
      "recipient": "GSELLER...",
      "currency": "CAS3FL6SZ57...",
      "network": "STELLAR_PUBNET"
    }
  ]
}
```

| Field                 | Type   | Description                                                           |
| --------------------- | ------ | --------------------------------------------------------------------- |
| `merchantId`          | string | Echoed.                                                               |
| `protocol`            | string | Always `"mpp"`.                                                       |
| `methods[].name`      | string | Always `"stellar"` for now.                                           |
| `methods[].intent`    | string | Always `"charge"`.                                                    |
| `methods[].recipient` | string | Seller's Stellar address (payments go directly, no bridge).           |
| `methods[].currency`  | string | Stellar USDC contract address on the active network.                  |
| `methods[].network`   | string | `"STELLAR_PUBNET"` or `"STELLAR_TESTNET"` depending on `NETWORK_ENV`. |

### Errors

| Status | `error`            | Cause                 |
| ------ | ------------------ | --------------------- |
| `404`  | `SELLER_NOT_FOUND` | Unknown `merchantId`. |
| `429`  | `RATE_LIMIT`       |                       |

## `* /merchants/:merchantId/mpp/charge`

Charge mode endpoint. Accepts any HTTP method (`GET`, `POST`, `PUT`, `PATCH`, `DELETE`) because MPP negotiates the method during the challenge. The relay delegates to the official `@stellar/mpp` server.

**Rate limit:** 500 requests per minute per IP.

### Path params

| Param        | Description                |
| ------------ | -------------------------- |
| `merchantId` | The seller's `merchantId`. |

### Query parameters

| Param    | Required | Default | Description                                            |
| -------- | -------- | ------- | ------------------------------------------------------ |
| `amount` | no       | `"0"`   | Charge amount in Stellar USDC base units (7 decimals). |

### Request body

Shape depends on the MPP protocol state:

- First request (no payment): no body required. Relay issues a `402 Payment Required` challenge.
- Second request (with payment): MPP credential object, as produced by the `@stellar/mpp` client after signing the challenge.

### Response

**`402 Payment Required`** — initial challenge:

Response headers include the MPP `WWW-Authenticate` challenge. The `@stellar/mpp` client reads this and signs a Soroban SAC `transfer` from the buyer to the seller's `recipient`.

**`200 OK`** — after successful payment:

```json
{
  "paid": true,
  "merchantId": "hb-a1b2c3"
}
```

Headers include `Payment-Receipt` with proof of the on-chain transfer.

### Errors

| Status | `error`            | Cause                 |
| ------ | ------------------ | --------------------- |
| `404`  | `SELLER_NOT_FOUND` | Unknown `merchantId`. |
| `429`  | `RATE_LIMIT`       |                       |

### Flow diagram

```
Agent                  Seller API              Relay (/mpp/charge)           Stellar
  │                        │                          │                         │
  │──GET /search──────────►│                          │                         │
  │                        │──GET …/mpp/charge───────►│                         │
  │                        │◄────402 + challenge──────│                         │
  │◄──402 + challenge──────│                          │                         │
  │                                                                              │
  │── sign Soroban SAC transfer via @stellar/mpp client ─────────────────────────►│
  │                                                                   (tx on chain)
  │                                                                              │
  │──GET /search + credential──►│                     │                         │
  │                        │──GET …/mpp/charge + cred►│                         │
  │                        │                          │── verify tx ────────────►│
  │                        │                          │◄── tx OK ────────────────│
  │                        │◄──200 + receipt──────────│                         │
  │◄──200 + results────────│                          │                         │
```

### When to use MPP vs x402

| Situation                                                             | Protocol                                                    |
| --------------------------------------------------------------------- | ----------------------------------------------------------- |
| Buyer and seller both on Stellar and you want the simplest push model | MPP                                                         |
| Buyer on any chain, need cross-chain settlement                       | x402 (CCTP)                                                 |
| Buyer wants to delegate gas to the facilitator                        | x402 (buyer signs an authorization; facilitator broadcasts) |
| Seller wants an existing Stellar wallet and push-mode tx              | MPP                                                         |

See the [dual-protocol explanation](../../explanation/dual-protocol-x402-mpp.md) for the full trade-off.
