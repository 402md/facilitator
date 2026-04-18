# Why CCTP V2

CCTP V2 is Circle's second-generation Cross-Chain Transfer Protocol. It is the only protocol the Facilitator uses to move USDC across chains. This document explains that choice and what you inherit from it.

## What CCTP V2 does

CCTP V2 burns native USDC on a source chain and mints the same amount of native USDC on a destination chain. There is no wrapped token, no liquidity pool, and no market maker. Circle attests the burn via an off-chain signer network; the destination mint verifies the attestation and issues the USDC.

The protocol supports 10+ chains: Ethereum, Base, Optimism, Arbitrum, Linea, Unichain, World Chain, Solana, Stellar, and more being added.

## Why we picked it

### 1:1, no slippage

CCTP moves exactly `N` USDC from `A` to `B`. No fee, no spread, no variable cost. Compare this to any DEX-based bridge where `N` in at one end is `N × (1 − spread − slippage − LP fee)` at the other end.

This is the single most important property for a cross-chain payment rail. Micropayments ($0.001) cannot tolerate a percentage-based bridging cost.

### Native USDC everywhere

The output is the canonical USDC issued by Circle on the destination chain — not `USDC.e`, not a wrapped variant. A seller receiving `100 USDC` via 402md holds exactly the same asset they would hold if they had been paid on that chain directly.

### No liquidity provisioning

Pool-based bridges require capital upfront to serve withdrawals. The facilitator has no pool. Every settlement burns and mints the payment itself — capital efficiency is 100%.

### Attestation, not relayer trust

Circle's attestation is a signed message anyone can verify. The worker is a relayer in the operational sense (it submits the destination-chain tx), but it does not hold trust: if our worker disappears, any party can fetch the attestation from Circle and submit the mint themselves. No funds can be locked by a facilitator outage.

### V2 specifically

- **`depositForBurnWithHook`** lets the source chain encode data consumed atomically at mint time. We use this with the `CctpForwarder` contract to ship EVM burns straight to Stellar addresses without an intermediate EVM-side hop.
- **Fast Transfer** on V2 reduces attestation latency on supported routes from ~15 min to ~seconds. The facilitator picks this path automatically on chains that support it.
- **Consistent `depositForBurn` signature** across all V2 chains. Adding a new V2 chain is a config entry, not an adapter rewrite.

## What you inherit

### Settlement time = source chain finality + attestation

Not facilitator latency. Not a bridge's own delay. The floor is set by the source chain:

| Source chain   | Circle attestation time                   | Typical settlement |
| -------------- | ----------------------------------------- | ------------------ |
| Stellar        | seconds (hard finality is seconds)        | ~5–10 s            |
| Solana         | ~25 s (hard finality)                     | ~25–30 s           |
| Base, Optimism | ~12–19 min (Ethereum L1 finality for L2s) | ~15–19 min         |
| Ethereum       | ~13 min (finality)                        | ~15 min            |

Speeding this up further is not possible without changing the attestation model — which would change the trust model.

### We cannot do Polygon or Avalanche

They are on CCTP V1. The `depositForBurn` signature differs, settlement is ~13 min even on fast chains, and there is no `depositForBurnWithHook`. Supporting them means a second adapter, a second test matrix, and a second codepath for the Stellar destination. We chose to wait for V2 deployments instead.

### We depend on Circle's Iris API

Activity `waitAttestation` polls `https://iris-api.circle.com/v2/messages/...` every 5 s with a 30-minute timeout. If Circle's API is down, attestation stalls — but the burn is on-chain and final. Recovery is automatic as soon as the API recovers; no funds are at risk.

### Reusable attestations

Once Circle issues an attestation, it is valid indefinitely. If our mint transaction fails, we retry with the same attestation. This is why "burn succeeded, mint failed" is not a fund-loss scenario — see [error handling](../how-to/sellers/check-settlement-status.md#when-settlement-fails).

## What we would rebuild if CCTP disappeared

In order of how much the design depends on it:

1. **Native-USDC invariant.** We would have to pick between (a) wrapped tokens, accepting the lower UX bar, or (b) a liquidity-pool bridge, accepting variable cost. Both are worse.
2. **Cross-chain coverage.** Ethereum ↔ Solana ↔ Stellar via a single protocol is rare. Most rails specialize in one family.
3. **Zero-capital operation.** No pool, no reserve. Losing this means the Facilitator would need to fund every route in advance.

CCTP V2 is load-bearing. The [architecture](./architecture.md) is shaped around its primitives, not just its endpoints.

## Next

- [Non-custodial model](./non-custodial-model.md) — how `CctpForwarder` makes mint-to-seller atomic.
- [Supported chains](../reference/chains.md) — the current deployment matrix.
