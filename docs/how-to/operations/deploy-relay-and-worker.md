# Deploy the relay and worker

You have a local stack working and want to ship it. This guide covers the container-based deployment path.

## Prerequisites

- A container platform (Fly.io, Railway, Render, ECS, GKE, your own Docker host — any works).
- A managed PostgreSQL 15+.
- A managed Redis 7+.
- A Temporal cluster: self-hosted (same Docker image as local) or Temporal Cloud.

## 1. Build images

Each package has its own `Dockerfile`. From the repo root:

```bash
docker build -t 402md-relay:latest -f packages/relay/Dockerfile .
docker build -t 402md-worker:latest -f packages/worker/Dockerfile .
```

Both Dockerfiles use a multi-stage build and run as a non-root user.

## 2. Provision dependencies

| Dependency | Notes                                                                                                                |
| ---------- | -------------------------------------------------------------------------------------------------------------------- |
| PostgreSQL | One database, shared by relay and worker. Temporal can share the same instance but uses a separate schema.           |
| Redis      | 7+ with persistence enabled.                                                                                         |
| Temporal   | Create the `402md-settlement` namespace and search attributes (see [run local stack](./run-local-stack.md), step 2). |

Run the migration once from the relay image:

```bash
docker run --rm \
  -e DATABASE_URL=$DATABASE_URL \
  402md-relay:latest bun run --cwd packages/relay db:migrate
```

## 3. Deploy the relay

The relay is stateless behind any HTTP load balancer. Required env:

```bash
NETWORK_ENV=mainnet
DATABASE_URL=...
REDIS_URL=...
TEMPORAL_ADDRESS=...
TEMPORAL_NAMESPACE=402md-settlement

FACILITATOR_URL=https://api.yourhost.com
FACILITATOR_BASE=0x...
FACILITATOR_STELLAR=G...
FACILITATOR_SOLANA=...
# per-chain RPC URLs, etc.

MPP_SECRET_KEY=<random 32 bytes>
```

**Never set `FACILITATOR_PRIVATE_KEY_*` on the relay.** Only the worker needs signing keys.

Scale horizontally — the relay is stateless. Redis handles replay protection shared across instances.

## 4. Deploy the worker

The worker polls Temporal task queues; it does not accept inbound traffic. Required env: same as relay, **plus**:

```bash
FACILITATOR_PRIVATE_KEY_EVM=0x...
FACILITATOR_PRIVATE_KEY_SOLANA=<base64 keypair>
FACILITATOR_PRIVATE_KEY_STELLAR=S...
```

Read keys from a secret manager — Fly.io secrets, GCP Secret Manager, AWS Secrets Manager, HashiCorp Vault. Never bake them into the image.

Scale horizontally — Temporal's task queue balances across workers automatically. One worker per ~50K workflows/month is a rough starting point.

## 5. Harden

- **TLS termination** at the load balancer. The relay itself does not terminate TLS.
- **CORS:** leave the default permissive policy unless you have a specific origin to restrict to.
- **Security headers:** add a reverse proxy with `Content-Security-Policy`, `Strict-Transport-Security`, `X-Content-Type-Options`.
- **mTLS between worker and Temporal** when using Temporal Cloud or a shared cluster.
- **Rate limits:** the built-in per-IP limits are generous. Put a WAF in front for L7 DDoS protection.

## 6. Observability

Set `OTEL_ENABLED=true` and `OTEL_EXPORTER_OTLP_ENDPOINT=<your collector>` on both relay and worker. Traces include workflow IDs and activity spans.

## 7. Smoke test production

```bash
curl https://api.yourhost.com/health
curl https://api.yourhost.com/supported
```

Register a throwaway seller on testnet and run the demo agent against it (see [run the demo](../contributors/run-the-demo.md)) before you announce the endpoint.

## Rollback

Both services are stateless beyond PostgreSQL. Roll back by deploying the previous image tag. Schema migrations are additive by convention — check that a new migration is compatible with the previous code before rolling forward.

## Next

- [Monitor workflows in Temporal](./monitor-workflows-in-temporal.md)
- [Trigger circuit breakers](./trigger-circuit-breakers.md)
