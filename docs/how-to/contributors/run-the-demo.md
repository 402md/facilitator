# Run the end-to-end demo

The repo ships with a demo agent and demo seller that exercise the full stack: bazaar discovery, MPP charge mode, and the facilitator's paywall flow. Running the demo is the fastest sanity check that every piece works together.

## The short version

```bash
./scripts/demo.sh
```

That's it. It builds the monorepo, boots the relay, worker, demo seller, and demo agent in order, runs a full discovery + pay cycle, and exits cleanly.

Before the first run, make sure you have:

- Docker Compose running (`docker compose up -d`).
- The Temporal namespace created (see [set up dev environment](./set-up-dev-environment.md), step 2).
- At least the Stellar facilitator env configured — the demo defaults to Stellar testnet.

## What the demo does

### Under the hood — `scripts/demo.sh`

```
1. bun run build
2. Start relay          (PORT=$RELAY_PORT, default 3000)   + sleep 2
3. Start worker                                            + sleep 2
4. Start demo-seller    (DEMO_SELLER_PORT, default 4000)   + sleep 3
5. Run demo-agent       (blocks until done)
6. On exit: kill relay, worker, seller
```

### demo-seller (`packages/demo-seller`)

- Auto-registers with the relay: `POST /register` with `{ wallet: $SELLER_WALLET, network: $SELLER_NETWORK }`.
- Receives a `merchantId`.
- Starts an HTTP server on `$DEMO_SELLER_PORT` with two routes:
  - `GET /` — metadata (name, merchantId, price, facilitator URL).
  - `GET /search?q=...` — paywalled at 1,000,000 stroops (0.001 USDC) via MPP charge mode.

MPP verification is delegated to the facilitator's `/merchants/:id/mpp/charge` endpoint. The seller forwards the challenge/receipt dance to the relay.

### demo-agent (`packages/demo-agent`)

1. `GET /bazaar` on the relay to discover services.
2. For each of 5 queries (`stellar`, `cctp`, `x402`, `mpp`, `facilitator`):
   - Hits the seller's `/search?q=...` with `@stellar/mpp` fetch.
   - Receives 402 + challenge, signs a Soroban SAC transfer with `AGENT_SECRET_KEY`, retries.
   - Prints the search results.
3. Logs a summary: queries completed, agent wallet.

## Environment it needs

From the demo script:

```bash
# Optional — defaults shown
RELAY_PORT=3000
DEMO_SELLER_PORT=4000
FACILITATOR_URL=http://localhost:3000

# Required for the demo-seller and demo-agent
SELLER_WALLET=GSELLER...
SELLER_NETWORK=stellar:testnet
AGENT_SECRET_KEY=SAGENT...
```

Generate `SELLER_WALLET` and `AGENT_SECRET_KEY` as separate Stellar testnet keypairs. Fund both via Friendbot so they hold XLM (for Soroban fees) and — on the agent — testnet USDC (to pay for queries).

The relay and worker pull everything else from `packages/relay/.env` and `packages/worker/.env`.

## Running components individually

Useful when debugging one part of the flow.

### Just the relay + worker

```bash
# terminal 1
cd packages/relay && bun run dev
# terminal 2
cd packages/worker && bun run dev
```

### Seller only

```bash
cd packages/demo-seller
FACILITATOR_URL=http://localhost:3000 \
SELLER_WALLET=GSELLER... \
SELLER_NETWORK=stellar:testnet \
DEMO_SELLER_PORT=4000 \
bun run src/index.ts
```

Curl it:

```bash
curl http://localhost:4000/                # metadata
curl http://localhost:4000/search?q=hello  # 402 + MPP challenge
```

### Agent only

```bash
cd packages/demo-agent
FACILITATOR_URL=http://localhost:3000 \
DEMO_SELLER_URL=http://localhost:4000 \
AGENT_SECRET_KEY=SAGENT... \
bun run src/index.ts
```

## What "success" looks like

End of run:

```
[agent] discovered 1 service(s)
[agent] paid for 5/5 queries
[agent] wallet: GAGENT...
```

Open Temporal UI at [http://localhost:8233](http://localhost:8233) — no workflows should appear for the demo, because MPP charge mode verifies the Stellar SAC transfer inline and does not go through the worker. (If you want workflows to appear, swap the demo to use x402 by giving the seller a paywalled route behind `@x402/express`.)

## Failure modes

- **Demo-seller fails to register** — `FACILITATOR_URL` is wrong, or the relay isn't running. Check `curl $FACILITATOR_URL/health`.
- **Demo-agent sees `discovered 0 services`** — the seller didn't register (see above), or the seller registered on a different network than the agent filtered for (agent doesn't filter today, but will in the future).
- **`@stellar/mpp` signing fails** — `AGENT_SECRET_KEY` is invalid, not funded with XLM for fees, or not funded with testnet USDC.
- **402 loop that never resolves** — `MPP_SECRET_KEY` differs between the seller and the relay's `/mpp/charge`. Both must match.

## Next

- [Set up dev environment](./set-up-dev-environment.md)
- [Use MPP on Stellar](../sellers/use-mpp-on-stellar.md) — the MPP flow the demo exercises.
