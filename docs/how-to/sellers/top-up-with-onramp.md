# Top up a wallet with an on-ramp

The facilitator does not hold USDC for you — settlement lands in your wallet. This guide helps your users (or you) buy USDC with fiat to have something to spend as a buyer.

If you are a **seller** receiving payments, you do not need an on-ramp — USDC arrives via settlement. You may want an on-ramp if you are also a buyer, or if your product is itself an agent that pays for services.

## 1. Ask the relay for providers

```bash
curl "https://api.402md.com/onramp?network=stellar:pubnet&walletAddress=GSELLER..."
```

Response lists matching providers:

```json
{
  "providers": [
    { "name": "Bridge.xyz", "method": "pix", "regions": ["BR"], "kycUrl": "…", "fees": "~1%" },
    {
      "name": "MoneyGram Ramps",
      "method": "cash",
      "regions": ["BR", "MX", "CO", "AR"],
      "kycUrl": "…",
      "fees": "varies"
    }
  ],
  "manual": "Send USDC directly from any exchange supporting stellar:pubnet."
}
```

- `network` defaults to `stellar:pubnet` if omitted.
- `walletAddress`, when supplied, may be pre-filled into each provider's `kycUrl`.

## 2. Hand the user off to `kycUrl`

Open `kycUrl` in a browser (or a WebView). The provider handles KYC, payment method, and delivery. USDC lands in the wallet you specified.

## 3. Fallback: manual deposit

If no provider fits the user's region, show `manual` as a human-readable instruction ("send USDC from any exchange supporting this network"). Most exchanges support withdrawal to the EVM and Solana families; Stellar support is more limited.

## Testnets

There is no on-ramp for testnets — use Stellar's Friendbot, Solana's `airdrop`, or a public Base Sepolia faucet. The `/onramp` endpoint lists mainnet providers only.

## Adding a new provider

The provider list is currently hard-coded in the relay at `packages/relay/src/onramp/onramp.service.ts`. Open a PR adding the provider entry and its region/method metadata.

## Next

- [API reference — on-ramp](../../reference/api/onramp.md)
