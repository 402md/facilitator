# Fees and gas allowance

**Platform fee is 0%.** The facilitator never takes a cut of the payment. The only deduction is a fixed gas allowance that reimburses the on-chain transactions the facilitator submits on behalf of the buyer and seller.

For runtime quotes, call [`GET /bridge/fees`](./api/settlements.md#get-bridgefees) — that endpoint is authoritative. The table below is the current static schedule and may lag.

## How the allowance is deducted

The buyer signs an authorization for the **gross** amount. The facilitator pulls it, retains the gas allowance in USDC, burns/transfers the net, and the seller receives the net.

```
Buyer pays:      $1.000000 USDC
Gas allowance:  -$0.000500 (fixed per route)
Platform fee:   -$0.000000 (0%)
                  ─────────
Seller receives: $0.999500 USDC
```

In MPP charge mode, the buyer broadcasts the transaction directly and pays the chain's own fee — nothing is deducted on the relay.

## Current schedule

Values are in USDC base units (6 decimals on EVM / Solana, 7 on Stellar) and converted to USDC for readability.

| Route             | Gas allowance | Seller receives on $1.00 |
| ----------------- | ------------- | ------------------------ |
| Base → Stellar    | $0.000500     | $0.999500                |
| Stellar → Base    | $0.000500     | $0.999500                |
| Base → Solana     | $0.000800     | $0.999200                |
| Solana → Base     | $0.001200     | $0.998800                |
| Solana → Stellar  | $0.000800     | $0.999200                |
| Stellar → Solana  | $0.000800     | $0.999200                |
| Base → Base       | $0.000400     | $0.999600                |
| Solana → Solana   | $0.000800     | $0.999200                |
| Stellar → Stellar | $0.000006     | $0.999994                |

Routes not listed inherit the cost of the source chain for same-chain settlement, or are resolved at runtime by `GET /bridge/fees` for cross-chain pairs.

## Why fixed, not estimated

- **No gas oracle.** Oracles add a dependency and a failure mode.
- **Predictable math.** The buyer and seller can compute the net amount locally from the schedule.
- **The facilitator takes the variance.** If actual gas is lower than the allowance, the difference stays in the facilitator wallet. If higher, the facilitator absorbs it. Allowances are chosen to be slightly above median gas so the facilitator is rarely out of pocket at scale.

CCTP itself charges nothing — burn/mint is 1:1 native USDC.

## Platform fee (configurable, currently 0)

The relay reads `PLATFORM_FEE_BPS` (basis points) at startup. Default `0`. Increase only if the 402md business model changes — see [product philosophy](../../CLAUDE.md) for why the default is zero.

When non-zero, the platform fee is computed in base units as `(amount * PLATFORM_FEE_BPS) / 10000` and is deducted **in addition to** the gas allowance.

## Cost comparison with percentage-based rails

`GET /bazaar/cost-comparison?buyerNetwork=…&sellerNetwork=…` returns a three-tier comparison ($100K, $1M, $100M USDC) against a baseline of 1% + $0.10. At high-value tiers the flat allowance is orders of magnitude cheaper.

| Amount       | 402md (Base → Stellar) | 1% + $0.10 baseline | Savings     |
| ------------ | ---------------------- | ------------------- | ----------- |
| $100,000     | $0.000500              | $1,000.10           | ~$1,000     |
| $1,000,000   | $0.000500              | $10,000.10          | ~$10,000    |
| $100,000,000 | $0.000500              | $1,000,000.10       | ~$1,000,000 |

Same allowance for $1 or $100M — ideal for machine-to-machine micropayments and for large B2B settlements alike.

## Next

- [API reference — `GET /bridge/fees`](./api/settlements.md#get-bridgefees) — authoritative quote.
- [Architecture — why non-custodial](../explanation/non-custodial-model.md) — why the facilitator can charge so little.
