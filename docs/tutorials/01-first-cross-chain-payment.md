# Your first cross-chain payment

This tutorial walks you through the full settlement path: an AI agent on one chain pays a seller on another chain, and USDC lands on the seller's wallet. By the end, you will have registered as a seller, received a payment from the demo agent, and watched the Temporal workflow settle.

You do not need to write any code. You do not need mainnet funds. Everything runs on testnets with local infrastructure.

> **Prefer learning by reading?** This tutorial ends with a pointer to the [architecture explanation](../explanation/architecture.md) and the [API reference](../reference/api/overview.md).

## What you will build

```
AI Agent (Stellar testnet) ──► Facilitator Relay ──► Worker ──► CCTP V2 ──► Seller wallet
```

- A relay (HTTP API) and a worker (Temporal workflows) running locally.
- A registered seller wallet on Stellar testnet.
- A demo agent that pays for search queries via MPP.
- Settled transactions visible in the Temporal UI.

## Before you start

You need:

- [Bun](https://bun.sh) (latest) and [Node.js](https://nodejs.org) 20+.
- [Docker](https://www.docker.com) running.
- [Temporal CLI](https://docs.temporal.io/cli) installed.
- A Stellar testnet keypair for the seller wallet and another for the agent. Generate both with the [Stellar Lab](https://laboratory.stellar.org/#account-creator?network=test).
- A Base Sepolia EVM wallet funded with test ETH (for the Facilitator's EVM key).

This tutorial uses testnets only — no real money moves.

## 1. Start the local infrastructure

From the repo root:

```bash
docker compose up -d
```

This starts:

| Service       | Port | Purpose                                |
| ------------- | ---- | -------------------------------------- |
| PostgreSQL 15 | 5432 | Application database                   |
| Redis 7       | 6379 | Replay protection and circuit breakers |
| Temporal      | 7233 | Workflow orchestration                 |
| Temporal UI   | 8233 | Watch workflows run                    |

Wait ~10 seconds for Temporal to finish its auto-setup, then create the settlement namespace (one-time):

```bash
temporal operator namespace create 402md-settlement
```

## 2. Configure the Facilitator

Copy the example env files:

```bash
cp packages/relay/.env.example packages/relay/.env
cp packages/worker/.env.example packages/worker/.env
```

Open both files and fill in at least these variables for Stellar testnet operation:

```bash
NETWORK_ENV=testnet

# Stellar — the Facilitator's Stellar wallet
FACILITATOR_STELLAR=GFACILITATOR...            # your Stellar public key
FACILITATOR_PRIVATE_KEY_STELLAR=SFACILITATOR... # worker only

# Base Sepolia — so buyers on Base can pay too
FACILITATOR_BASE=0xFacilitator...
FACILITATOR_PRIVATE_KEY_EVM=0x...               # worker only

DATABASE_URL=postgresql://postgres:postgres@localhost:5432/fourzerotwomd
REDIS_URL=redis://localhost:6379
TEMPORAL_ADDRESS=localhost:7233
TEMPORAL_NAMESPACE=402md-settlement
```

Fund both facilitator wallets on testnet:

- Stellar: use the [Friendbot](https://laboratory.stellar.org/#account-creator?network=test).
- Base Sepolia: use a public [Base Sepolia faucet](https://www.alchemy.com/faucets/base-sepolia) for ETH and any USDC faucet for Circle's testnet USDC.

For a full wallet setup (including the one-time USDC approval for the CCTP `TokenMessengerV2` contract on each EVM chain), see [set up dev environment](../how-to/contributors/set-up-dev-environment.md).

## 3. Install and migrate

```bash
bun install
bun run build

cd packages/relay
bun run db:migrate
cd -
```

## 4. Start the relay and worker

In one terminal:

```bash
cd packages/relay
bun run dev
```

You should see `relay listening on http://localhost:3000`.

In a second terminal:

```bash
cd packages/worker
bun run dev
```

You should see `worker started, polling fast-settlement and cross-settlement task queues`.

## 5. Register your seller wallet

You are now the "seller". Pick the Stellar testnet keypair you generated as your seller wallet.

```bash
curl -X POST http://localhost:3000/register \
  -H "Content-Type: application/json" \
  -d '{
    "wallet": "GSELLER...",
    "network": "stellar:testnet"
  }'
```

You will get back a `merchantId` and a map of facilitator addresses per enabled chain:

```json
{
  "merchantId": "hb-a1b2c3",
  "wallet": "GSELLER...",
  "network": "stellar:testnet",
  "facilitatorAddresses": {
    "eip155:84532": "0xFacilitator...",
    "stellar:testnet": "GFACILITATOR..."
  }
}
```

Copy the `merchantId` — you will need it. This is the primitive that lets a buyer on any chain route a payment to your single wallet. See [`merchantId` as a primitive](../explanation/merchant-id-as-primitive.md) for the rationale.

## 6. Run the demo agent

The repo ships with a demo agent that discovers services via the bazaar and pays for them using MPP. Before running it, you also need the demo seller running so there's something to discover.

In a third terminal, start the demo seller:

```bash
cd packages/demo-seller

FACILITATOR_URL=http://localhost:3000 \
SELLER_WALLET=GSELLER... \
SELLER_NETWORK=stellar:testnet \
DEMO_SELLER_PORT=4000 \
bun run src/index.ts
```

The demo seller auto-registers with the relay, spins up a paywalled `GET /search?q=...` endpoint priced at `0.001` USDC, and prints its `merchantId`.

In a fourth terminal, run the agent:

```bash
cd packages/demo-agent

FACILITATOR_URL=http://localhost:3000 \
DEMO_SELLER_URL=http://localhost:4000 \
AGENT_SECRET_KEY=SAGENT... \
bun run src/index.ts
```

The agent will:

1. `GET /bazaar` on the relay to discover services.
2. Issue 5 paid search queries to the demo seller.
3. Sign each MPP challenge with its Stellar keypair.
4. Print the search results it got back.

## 7. Watch the settlement

Open the Temporal UI at [http://localhost:8233](http://localhost:8233) and select the `402md-settlement` namespace. You will see one workflow per paid query, most `sameChainSettle` (both parties on Stellar).

For each workflow you can click through:

1. **pulling** — facilitator pulls USDC from the buyer.
2. **transferring** (same-chain) or **burning → attesting → minting** (cross-chain).
3. **recording** — writes the ledger entry.
4. **settled** — final state.

## 8. Shortcut: one-command demo

Instead of running steps 5–6 by hand, `scripts/demo.sh` orchestrates everything:

```bash
./scripts/demo.sh
```

It builds, starts relay + worker + demo-seller + demo-agent in sequence, runs the agent, and cleans up on exit.

## What you just learned

- How to stand up the full stack locally.
- How a seller registers with one `POST /register`.
- How `merchantId` routes cross-chain payments to a single wallet.
- How Temporal workflows make settlement durable and observable.

## Next steps

- [Build a paywalled API with x402](./02-paywalled-api-with-x402.md) — turn one of your own endpoints into a paywalled resource.
- [Architecture overview](../explanation/architecture.md) — understand why the relay + worker split and where Temporal fits.
- [API reference](../reference/api/overview.md) — full details on every endpoint.
