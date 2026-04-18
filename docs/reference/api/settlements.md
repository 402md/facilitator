# API reference — settlements

x402 verification, settlement dispatch, workflow status, and fee quotes. These endpoints are consumed by the `@x402/express` middleware (or any x402-compatible server); they are not usually called by hand.

## `POST /verify`

Synchronously validate an x402 payment payload before returning the resource to the buyer. This endpoint never moves funds — it only answers "is this payment authorization valid?". Target latency: p95 < 50 ms.

**Rate limit:** 1000 requests per minute per IP.

### Request body

Standard x402 v2 verification payload:

| Field                                  | Type   | Required | Description                                                                            |
| -------------------------------------- | ------ | -------- | -------------------------------------------------------------------------------------- |
| `x402Version`                          | number | yes      | `2`.                                                                                   |
| `paymentPayload`                       | object | yes      | x402 payment object.                                                                   |
| `paymentPayload.payload.signature`     | string | yes      | Buyer's signature (≥ 10 chars).                                                        |
| `paymentPayload.payload`               | object | yes      | Scheme-specific data (EIP-3009 authorization, Soroban tx, SPL instruction).            |
| `paymentRequirements`                  | object | yes      | The server's declared requirements.                                                    |
| `paymentRequirements.scheme`           | string | yes      | `"exact"`.                                                                             |
| `paymentRequirements.network`          | string | yes      | CAIP-2.                                                                                |
| `paymentRequirements.payTo`            | string | yes      | Facilitator address on `network`. Must match the relay's own address for that network. |
| `paymentRequirements.amount`           | string | yes      | Amount in base units. Must be > 0.                                                     |
| `paymentRequirements.extra.merchantId` | string | yes      | Identifies the target seller.                                                          |

### Response `200 OK`

| Field            | Type    | Description                                    |
| ---------------- | ------- | ---------------------------------------------- |
| `isValid`        | boolean | `true` if the payment is acceptable.           |
| `invalidReason`  | string  | Machine-readable reason when `isValid: false`. |
| `invalidMessage` | string  | Human-readable detail.                         |
| `payer`          | string  | Buyer address, if recoverable.                 |

### Validation rules

- `extra.merchantId` must exist.
- The seller identified by `merchantId` must exist.
- `network` must be enabled.
- `payTo` must equal the relay's facilitator address on `network`.
- `payload.signature` must be present.
- `amount` must be > 0.

### Errors

| Status | `error`      | Cause           |
| ------ | ------------ | --------------- |
| `400`  | validation   | Malformed body. |
| `429`  | `RATE_LIMIT` |                 |

> Note: a valid JSON payload with a semantically invalid payment returns `200 OK` with `isValid: false`, not a `4xx`. Only request malformed-ness produces a `4xx`.

## `POST /settle`

Dispatch a Temporal workflow to pull USDC from the buyer and deliver it to the seller. Returns immediately with a `workflowId`; settlement happens asynchronously.

**Rate limit:** 500 requests per minute per IP.

### Request body

Identical shape to `POST /verify`.

### Response `200 OK`

| Field          | Type    | Description                                                           |
| -------------- | ------- | --------------------------------------------------------------------- |
| `success`      | boolean | `true` if dispatch succeeded.                                         |
| `transaction`  | string  | The Temporal `workflowId` — use it with `/bridge/status/:workflowId`. |
| `network`      | string  | Buyer network (CAIP-2).                                               |
| `payer`        | string  | Buyer address.                                                        |
| `errorReason`  | string  | Present when `success: false`.                                        |
| `errorMessage` | string  |                                                                       |

### Workflow selection

- Buyer network === seller network → `sameChainSettle`.
- Different networks → `crossChainSettle`.

### Errors

| Status | `error`            | Cause                                                          |
| ------ | ------------------ | -------------------------------------------------------------- |
| `400`  | `INVALID_PAYMENT`  | Missing `merchantId`, zero amount, etc.                        |
| `404`  | `SELLER_NOT_FOUND` | `merchantId` unknown.                                          |
| `409`  | `REPLAY_DETECTED`  | Same signature already settled (EIP-3009 nonce or equivalent). |
| `429`  | `RATE_LIMIT`       |                                                                |
| `503`  | `CIRCUIT_BREAKER`  | Per-tx limit, daily volume limit, or global pause is active.   |

## `GET /bridge/status/:workflowId`

Query the current state of a settlement workflow.

**No rate limit.**

### Path params

| Param        | Description                                            |
| ------------ | ------------------------------------------------------ |
| `workflowId` | The value returned as `transaction` by `POST /settle`. |

### Response `200 OK`

Shape depends on the workflow type.

**`sameChainSettle`:**

| Field             | Type    | Description                                                     |
| ----------------- | ------- | --------------------------------------------------------------- |
| `status` / `step` | string  | `pulling`, `transferring`, `recording`, `settled`, or `failed`. |
| `pullTxHash`      | string? | Populated once the pull tx lands.                               |
| `transferTxHash`  | string? | Populated once the transfer to seller lands.                    |
| `error`           | string? | Populated if `failed`.                                          |

**`crossChainSettle`:**

| Field             | Type    | Description                                                                        |
| ----------------- | ------- | ---------------------------------------------------------------------------------- |
| `status` / `step` | string  | `pulling`, `burning`, `attesting`, `minting`, `recording`, `settled`, or `failed`. |
| `pullTxHash`      | string? |                                                                                    |
| `burnTxHash`      | string? |                                                                                    |
| `attestation`     | string? | Circle attestation hex, once received.                                             |
| `mintTxHash`      | string? |                                                                                    |
| `error`           | string? |                                                                                    |

### Errors

| Status | Cause                 |
| ------ | --------------------- |
| `404`  | `workflowId` unknown. |

## `GET /bridge/fees`

Quote the fee breakdown for a given route and amount. This is the authoritative source for gas allowances — the static schedule in [fees](../fees.md) is for reference only.

**No rate limit.**

### Query parameters

| Param    | Required | Description                 |
| -------- | -------- | --------------------------- |
| `from`   | yes      | Buyer network (CAIP-2).     |
| `to`     | yes      | Seller network (CAIP-2).    |
| `amount` | yes      | Gross amount in base units. |

### Response `200 OK`

| Field            | Type   | Description                                                 |
| ---------------- | ------ | ----------------------------------------------------------- |
| `platformFee`    | string | Base-unit amount deducted as platform fee. Currently `"0"`. |
| `gasAllowance`   | string | Base-unit amount deducted to reimburse facilitator gas.     |
| `totalDeduction` | string | `platformFee + gasAllowance`.                               |
| `sellerReceives` | string | `amount - totalDeduction`.                                  |
| `currency`       | string | `"USDC"`.                                                   |
| `decimals`       | number | `6` for EVM and Solana, `7` for Stellar.                    |
| `note`           | string | Plain-text explanation of the allowance.                    |

### Errors

| Status | `error`                | Cause                             |
| ------ | ---------------------- | --------------------------------- |
| `400`  | validation             | Missing `from` / `to` / `amount`. |
| `404`  | `ROUTE_NOT_CONFIGURED` | No gas schedule for this pair.    |

### Example

```bash
curl "https://api.402md.com/bridge/fees?from=eip155:8453&to=stellar:pubnet&amount=1000000"
```

```json
{
  "platformFee": "0",
  "gasAllowance": "500",
  "totalDeduction": "500",
  "sellerReceives": "999500",
  "currency": "USDC",
  "decimals": 6,
  "note": "Gas allowance covers pull + burn + mint on this route."
}
```
