# Register a seller and get facilitator addresses

You want to start receiving cross-chain USDC. This guide covers the one-time registration and what to do with the response.

## Prerequisites

- A wallet on the chain you want to receive settlement on (Stellar, Solana, or any supported EVM).
- The relay's base URL (`https://api.402md.com` or your self-hosted instance).

## 1. Call `POST /register`

```bash
curl -X POST https://api.402md.com/register \
  -H "Content-Type: application/json" \
  -d '{
    "wallet": "GSELLER...",
    "network": "stellar:pubnet"
  }'
```

- `wallet` must be ≥ 10 characters and use the chain's native format.
- `network` must be one of the enabled CAIP-2s — call `GET /supported` first if unsure.

## 2. Save the response

```json
{
  "merchantId": "hb-a1b2c3",
  "wallet": "GSELLER...",
  "network": "stellar:pubnet",
  "facilitatorAddresses": {
    "eip155:8453": "0xFacilitator...",
    "solana:mainnet": "FacilitatorSol...",
    "stellar:pubnet": "GFacilitator..."
  }
}
```

You need two things from here:

- **`merchantId`** — goes into `extra.merchantId` in every `@x402/express` `accepts` entry. Without it the facilitator cannot route the payment.
- **`facilitatorAddresses`** — goes into `payTo` per chain. Do not use your own wallet as `payTo`.

## 3. Keep the `merchantId` safe but not secret

The `merchantId` identifies you, not authorizes you. It is safe to include in HTTP responses, logs, and public repositories. However:

- Do not let a malicious party swap it in your `accepts` config — that would route their traffic to your seller account. Treat the config file the same way you treat any deployment config.
- Rotate wallets by registering a new one (you will get a new `merchantId`). There is no "change wallet" endpoint — this keeps the settlement ledger append-only.

## 4. Verify with `GET /discover`

Sanity-check the registration:

```bash
curl "https://api.402md.com/discover?merchantId=hb-a1b2c3"
```

The response includes the same `facilitatorAddresses`, the accepted networks, and the fee structure.

## Common errors

| You see                       | Meaning                                       | Fix                                 |
| ----------------------------- | --------------------------------------------- | ----------------------------------- |
| `400` validation              | `wallet` < 10 chars or `network` missing      | Check the body shape.               |
| `404 UnsupportedNetworkError` | `network` not enabled on this relay           | Call `GET /supported` and pick one. |
| `429 RATE_LIMIT`              | 3 registrations from your IP in the last hour | Wait or switch IP.                  |

## Next

- [Accept multiple chains](./accept-multiple-chains.md) — use `facilitatorAddresses` across all chains in one config.
- [API reference — sellers](../../reference/api/sellers.md).
