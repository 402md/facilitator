# 402md Facilitator — Activity dashboard

A read-only view of live facilitator activity: supported chains, cross-chain routes, top resources and sellers, recent transactions, and cost comparisons.

Canonical URL: https://facilitator.402.md/dashboard

> **If you are an agent, do not scrape this page.** Every number on the dashboard comes from a structured JSON endpoint. Use those directly.

## Structured endpoints (preferred)

| Endpoint                         | Purpose                                                                 |
| -------------------------------- | ----------------------------------------------------------------------- |
| `GET /discovery/resources`       | Active x402 resources. Filter by `network`, sort by `uses` or `volume`. |
| `GET /discovery/stats`           | Aggregate facilitator stats over a time window.                         |
| `GET /discovery/routes`          | Cross-chain route activity and status matrix.                           |
| `GET /discovery/sellers`         | Top sellers by volume or transaction count.                             |
| `GET /discovery/transactions`    | Recent transactions with chain, route, and status.                      |
| `GET /discovery/cost-comparison` | Per-route gas cost comparison.                                          |
| `GET /health`                    | Dependency health (DB, Redis, Temporal).                                |
| `GET /swagger/json`              | Full OpenAPI spec.                                                      |

Every `discovery/*` endpoint accepts a `window` query parameter (`1h`, `24h`, `7d`, `30d`, `all`) and standard `limit`/`offset` pagination.

## What's on the dashboard

- **Architecture snapshot** — chains supported, active routes, protocols.
- **Per-chain breakdown** — transactions, volume, and health per chain.
- **Route matrix** — every source → destination pair, with volume and latency.
- **Top resources** — most-used x402 resources, rankable by uses or volume.
- **Top sellers** — ranked by USDC received.
- **Recent transactions** — latest settlements across all chains.
- **Cost comparison** — gas allowance per route vs. competing rails.
