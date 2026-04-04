# Security — 402md Bridge

## Seller Registration

- Single `POST /register` — no auth, no login, no dashboard
- Seller gets facilitator addresses back and starts receiving
- Rate limits: register 3/1hr

## No Custom Smart Contracts

No Solidity contracts deployed. Worker calls standard USDC (EIP-3009) + CCTP TokenMessenger directly via chain SDKs. This eliminates smart contract audit surface and per-chain deployment overhead.

## Circuit Breakers (Off-Chain)

- Per-tx limit (`maxTxAmount`) — relay rejects above limit
- Daily volume limit (`dailyVolumeLimit`, Redis counter with daily TTL)
- Pause flag (Redis, toggleable via admin endpoint)
- If facilitator key compromised: attacker limited to `dailyVolumeLimit`. Can only pull USDC with valid buyer authorizations (single-use, nonce-bound via EIP-3009)

## Sensitive Data

- Private keys and facilitator signing keys **never stored in workflow input**
- Buyer authorization signatures (single-use, nonce-bound) ARE included in workflow params — they are not sensitive
- Worker reads private keys from environment/vault at activity execution time
- Production: mTLS between Temporal server ↔ worker

## Replay Protection

- Redis-based tx hash deduplication
- EIP-3009 nonce (EVM) / authorization nonce (Solana/Stellar) prevents double-pull

## Non-Custodial (Model A)

- No custom contracts — worker calls USDC + CCTP directly
- Same-chain: buyer → seller directly (1 tx, standard x402, gas absorbed)
- Cross-chain: facilitator retains gas allowance in USDC on source chain, CCTP mints net amount directly to seller
- Gas allowance from fixed schedule per chain pair — no oracle, no estimates
