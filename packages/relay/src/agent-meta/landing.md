# 402md Facilitator

**Cross-chain USDC settlement for x402 and MPP.** Buyer pays on any supported chain, seller receives native USDC on their chain. One HTTP request to onboard. No SDK, no dashboard, no custom code.

Canonical URL: https://facilitator.402.md/

## Supported chains

All via Circle CCTP V2 with native USDC (no wrapped tokens, no slippage).

- **EVM**: Base, Ethereum, Optimism, Arbitrum, Linea, Unichain, World Chain
- **Solana**: mainnet
- **Stellar**: pubnet

## Getting started (seller)

```http
POST https://facilitator.402.md/register
Content-Type: application/json

{ "wallet": "GSELLER...", "network": "stellar:pubnet" }
```

The response returns your `merchantId` and facilitator pay-to addresses on every supported chain. Drop them into standard `@x402/express` and you are done.

## How it works

1. Seller registers their wallet once. No login, no dashboard.
2. Seller uses standard `@x402/express` middleware. Facilitator address as `payTo`, `merchantId` in `extra`. Zero 402md dependencies.
3. Buyer pays in USDC on any supported chain. Same-chain = direct transfer. Cross-chain = Circle CCTP V2 burns on source, mints native USDC on seller's chain.

Settlement latency:

- Same-chain: under 5 seconds
- Solana/Stellar cross-chain: 5-30 seconds
- EVM cross-chain: 15-19 minutes (block finality)

Buyer always gets the resource instantly — settlement runs in the background.

## Design choices

- **Non-custodial.** CCTP V2 mints directly to the seller's wallet. 402md never holds funds beyond the gas allowance needed to execute settlement.
- **Free.** 0% platform fee at launch. Only a fixed gas allowance is deducted per route.
- **Zero dependencies.** Sellers use the standard `@x402/express` SDK from Coinbase. The only 402md-specific step is `POST /register`.
- **Dual protocol.** Same facilitator serves x402 and MPP. Two ecosystems, one registration.
- **Native USDC only.** Circle CCTP V2 burns and mints real USDC. No DEX, no bridge tokens.

## Pricing

Zero platform fee. Only fixed gas allowance per route. On a $1.00 payment:

| Route             | Seller receives | Gas allowance     |
| ----------------- | --------------- | ----------------- |
| Stellar → Stellar | $0.99999        | $0.00001 (0.001%) |
| Solana → Solana   | $0.9990         | $0.0010 (0.10%)   |
| Base → Base       | $0.9980         | $0.0020 (0.20%)   |
| Stellar → Solana  | $0.9985         | $0.0015 (0.15%)   |
| Solana → Stellar  | $0.9975         | $0.0025 (0.25%)   |
| Stellar → Base    | $0.9975         | $0.0025 (0.25%)   |
| Base → Stellar    | $0.9968         | $0.0032 (0.32%)   |
| Base → Solana     | $0.9965         | $0.0035 (0.35%)   |
| Solana → Base     | $0.9965         | $0.0035 (0.35%)   |

## Discovery for agents

- `GET /health` — dependency health
- `GET /swagger` — OpenAPI docs (HTML)
- `GET /swagger/json` — OpenAPI spec (JSON)
- `GET /discovery/resources` — public registry of x402 resources
- `GET /discovery/routes` — cross-chain route and cost matrix
- `GET /.well-known/api-catalog` — RFC 9727 link set
- `GET /.well-known/agent-skills/index.json` — skills index for agent onboarding

## Ecosystem

- [x402 spec](https://www.x402.org/) — Coinbase's HTTP 402 protocol
- [MPP spec](https://github.com/AgoraPay-Stellar/mpp-specification) — Machine Payments Protocol
- [Circle CCTP V2](https://www.circle.com/cctp) — native USDC cross-chain
- [Source code](https://github.com/402md)
