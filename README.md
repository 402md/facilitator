# 402md Facilitator

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![x402](https://img.shields.io/badge/x402-v2-green)](https://x402.org)
[![MPP](https://img.shields.io/badge/MPP-compatible-orange)](https://www.machinepayments.com/)
[![CCTP V2](https://img.shields.io/badge/Circle_CCTP-V2-00D4AA)](https://www.circle.com/cross-chain-transfer-protocol)
[![EVM](https://img.shields.io/badge/EVM-7_chains-3245FF)](https://ethereum.org)
[![Solana](https://img.shields.io/badge/Solana-mainnet-9945FF)](https://solana.com)
[![Stellar](https://img.shields.io/badge/Stellar-Soroban-blueviolet)](https://stellar.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6)](https://www.typescriptlang.org)

**Cross-chain USDC settlement for agentic payments.** Buyer pays on any supported chain, seller receives on theirs — one wallet, one HTTP request, zero bridging logic.

**[402md](https://402.md)** is a company building payment infrastructure. The Facilitator is its open-source rail for the [x402](https://x402.org) and [MPP](https://www.machinepayments.com) ecosystems.

## Why

Without 402md, a seller only receives payments from buyers on chains they explicitly support. A seller on Stellar misses every buyer on Base or Solana. Adding chains means managing multiple wallets and multiple SDKs.

402md collapses that. The seller registers once — **one wallet, one chain** — and gets a `merchantId` plus the facilitator's addresses on every supported chain. Buyers pay on whatever chain they're on using the standard `@x402/client`. The facilitator verifies, bridges via [Circle CCTP V2](https://www.circle.com/cross-chain-transfer-protocol) (native USDC, no wrapped tokens, no slippage), and delivers USDC to the seller's wallet.

```mermaid
flowchart LR
    Buyer["Buyer\n(Solana)"]
    Facilitator["402md\nFacilitator"]
    CCTP["Circle\nCCTP V2"]
    Seller["Seller\n(Stellar)"]

    Buyer -- "pays USDC\non Solana" --> Facilitator
    Facilitator -- "burns USDC\non Solana" --> CCTP
    CCTP -- "mints USDC\non Stellar" --> Seller

    style Buyer fill:#1a1a2e,stroke:#9945FF,color:#fff
    style Facilitator fill:#1a1a2e,stroke:#00D4AA,color:#fff
    style CCTP fill:#1a1a2e,stroke:#00D4AA,color:#fff
    style Seller fill:#1a1a2e,stroke:#7B68EE,color:#fff
```

Dual-protocol: x402 (Coinbase) for cross-chain pull payments, and [MPP](https://www.machinepayments.com) (Stripe + Tempo) via the [`@stellar/mpp`](https://github.com/stellar/stellar-mpp-sdk) SDK for Stellar-native push payments.

## Seller quick start

**1. Register (one curl, no auth, no dashboard):**

```bash
curl -X POST https://api.402md.com/register \
  -H "Content-Type: application/json" \
  -d '{ "wallet": "GSELLER...", "network": "stellar:pubnet" }'
```

You get a `merchantId` and a map of facilitator addresses per enabled chain.

**2. Use standard `@x402/express` from Coinbase — no 402md SDK:**

```typescript
import { paymentMiddleware } from '@x402/express'

app.use(
  paymentMiddleware({
    'GET /search': {
      accepts: [
        {
          scheme: 'exact',
          network: 'eip155:8453',
          payTo: '0xFacilitatorBase',
          price: '$0.001',
          extra: { merchantId: 'hb-a1b2c3' },
        },
        {
          scheme: 'exact',
          network: 'stellar:pubnet',
          payTo: 'GFacilitatorStellarAddr',
          price: '$0.001',
          extra: { merchantId: 'hb-a1b2c3' },
        },
      ],
    },
  }),
)
```

That's it. Buyers on Base pay on Base, the seller receives on Stellar.

Full walkthrough → [**tutorial: first cross-chain payment**](./docs/tutorials/01-first-cross-chain-payment.md).

## Documentation

Organized under the [Diátaxis](https://diataxis.fr) framework.

|                                           | Description                                                               | Start here                                                                         |
| ----------------------------------------- | ------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| 📚 **[Tutorials](./docs/tutorials/)**     | Learn by following end-to-end examples                                    | [Your first cross-chain payment](./docs/tutorials/01-first-cross-chain-payment.md) |
| 🛠️ **[How-to guides](./docs/how-to/)**    | Solve a specific task — register, accept multiple chains, deploy, monitor | [Register and get addresses](./docs/how-to/sellers/register-and-get-addresses.md)  |
| 📖 **[Reference](./docs/reference/)**     | Full API, supported chains, env vars, fees, error codes                   | [API overview](./docs/reference/api/overview.md)                                   |
| 💡 **[Explanation](./docs/explanation/)** | Why the system is designed this way                                       | [Architecture overview](./docs/explanation/architecture.md)                        |

Start at **[`docs/index.md`](./docs/index.md)** for the full map.

## What makes it different

- **0% platform fee.** Only a fixed USDC gas allowance per route (e.g. $0.0005 on Base ↔ Stellar). No spread, no percentage cut. [See the schedule](./docs/reference/fees.md).
- **Native USDC, no wrapped tokens.** CCTP V2 burns on source, mints on destination. 1:1, no slippage.
- **Non-custodial.** CCTP mints directly to the seller's wallet via `CctpForwarder`. The facilitator never custodies seller funds. [Details](./docs/explanation/non-custodial-model.md).
- **No custom smart contracts.** Calls standard USDC (EIP-3009) + CCTP TokenMessenger directly. Zero audit surface, zero per-chain deploys.
- **Durable settlement via Temporal.** Every x402 payment is a workflow with retries, compensation, and observability. [Why](./docs/explanation/temporal-workflows.md).
- **Opt-in chains.** Set `FACILITATOR_<CHAIN>` + RPC URL and the chain is registered at boot. Adding a new CCTP V2 chain is a config change.

## Supported chains

Base, Ethereum, Optimism, Arbitrum, Linea, Unichain, World Chain (EVM — single key for all 7), Solana, Stellar. Mainnet and testnet.

Full table with CAIP-2 IDs, CCTP domains, and per-family pull mechanisms → [**reference: chains**](./docs/reference/chains.md).

## Settlement times

| Source → Destination | Time                                              |
| -------------------- | ------------------------------------------------- |
| Same-chain           | < 5 s                                             |
| Stellar → anything   | ~5–10 s                                           |
| Solana → anything    | ~25–30 s                                          |
| EVM → anything       | ~15–19 min (source finality + Circle attestation) |

## Running locally

```bash
docker compose up -d                    # PostgreSQL + Redis + Temporal
temporal operator namespace create 402md-settlement

bun install
bun run build

cd packages/relay && bun run db:migrate && bun run dev    # terminal 1
cd packages/worker && bun run dev                         # terminal 2
```

Full setup, including wallet funding and one-time USDC approvals, in [**how-to: set up dev environment**](./docs/how-to/contributors/set-up-dev-environment.md).

End-to-end demo:

```bash
./scripts/demo.sh
```

[How the demo works](./docs/how-to/contributors/run-the-demo.md).

## Monorepo

```
packages/
├── relay/         — HTTP API (Elysia/Bun)
├── worker/        — Settlement workflows (Temporal/Node.js)
├── shared/        — Network adapters, DB schema, cache, tracing
├── demo-seller/   — Example paywalled API on Stellar
└── demo-agent/    — Example agent that discovers + pays
```

Architecture deep-dive → [**explanation: architecture**](./docs/explanation/architecture.md).

## Contributing

Contributions welcome. Fork, branch, PR.

- [Set up a dev environment](./docs/how-to/contributors/set-up-dev-environment.md)
- [Add a new EVM chain](./docs/how-to/contributors/add-a-new-evm-chain.md)
- [Write a network adapter](./docs/how-to/contributors/write-a-new-network-adapter.md)

Follow the rules in [`.claude/rules/`](./.claude/rules/) — code standards, commit format, testing, security.

## License

MIT. See [`LICENSE`](LICENSE).
