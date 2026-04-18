# Dual protocol: x402 and MPP

The facilitator speaks two HTTP payment protocols: [x402](https://x402.org) from Coinbase and [MPP](https://www.machinepayments.com) from Stripe and Tempo. They solve overlapping problems with different trade-offs; we support both because different buyer populations converge on different protocols.

## TL;DR

| Axis           | x402                                              | MPP                         |
| -------------- | ------------------------------------------------- | --------------------------- |
| Who pays gas   | Facilitator (buyer signs, facilitator broadcasts) | Buyer (broadcasts directly) |
| Cross-chain    | Yes, via CCTP V2                                  | No (push to one chain)      |
| Chains         | EVM, Solana, Stellar                              | Stellar only, today         |
| Seller library | `@x402/express` (Coinbase)                        | `@stellar/mpp` (Stellar)    |
| Flow           | Pull (facilitator ⇒ buyer)                        | Push (buyer ⇒ seller)       |
| Best for       | Any agent, any chain                              | Stellar-native agents       |

## x402 — pull, cross-chain, gas-free for buyer

x402 layers on HTTP 402 Payment Required. A seller's endpoint returns 402 with a list of `accepts` entries: scheme, network, `payTo`, amount. The buyer's client picks one, signs an authorization against their own wallet, and retries with the signature in `X-PAYMENT`.

The seller's middleware (e.g. `@x402/express`) forwards the signed payload to the Facilitator for `POST /verify`. On success, the seller returns the resource. Settlement runs async via `POST /settle`.

**Properties that matter:**

- **Gas-free for the buyer.** The signature is an authorization — the Facilitator broadcasts the actual pull transaction and pays the gas. Cost is folded into the gas allowance.
- **Pull model.** The facilitator pulls USDC from the buyer. No prior relationship, no deposit, no account.
- **Cross-chain.** Any supported chain in, any supported chain out. The buyer doesn't know or care that the seller is on a different chain. This is where CCTP V2 earns its keep.
- **Standard Coinbase middleware.** Sellers do not install a 402md SDK. They use `@x402/express` with a `payTo` pointing to the Facilitator and a `merchantId` in `extra`.

Use x402 whenever you can. It is the primary protocol.

## MPP — push, same-chain, buyer pays gas

MPP's Charge Mode uses HTTP negotiation similarly, but the buyer broadcasts the payment themselves. The seller (or the Facilitator on behalf of the seller) verifies the on-chain transaction matches the challenge.

On Stellar specifically, the `@stellar/mpp` SDK handles the full state machine: issue challenge, sign Soroban SAC transfer on the client, verify on the server. The facilitator's `/merchants/:id/mpp/charge` endpoint is just a hosted `Mppx` server that knows your `merchantId`.

**Properties that matter:**

- **Buyer pays gas.** There is no authorization — the buyer signs and broadcasts. This means no facilitator gas float per chain per buyer.
- **Push model.** The buyer sends the payment directly to the seller's wallet. The facilitator never touches the funds.
- **Stellar only, today.** The protocol is specified for Stellar first. The facilitator's implementation is Stellar-only.
- **No cross-chain.** The payment stays on whatever chain the buyer used. If the seller is elsewhere, MPP doesn't help.

Use MPP when your buyer and seller are both on Stellar and you want to avoid the small gas float on the Facilitator side, or when your buyers prefer to pay their own gas (for regulatory/UX reasons).

## Why not just x402?

MPP adds real value for Stellar-native operations:

- Stellar's operational footprint is small. MPP keeps it small — no facilitator-side broadcast, no attestation, no custody window. Settlement is a single Stellar tx.
- Some buyer populations (Stellar-first agents) already integrate `@stellar/mpp`. They can pay without learning x402.

There is some duplication. A Stellar-to-Stellar payment can go either way:

- x402: buyer signs an authorization, facilitator pulls and transfers. Facilitator pays the one Stellar fee (absorbed into the $0.000006 allowance).
- MPP: buyer broadcasts directly. Buyer pays the one Stellar fee.

The difference is who pays the fee and what gets logged in Temporal. x402 paths always go through a workflow; MPP paths verify on-chain and return — no workflow state.

## Why not just MPP?

MPP is Stellar-shaped today. It does not define cross-chain semantics, and extending it to EVM would duplicate most of what x402 already specifies. Coinbase's x402 has the momentum on EVM; Stripe/Tempo have the momentum on Stellar. We support both and let buyers choose.

## What this means for your integration

- **Accepting both:** wire `@x402/express` for general coverage, and expose `/mpp/config` for Stellar-native agents. Both routes can coexist on the same Express app — they don't conflict.
- **Publishing only x402:** you lose access to Stellar-first agents, but you gain cross-chain. Probably the right default for most sellers.
- **Publishing only MPP:** you lose everyone outside Stellar. Useful if your product is Stellar-native.

See [use MPP on Stellar](../how-to/sellers/use-mpp-on-stellar.md) for the MPP path and [build a paywalled API with x402](../tutorials/02-paywalled-api-with-x402.md) for the x402 path.

## The future

Expect both protocols to converge slowly. When MPP gets EVM semantics and x402 gets a richer dispute model, the choice will be less about chain and more about buyer UX. For now: x402 for breadth, MPP for depth on Stellar.
