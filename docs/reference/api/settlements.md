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
| `paymentPayload.payload.signature`     | string | yes      | Buyer's signature. On EVM: 65-byte hex EIP-3009 signature.                             |
| `paymentPayload.payload.authorization` | object | yes      | Signed authorization: `from`, `to`, `value`, `validAfter`, `validBefore`, `nonce`.     |
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

`invalidReason` uses the [x402 error codes](../error-codes.md#x402-payment-reasons).

- `extra.merchantId` must exist and resolve to a registered seller.
- `network` must be enabled.
- `payTo` must equal the relay's facilitator address on `network`.
- `amount` must be an integer string greater than zero.
- `payload.authorization` must be present with all six fields.
- `authorization.value` must equal `amount`, and `authorization.to` must equal `payTo`.
- The authorization must be inside its `validAfter` / `validBefore` window.
- On EVM: the EIP-3009 signature must recover to `authorization.from`. The EIP-712 domain comes from the relay's own chain registry — chain id, the USDC contract, and that deployment's `name` / `version` — never from the request.

> Solana and Stellar carry a chain-native authorization instead of an EIP-3009 signature. Everything above still applies except the signature recovery, which the chain adapter performs when the pull is submitted.

### Errors

| Status | `error`      | Cause           |
| ------ | ------------ | --------------- |
| `400`  | validation   | Malformed body. |
| `429`  | `RATE_LIMIT` |                 |

> Note: a valid JSON payload with a semantically invalid payment returns `200 OK` with `isValid: false`, not a `4xx`. Only request malformed-ness produces a `4xx`.

## `POST /settle`

Collect the buyer's USDC and deliver it to the seller. Runs the same validation as `/verify`, starts a Temporal workflow, and **waits for the buyer's funds to be captured on the source chain** before answering. `success: true` therefore means the buyer has irreversibly paid, and `transaction` is the hash of that capture — an x402 client can treat the payment as settled and release the resource.

**Rate limit:** 500 requests per minute per IP.

### What "settled" means here

Settlement has two legs:

1. **Capture** — `transferWithAuthorization` moves USDC from the buyer to the facilitator on the buyer's chain. One tx confirmation, typically 1–15 s. `/settle` waits for this.
2. **Delivery** — for a cross-chain payment, CCTP burn → attestation → mint on the seller's chain, 15–19 min. This is the facilitator's obligation to the seller, not a condition of the buyer's payment, so `/settle` does **not** wait for it. Same-chain delivery is a second transfer moments later.

The seller gets a real tx hash to validate, and the funds land on their chain once the bridge completes. Poll [`GET /bridge/status/:workflowId`](#get-bridgestatusworkflowid) to watch the delivery leg.

### Timeouts

The capture wait is bounded by `SETTLE_WAIT_TIMEOUT_MS` (default 60 s), against a capture that normally confirms in 1–15 s. On timeout the response is `success: false` with `errorReason: unexpected_settle_error`, plus the `workflowId` under `extensions['402md']`. The workflow is **not** cancelled — cancelling after the pull transaction is broadcast would strand USDC in the facilitator wallet with no delivery leg.

> **Retry carefully after a timeout.** Repeating the _same_ request is safe: the workflow id derives from the payment signature, so it joins the running execution instead of pulling twice. Signing a **new** authorization is not — that is a distinct payment, and if the timed-out workflow later completes its pull, the buyer is charged twice. On a timeout, poll `/bridge/status/:workflowId` and only re-sign once the workflow is confirmed failed.

Volume is counted against the daily circuit breaker when the workflow is dispatched, not when it succeeds, so a settlement that outlives the wait is still accounted for.

### Request body

Identical shape to `POST /verify`.

### Response `200 OK`

| Field          | Type    | Description                                                                              |
| -------------- | ------- | ---------------------------------------------------------------------------------------- |
| `success`      | boolean | `true` once the buyer's funds are captured on-chain.                                     |
| `transaction`  | string  | Hash of the capture tx on `network`. Empty string when settlement failed.                |
| `network`      | string  | Buyer network (CAIP-2) — the chain `transaction` belongs to.                             |
| `payer`        | string  | Buyer address.                                                                           |
| `amount`       | string  | Amount settled, in base units.                                                           |
| `workflowId`   | string  | 402md extension — handle for `/bridge/status/:workflowId`.                               |
| `extensions`   | object  | `{ "402md": { "workflowId": … } }` — see the note below.                                 |
| `errorReason`  | string  | Present when `success: false`. See [x402 codes](../error-codes.md#x402-payment-reasons). |
| `errorMessage` | string  | Human-readable detail.                                                                   |

> `workflowId` appears twice on purpose. The top-level field is for direct API consumers, but x402 client libraries validate the settle response against the spec's schema and **discard unknown top-level fields** — `extensions` is the only copy that survives to a seller running standard middleware, and to the `PAYMENT-RESPONSE` header.

```json
{
  "success": true,
  "transaction": "0x9f2c…",
  "network": "eip155:8453",
  "payer": "0x857b06519E91e3A54538791bDbb0E22373e36b66",
  "amount": "1000000",
  "workflowId": "cross-solana:mainnet-eip155:8453-0x1a2b3c4d5e6f7890",
  "extensions": {
    "402md": { "workflowId": "cross-solana:mainnet-eip155:8453-0x1a2b3c4d5e6f7890" }
  }
}
```

### Workflow selection

- Buyer network === seller network → `sameChainSettle`.
- Different networks → `crossChainSettle`.

### Errors

A payment the facilitator understands but will not accept returns `200 OK` with `success: false` and an `errorReason`, not a `4xx`. The statuses below are reserved for operational conditions.

| Status | `error`            | Cause                                                          |
| ------ | ------------------ | -------------------------------------------------------------- |
| `400`  | `INVALID_PAYMENT`  | `merchantId` missing from `paymentRequirements.extra`.         |
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
