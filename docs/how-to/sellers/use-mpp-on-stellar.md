# Use MPP on Stellar

This guide shows how to accept Stellar-only payments using the push-mode MPP charge flow via the official `@stellar/mpp` SDK. Use this when your buyers are already on Stellar and you want to skip the x402 pull flow.

## When to use this

- Buyer and seller both on Stellar.
- You want the buyer to broadcast the payment (and pay the Stellar fee) directly — no CCTP bridging.
- You already know your users have a Stellar keypair.

If any buyer is on a different chain, use x402 instead — see [accept multiple chains](./accept-multiple-chains.md).

## Prerequisites

- A registered seller on `stellar:pubnet` or `stellar:testnet`.
- Your `merchantId`.
- An HTTP server (any language, but `@stellar/mpp` ships a Node/Bun SDK).

## 1. Expose the `/mpp/config` metadata

Your API server only needs to proxy the relay's config endpoint so agents can discover how to pay:

```
GET https://api.402md.com/merchants/:merchantId/mpp/config
```

Response tells the agent which Stellar USDC contract, which recipient, which network to use. You do not have to mirror this — agents can call the relay directly.

## 2. Wire a paywalled route with `Mppx`

```typescript
import { Mppx } from '@stellar/mpp/charge/server'

const mpp = new Mppx({
  network: 'STELLAR_PUBNET',
  recipient: process.env.SELLER_WALLET, // your Stellar address
  currency: process.env.STELLAR_USDC_CONTRACT, // USDC SAC on Stellar
  secret: process.env.MPP_SECRET_KEY, // HMAC secret
})

app.get('/search', async (req, res) => {
  const charge = await mpp.charge(req, { amount: '1000000' }) // 0.001 USDC
  if (charge.type === 'challenge') {
    return res.status(402).set(charge.headers).send(charge.body)
  }
  if (!charge.paid) {
    return res.status(402).send('payment failed')
  }
  // charge.paid === true — serve the resource
  res.json({
    query: req.query.q,
    results: [
      /* ... */
    ],
  })
})
```

`Mppx` handles the full state machine: issues a 402 challenge on the first hit, verifies the Soroban SAC transfer on the second.

## 3. Or delegate to the relay

You can skip `Mppx` in your own server entirely and forward the request to the relay's charge endpoint:

```typescript
app.get('/search', async (req, res) => {
  const upstream = await fetch(
    `${FACILITATOR_URL}/merchants/${MERCHANT_ID}/mpp/charge?amount=1000000`,
    { headers: req.headers },
  )
  if (upstream.status !== 200) {
    return res
      .status(upstream.status)
      .set(Object.fromEntries(upstream.headers))
      .send(await upstream.text())
  }
  // Paid — serve the resource
  res.json({
    query: req.query.q,
    results: [
      /* ... */
    ],
  })
})
```

This is what the `demo-seller` package does in this repo.

## 4. Point your agents at the config URL

If your buyers use a stock `@stellar/mpp` client, publish the config URL as the entry point:

```
https://api.402md.com/merchants/hb-a1b2c3/mpp/config
```

The client will read it, sign the challenge, and retry.

## Amount encoding

MPP amounts are Stellar USDC **stroops** (7 decimals). `1` USDC = `10000000`. The relay's `amount` query string is the base-unit integer.

## Pitfalls

- **`MPP_SECRET_KEY` must match** between the relay and the library that signs challenges. If you delegate to the relay, you do not set this locally.
- **Testnet vs pubnet** is resolved from `NETWORK_ENV` on the relay. Register on the network you intend to use — you cannot mix.
- **No CCTP here.** MPP charge is Stellar-only. Do not expect cross-chain settlement from this flow.

## Next

- [API reference — MPP](../../reference/api/mpp.md)
- [Dual-protocol explanation](../../explanation/dual-protocol-x402-mpp.md)
