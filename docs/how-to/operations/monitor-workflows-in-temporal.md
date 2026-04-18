# Monitor workflows in Temporal

You want to answer: is settlement working? Where are payments stuck? What's failing? Temporal's UI and CLI give you everything.

## 1. Open the Temporal UI

Local: [http://localhost:8233](http://localhost:8233). Cloud or self-hosted: your cluster URL. Select the `402md-settlement` namespace.

## 2. Filter with search attributes

The worker writes four custom search attributes on every workflow. Use them to build dashboards or ad-hoc queries.

| Attribute          | Values                                                                         |
| ------------------ | ------------------------------------------------------------------------------ |
| `sellerNetwork`    | CAIP-2, e.g. `stellar:pubnet`                                                  |
| `buyerNetwork`     | CAIP-2, e.g. `eip155:8453`                                                     |
| `settlementStatus` | `pulling`, `burning`, `attesting`, `minting`, `recording`, `settled`, `failed` |
| `protocol`         | `x402`, `mpp`                                                                  |

Example queries (Temporal List Filter syntax):

```
settlementStatus = 'failed' AND StartTime > '2026-04-01T00:00:00Z'
sellerNetwork = 'stellar:pubnet' AND buyerNetwork != 'stellar:pubnet'
settlementStatus = 'attesting' AND StartTime < '2026-04-19T10:00:00Z'
```

The last one finds cross-chain settlements stuck in attestation for over an hour — Circle usually takes ≤ 20 min even for EVM sources.

## 3. Read a single workflow

Click any workflow. You will see:

- **History** — every event: activity scheduled, started, completed, failed with retry.
- **Queries** — run the `status` query at any time to get the current step and tx hashes without waiting for the workflow to end.
- **Input / Result** — the x402 payload and the final ledger entry.

For failed workflows the last event includes the error. Common recoveries:

| Error                                     | Action                                                         |
| ----------------------------------------- | -------------------------------------------------------------- |
| `pullFromBuyer` — EIP-3009 nonce conflict | None — buyer needs to sign a new authorization.                |
| `cctpBurn` — insufficient gas             | Top up the Facilitator's gas wallet on the source chain.       |
| `waitAttestation` — Circle Iris 5xx       | None — activity retries automatically with backoff.            |
| `cctpMint` — revert                       | Usually an RPC issue. Retry the activity manually from the UI. |

## 4. Dead-letter detection

Schedule a job (cron, scheduled lambda, etc.) that queries:

```
settlementStatus = 'failed' AND StartTime > '<5m ago>'
```

Alert if the result is non-empty. That's your "settlement failing right now" signal.

A second, lower-priority alert:

```
settlementStatus IN ('pulling','burning','attesting','minting','recording') AND StartTime < '<30m ago>'
```

"Stuck for longer than expected" — usually caused by an RPC outage or a blocked gas wallet.

## 5. Temporal CLI

For one-off queries without the UI:

```bash
temporal workflow list \
  --namespace 402md-settlement \
  --query 'settlementStatus = "failed"' \
  --limit 20

temporal workflow describe \
  --namespace 402md-settlement \
  --workflow-id <workflow-id>
```

## 6. OpenTelemetry

If you set `OTEL_ENABLED=true`, the worker emits spans per activity tagged with the same attributes. Use your APM (Grafana Tempo, Honeycomb, Datadog) to chart per-route latency or per-chain failure rate.

## Gas wallet and attestation monitoring

The `/health` endpoint does not check gas or Circle Iris reachability. Add:

- A cron that calls `eth_getBalance` (or chain-native equivalent) for each `FACILITATOR_*` address and alerts below threshold.
- A cron that hits `https://iris-api.circle.com/v2/health` (mainnet) or `https://iris-api-sandbox.circle.com/v2/health` (testnet) and alerts on non-200.

## Next

- [Trigger circuit breakers](./trigger-circuit-breakers.md)
- [API reference — settlements](../../reference/api/settlements.md)
