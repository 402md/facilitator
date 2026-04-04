# Architecture Decisions — 402md Facilitator

## Repos (3 separate, not monorepo)

- `402md-worker` — Temporal workflows (Node.js/TypeScript — Temporal SDK requires native modules incompatible with Bun)
- `402md-relay` — HTTP relay API (Elysia/Bun)

No custom smart contracts. Worker calls USDC (EIP-3009) + CCTP TokenMessenger directly via chain SDKs. Adding a new EVM chain = new RPC config, zero deploys.

No dashboard. Seller onboards via `POST /register`, gets facilitator addresses, done. Pure API DX.

Independent CI/CD, deploy, versioning. Shared types via copy-paste (formalize later if drift hurts).

## Database

- Same PostgreSQL instance, same schema for relay + worker
- **Relay owns all DB migrations** — single Drizzle schema source of truth. Worker imports schema types from relay via npm
- Relay owns: sellers, auth tables
- Worker owns: transactions, settlements
- Both read as needed
- Temporal uses separate schema in same PG instance

## Settlement Model

- **Model A first** (non-custodial): facilitator receives on source chain → retains gas allowance in USDC → CCTP burns net amount → mints directly to seller on destination chain. Gas allowance from fixed schedule per chain pair
- **Model B later** (filler): pre-fund + batch settle when volume justifies

## Chains

- Base (EVM), Solana, Stellar — all via Circle CCTP V2
- CCTP V2 = burn/mint native USDC, zero slippage
- Gas-free for the buyer on all chains

## Fee Model

- **Free at launch** — platform fee 0%, only gas allowance deducted from cross-chain payments (fixed schedule per chain pair)
- Same-chain: gas absorbed by facilitator (standard x402 model)
- Configurable platform fee (default 0%) — activate when volume justifies

## Protocols

- **x402**: Coinbase's HTTP 402 protocol — seller uses standard `@x402/express` SDK, zero 402md dependencies
- **MPP**: Stripe + Tempo's Machine Payments Protocol — 402md publishes its own payment method spec
