# `merchantId` as a primitive

The single most important design decision in the Facilitator's public API is that sellers have **one identity across all chains**. That identity is `merchantId`.

## What it is

A short opaque string — `hb-a1b2c3` in the documentation examples. It is returned by `POST /register` and it is the primary key of the `sellers` table. It is not secret; it is printed in logs, shown in dashboards, and carried in payment payloads.

## What it solves

A seller naturally has one wallet. Maybe two — one on Stellar for low-fee receiving, one on EVM for treasury — but more commonly, one.

A seller's buyers come from wherever their agents run: Solana, Base, Stellar, and chains the seller has never interacted with. Without a facilitator, the seller's options are:

1. Run wallets on every chain their buyers might use. (Operationally horrible.)
2. Only accept from chains the seller already has. (Loses buyers.)
3. Add bridge logic to their own stack. (Becomes a bridge operator.)

`merchantId` collapses all three. The seller keeps one wallet. Buyers pay on whichever chain they are on, the Facilitator receives on the buyer's chain on the seller's behalf, bridges via CCTP V2, and mints to the seller's one wallet. The seller never sees a chain they don't operate on.

## How it flows through the system

1. Seller calls `POST /register` with a wallet and network. Gets back `merchantId` and `facilitatorAddresses` — one facilitator address per enabled chain.
2. Seller configures `@x402/express` with:
   - `payTo` = the Facilitator's address on each accepted network.
   - `extra.merchantId` = the seller's `merchantId`.
3. Buyer hits the paywalled endpoint. Gets 402 with the accepts list. Picks a chain, signs, retries.
4. Relay's `/verify` and `/settle` read `paymentRequirements.extra.merchantId` to know which seller to route to.
5. Worker looks up the seller's wallet from PostgreSQL using `merchantId`, and directs the cross-chain mint to that wallet.

Without `merchantId` in the `extra` block, the Facilitator has no way to tell whose payment this is — `payTo` is the Facilitator, not the seller. `INVALID_PAYMENT` returns.

## Why not use the wallet address directly?

Three reasons.

**Stability across wallet rotations.** A seller may rotate wallets (compromised key, migrated custody, change of hot wallet). Using the wallet address as identity would require every caller to update their config. `merchantId` can stay stable while the underlying wallet changes — though we have deliberately left the "rotate wallet" endpoint unbuilt (see below).

**Short, portable key.** Wallet addresses on Stellar are 56 characters, on EVM are 42, on Solana are 44. A short opaque ID is friendlier in code, logs, URLs, and error messages. No chain-format awareness needed.

**Chain-agnostic.** The wallet lives on one chain. The identity does not. An EVM seller today might accept payments from Solana tomorrow — `merchantId` is the thing that makes "which seller" independent of "which chain".

## Why we haven't built "rotate wallet"

Two reasons, one product, one technical.

Product: sellers register for seconds. If the seller wants a new wallet, register again — they get a new `merchantId` and a fresh ledger. The simplicity of append-only matches how sellers actually behave.

Technical: settlements in flight reference the old wallet. Rotating it mid-flight means either (a) failing the in-flight settlement, (b) settling to the old wallet and expecting the seller to move it, or (c) retroactively redirecting the mint. None of these are better than registering again.

## Why `merchantId` is not an API key

`merchantId` does not authenticate anything. It identifies the seller. Anyone who knows your `merchantId` and the relay URL can construct payments that settle to your wallet — which is fine, because those payments benefit you.

The attack shape "someone swaps my `merchantId` for theirs in my config" is a supply-chain attack on the seller's own deployment, not a protocol-level issue. Standard supply-chain hygiene applies: keep your config in your repo, keep your repo under access control.

## Why the naming

The term comes from classic payment processing — a merchant ID is how Stripe / Braintree / traditional processors identify the business receiving funds. We kept the analogy to match the mental model x402 and MPP come from.

"Seller" is the word we use for the role. `merchantId` is the id. Both terms show up in the code; we could have unified but the split is clearer — sellers are the business actors, merchant IDs are the database rows.

## One more thing: it's the bazaar key too

The bazaar (`/discovery/resources`, `/bazaar/*`) indexes sellers by `merchantId`. Analytics, leaderboards, cost comparisons — all keyed on `merchantId`. This is why registering is the gate to being discovered: no register, no `merchantId`, no bazaar entry.

## Next

- [API reference — sellers](../reference/api/sellers.md) — the `merchantId` in every endpoint.
- [Architecture overview](./architecture.md) — where the seller table fits.
