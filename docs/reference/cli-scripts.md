# CLI and scripts

Every `bun run` task and shell script in the repo, and what it does.

## Root scripts (Turborepo)

Run from the repo root.

| Command              | Purpose                                                    |
| -------------------- | ---------------------------------------------------------- |
| `bun run build`      | Build every package in dependency order.                   |
| `bun run dev`        | Run every package in watch mode (spawns relay and worker). |
| `bun run test`       | Run the full test suite.                                   |
| `bun run lint`       | ESLint across all packages.                                |
| `bun run format`     | Prettier `--check` across tracked files.                   |
| `bun run format:fix` | Prettier `--write` — fixes style.                          |

## Relay scripts

Run from `packages/relay`.

| Command                     | Purpose                                                                |
| --------------------------- | ---------------------------------------------------------------------- |
| `bun run dev`               | Start the HTTP server with hot reload.                                 |
| `bun run build`             | Bundle for production (`bun build` → `dist/`).                         |
| `bun run test`              | Run the relay test suite.                                              |
| `bun run lint`              | ESLint on `src/`.                                                      |
| `bun run db:generate`       | Generate a new Drizzle migration from schema changes.                  |
| `bun run db:push`           | Push the current schema to the database without migrations (dev only). |
| `bun run db:migrate`        | Apply pending migrations.                                              |
| `bun run db:seed-dashboard` | Seed demo data for the bazaar dashboard.                               |

To run the relay in production without watch, execute the built bundle directly: `bun dist/index.js` after `bun run build`.

## Worker scripts

Run from `packages/worker`.

| Command         | Purpose                                                         |
| --------------- | --------------------------------------------------------------- |
| `bun run dev`   | Start the worker via `tsx watch --env-file=.env src/worker.ts`. |
| `bun run build` | Compile TypeScript with `tsc`.                                  |
| `bun run test`  | Run the worker test suite (uses Temporal's test environment).   |
| `bun run lint`  | ESLint on `src/`.                                               |

To run the worker in production, execute the compiled output directly: `node dist/worker.js` after `bun run build`.

## Shared scripts

Run from `packages/shared`.

| Command         | Purpose                             |
| --------------- | ----------------------------------- |
| `bun run build` | Type-check and compile the library. |
| `bun run test`  | Run adapter tests.                  |

## Demo scripts

### `./scripts/demo.sh`

End-to-end demo orchestrator from the repo root. Starts relay, worker, demo-seller, and demo-agent in order, with sleeps to let each boot, then runs the agent against the seller. Cleans up on exit.

```bash
./scripts/demo.sh
```

Env it honors:

- `RELAY_PORT` (default `3000`)
- `DEMO_SELLER_PORT` (default `4000`)
- `FACILITATOR_URL` (default `http://localhost:3000`)

### demo-seller

```bash
cd packages/demo-seller

FACILITATOR_URL=http://localhost:3000 \
SELLER_WALLET=GSELLER... \
SELLER_NETWORK=stellar:testnet \
DEMO_SELLER_PORT=4000 \
bun run src/index.ts
```

Self-registers with the relay, serves a paywalled `GET /search?q=...`.

### demo-agent

```bash
cd packages/demo-agent

FACILITATOR_URL=http://localhost:3000 \
DEMO_SELLER_URL=http://localhost:4000 \
AGENT_SECRET_KEY=SAGENT... \
bun run src/index.ts
```

Discovers services via `/bazaar`, pays via MPP, prints results.

## Docker

| Command                           | Purpose                                         |
| --------------------------------- | ----------------------------------------------- |
| `docker compose up -d`            | Start PostgreSQL, Redis, Temporal, Temporal UI. |
| `docker compose down`             | Stop services, preserve volumes.                |
| `docker compose down -v`          | Stop services, wipe volumes (fresh state).      |
| `docker compose ps`               | Check service status.                           |
| `docker compose logs -f temporal` | Tail one service's logs.                        |

## Temporal CLI

One-time setup (after `docker compose up`):

```bash
temporal operator namespace create 402md-settlement
temporal operator search-attribute create \
  --name sellerNetwork --type Keyword \
  --name buyerNetwork --type Keyword \
  --name settlementStatus --type Keyword \
  --name protocol --type Keyword
```

Ad-hoc queries:

```bash
temporal workflow list --namespace 402md-settlement \
  --query 'settlementStatus = "failed"'

temporal workflow describe --namespace 402md-settlement \
  --workflow-id <id>
```

See [monitor workflows in Temporal](../how-to/operations/monitor-workflows-in-temporal.md).
