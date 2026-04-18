# Security model

This document describes the threat model and the controls that bound damage when something fails.

## Trust assumptions

- **Circle's CCTP V2 attestation network** is trusted. If it is compromised, counterfeit USDC can be minted — but that is a Circle-level failure, not a facilitator-level one.
- **The buyer's wallet private key** is the buyer's to protect.
- **The seller's wallet private key** is the seller's to protect. The facilitator never possesses it.
- **The facilitator's private keys** are held only by the worker process, never on the relay, never in workflow input, never in logs.
- **PostgreSQL, Redis, and Temporal** are trusted infrastructure. A compromise there is a serious incident but bounded — see below.

## Keys and signatures

The facilitator holds three independent keys:

| Key                               | Controls     | Held by     |
| --------------------------------- | ------------ | ----------- |
| `FACILITATOR_PRIVATE_KEY_EVM`     | 7 EVM chains | Worker only |
| `FACILITATOR_PRIVATE_KEY_SOLANA`  | Solana       | Worker only |
| `FACILITATOR_PRIVATE_KEY_STELLAR` | Stellar      | Worker only |

Private keys are read from the environment at activity-execution time. They never appear in:

- Workflow history (Temporal persists inputs — inputs never contain keys).
- Relay process memory or env.
- Log lines, including stack traces.

Keys should come from a secret manager (Fly/GCP/AWS Secret Manager, Vault) — not from `.env` in production.

**Buyer-side signatures** — EIP-3009 authorizations, Stellar payment signatures, Solana tx signatures — are included in workflow input. They are not sensitive on their own: they are single-use and nonce-bound. An attacker possessing a signature cannot reuse it (Redis replay protection + chain-level nonce).

## What an attacker can do if the facilitator key leaks

Damage is bounded by three things:

1. **Daily volume limit.** The attacker cannot pull or move more than `DAILY_VOLUME_LIMIT` of USDC in a 24-hour window. Default 10,000 USDC (on EVM base-units). Operators set this deliberately low in early access.
2. **Buyer authorizations are still required.** The facilitator key signs the facilitator's own transactions (pulls, burns, mints). It does not, by itself, let the attacker pull from any buyer wallet. To drain a buyer, the attacker needs a valid buyer-signed authorization — which is single-use and bound to a nonce the buyer controls.
3. **Gas float is the only at-risk facilitator balance.** The facilitator holds ETH/SOL/XLM for gas, plus accrued USDC allowances. Nothing else. Seller funds are not held, ever.

If a key compromise is suspected:

- Toggle the pause flag (`redis-cli SET facilitator:pause 1`) immediately.
- Rotate the key on a new wallet, update `FACILITATOR_*` addresses.
- Re-register sellers if their `facilitatorAddresses` need to change.
- Investigate every workflow since the suspected compromise via Temporal's audit log.

## Circuit breakers

Three off-chain controls enforced at `POST /settle`:

- **Per-tx limit (`MAX_TX_AMOUNT`)** — relay rejects single settle amounts over a threshold.
- **Daily volume limit (`DAILY_VOLUME_LIMIT`)** — Redis counter with 24-hour TTL. Shared across relay instances.
- **Global pause (`facilitator:pause` in Redis)** — blocks all settles. Intended for incident response and deploys.

These controls are in the relay layer. They do not need signing keys, and they do not require rebooting the worker to take effect. See [trigger circuit breakers](../how-to/operations/trigger-circuit-breakers.md).

## Replay protection

A payment signature must settle at most once.

- **Redis dedup.** Every successful `/settle` writes the signature hash to Redis with a long TTL. A second `/settle` with the same signature returns `REPLAY_DETECTED` without dispatching a workflow.
- **Chain-level nonce.** EIP-3009 (`nonce` field), Solana (blockhash + signer nonce), Stellar (sequence number + authorization nonce) all prevent on-chain replay at the protocol layer. This is the second line of defense if Redis is wiped.
- **Deterministic workflow IDs.** Temporal rejects workflow starts with an ID that is already running or completed — a third line of defense.

Three layers sound excessive. They are complementary: Redis is fast (first line), the chain is authoritative (last line), and Temporal covers the case where Redis is wiped but PostgreSQL is not.

## Seller registration has no auth

`POST /register` is unauthenticated — anyone can register a wallet. This is intentional: the only consequence of registering is getting a `merchantId` you can use to route payments to your own wallet. An attacker registering a wallet they don't control simply creates a dead `merchantId`.

Rate limit (3/hour per IP) prevents registration floods.

Registering someone else's wallet as yours does not let you steal their payments — `payTo` in the x402 flow is the facilitator's address, not the seller's. Payments to a `merchantId` always settle to the wallet registered with that `merchantId`. The attacker would be paying themselves.

## Per-IP rate limits

Rate limits are per IP, enforced by Redis counters. See [API overview](../reference/api/overview.md#rate-limits). Limits are generous for `/verify` and `/settle` (designed for machine-to-machine traffic) and strict for `/register` (3/hour).

IPs are read from `X-Forwarded-For` if present, else connection IP. Operators behind multi-layer proxies must ensure only the outermost proxy writes `X-Forwarded-For`.

## Transport

- TLS termination at the load balancer. The relay does not terminate TLS.
- mTLS between the worker and Temporal when running across trust boundaries (e.g., Temporal Cloud).
- CORS is open by default on public endpoints so browser-based agents can call `/verify` / `/settle`.

## What is out of scope

- **Audit surface.** Because there are no custom smart contracts, there is no Solidity audit. The trust boundary is USDC (audited by Circle) and CCTP V2 (audited by Circle and upstream).
- **Seller-side security.** We do not protect sellers from losing their own keys. Seller key compromise is a seller problem, not a facilitator problem.
- **Buyer-side phishing.** We do not validate that a buyer's agent is not being tricked into signing bogus authorizations. That is the agent's client software's job.

## Next

- [Architecture overview](./architecture.md)
- [Trigger circuit breakers](../how-to/operations/trigger-circuit-breakers.md)
- [Non-custodial model](./non-custodial-model.md)
