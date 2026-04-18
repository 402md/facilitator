# Run the local stack

You want the relay, the worker, and their dependencies running on your machine.

## Prerequisites

- [Bun](https://bun.sh) (latest).
- [Node.js](https://nodejs.org) 20+.
- [Docker](https://www.docker.com) running.
- [Temporal CLI](https://docs.temporal.io/cli).

## 1. Start infrastructure

```bash
docker compose up -d
```

| Service     | Image                          | Host port |
| ----------- | ------------------------------ | --------- |
| PostgreSQL  | `postgres:15`                  | 5432      |
| Redis       | `redis:7`                      | 6379      |
| Temporal    | `temporalio/auto-setup:latest` | 7233      |
| Temporal UI | `temporalio/ui:latest`         | 8233      |

## 2. Create the Temporal namespace (one-time)

```bash
temporal operator namespace create 402md-settlement
```

Register the search attributes workflows use:

```bash
temporal operator search-attribute create \
  --name sellerNetwork --type Keyword \
  --name buyerNetwork --type Keyword \
  --name settlementStatus --type Keyword \
  --name protocol --type Keyword
```

## 3. Install and build

```bash
bun install
bun run build
```

## 4. Configure env files

```bash
cp packages/relay/.env.example packages/relay/.env
cp packages/worker/.env.example packages/worker/.env
```

Both files need the same `FACILITATOR_*` addresses, `DATABASE_URL`, `REDIS_URL`, and `TEMPORAL_*`. The worker additionally needs `FACILITATOR_PRIVATE_KEY_*`. See [environment variables](../../reference/environment-variables.md).

## 5. Migrate the database

```bash
cd packages/relay
bun run db:migrate
cd -
```

## 6. Run the processes

Two separate terminals:

```bash
# Terminal 1
cd packages/relay && bun run dev
```

```bash
# Terminal 2
cd packages/worker && bun run dev
```

Or from the repo root with Turborepo:

```bash
bun run dev
```

## 7. Verify

```bash
curl http://localhost:3000/health
```

All three services should report `"ok"`. If not, check the output of `docker compose ps` and the logs of the failing service.

## Stop everything

```bash
# Ctrl+C the relay and worker, then:
docker compose down
```

Add `-v` to also wipe the database volumes (`docker compose down -v`). Use it when you want a clean slate.

## Next

- [First cross-chain payment tutorial](../../tutorials/01-first-cross-chain-payment.md) — end-to-end with the local stack.
- [Deploy relay and worker](./deploy-relay-and-worker.md) — promote this setup to a server.
