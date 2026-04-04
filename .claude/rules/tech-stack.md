# Tech Stack — 402md Facilitator

## Per Repo

| Repo | Runtime | Framework | Key Libraries |
| ---- | ------- | --------- | ------------- |
| `402md-worker` | Node.js (Temporal SDK requires native modules incompatible with Bun) | Temporal SDK | viem, @solana/web3.js, @stellar/stellar-sdk, drizzle-orm, ioredis |
| `402md-relay` | Bun | Elysia.js | @elysiajs/cors, @elysiajs/swagger, @temporalio/client, drizzle-orm, ioredis |

## Infrastructure

- **Database:** PostgreSQL 15+ (Drizzle ORM)
- **Cache:** Redis 7+ (replay protection, cumulative tracking)
- **Orchestration:** Temporal (self-hosted OSS, separate PG schema)
- **Local dev:** Docker Compose (Temporal + PostgreSQL + Redis)

## Language

- **TypeScript:** Strict mode, target ESNext
