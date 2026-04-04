# Infrastructure — 402md Bridge

## Local Development

- Docker Compose: Temporal + PostgreSQL + Redis
- `.env.example` in each repo listing all required vars

## Deployment

| Repo | Target |
| ---- | ------ |
| `402md-relay` | Any container platform (multi-stage Bun Dockerfile, non-root user) |
| `402md-worker` | Same as relay (container alongside Temporal) |

## Production Hardening

- TLS termination via reverse proxy
- CORS policies (Elysia)
- Helmet-equivalent headers
- mTLS for Temporal ↔ worker

## Monitoring

- OpenTelemetry tracing on all workflows and activities
- Temporal metrics: latency, failure rate, retry count
- Health check endpoint: dependency status (Temporal, PG, Redis)
- Gas budget + balance monitoring per chain
- Circuit breaker auto-pause on anomaly

## Scaling

- Up to ~100K workflows/month on single PG node
- Beyond: PgBouncer, read replicas, or Temporal Cloud

## Performance SLAs

| Endpoint | Target |
| -------- | ------ |
| Discovery | < 100ms p95 (cacheable) |
| REST API | < 200ms p95 |
| Temporal workflow start | < 100ms (async dispatch) |
| Settlement | 5-30s (Solana/Stellar), 15-19 min (EVM), ~seconds (Fast Transfer) |
