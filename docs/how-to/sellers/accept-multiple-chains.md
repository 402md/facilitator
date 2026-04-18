# Accept payments on multiple chains

You already have a `merchantId` and want buyers on any supported chain to be able to pay your API. This guide shows how to declare every chain in your `@x402/express` config.

## Prerequisites

- A `merchantId` from [register a seller](./register-and-get-addresses.md).
- An Express (or compatible) HTTP server with `@x402/express` installed.

## 1. Fetch the enabled networks at boot

Declaring chains statically risks drifting from the relay's config. Fetch them once at startup:

```typescript
const discover = await fetch(`${FACILITATOR_URL}/discover?merchantId=${MERCHANT_ID}`).then((r) =>
  r.json(),
)

const accepts = discover.acceptedNetworks.map((n) => ({
  scheme: 'exact',
  network: n.network,
  payTo: n.payTo,
  price: '$0.001',
  extra: { merchantId: MERCHANT_ID },
}))
```

Every entry in `discover.acceptedNetworks` already has `merchantId` in its `extra`. If you prefer, copy it directly.

## 2. Apply the middleware

```typescript
import { paymentMiddleware } from '@x402/express'

app.use(
  paymentMiddleware({
    facilitatorUrl: FACILITATOR_URL,
    routes: {
      'GET /search': { accepts },
      'POST /summarize': { accepts: accepts.map((a) => ({ ...a, price: '$0.005' })) },
    },
  }),
)
```

The same `accepts` list can be reused per route. Override `price` per route as needed.

## 3. Let buyers pick

When a buyer hits your paywalled endpoint, the middleware returns `402 Payment Required` with all `accepts` entries. The buyer's x402 client picks whichever chain it has USDC on and signs accordingly. You never branch on chain in your handler.

## 4. Handle a new chain added later

If the relay adds a chain after your server boots, you have two options:

- **Restart** — `/discover` will return the new entry next boot.
- **Periodically refresh** `accepts` in memory (e.g., every 10 minutes) and reassign the middleware config if it supports runtime mutation.

## What settlement looks like per chain

| Buyer chain | Seller chain | How it settles                                                                                  | Time       |
| ----------- | ------------ | ----------------------------------------------------------------------------------------------- | ---------- |
| Stellar     | Stellar      | Same-chain: facilitator pulls, transfers to you.                                                | < 5 s      |
| Solana      | Stellar      | `crossChainSettle`: Solana → CCTP V2 → Stellar.                                                 | ~25–30 s   |
| Base        | Stellar      | `crossChainSettle`: Base → CCTP V2 (with `depositForBurnWithHook` + `CctpForwarder`) → Stellar. | ~15–19 min |

You do not have to do anything different per chain — the workflow picks the right path. See [architecture](../../explanation/architecture.md).

## Pitfalls

- **Never set `payTo` to your own wallet.** The facilitator will reject the payment — `payTo` must match the relay's address on that chain.
- **Do not forget `extra.merchantId`.** The relay returns `INVALID_PAYMENT` without it.
- **Price is a human-readable string** (e.g. `"$0.001"`). The x402 middleware converts it to base units per chain decimals.

## Next

- [Check settlement status](./check-settlement-status.md)
- [API reference — sellers](../../reference/api/sellers.md)
