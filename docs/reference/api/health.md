# API reference — health

## `GET /health`

System health check. Returns the status of each backing service so operators and load balancers can decide whether the relay is ready to serve traffic.

**No rate limit.** **No authentication.**

### Response `200 OK`

```json
{
  "status": "ok",
  "services": {
    "db": "ok",
    "redis": "ok",
    "temporal": "ok"
  },
  "timestamp": "2026-04-19T12:34:56.789Z"
}
```

| Field               | Type   | Description                                                       |
| ------------------- | ------ | ----------------------------------------------------------------- |
| `status`            | string | `"ok"` if all dependencies reachable, `"degraded"` if any is not. |
| `services.db`       | string | `"ok"`, `"error"`, or `"unknown"`.                                |
| `services.redis`    | string | Same.                                                             |
| `services.temporal` | string | Same.                                                             |
| `timestamp`         | string | ISO-8601 server time.                                             |

The endpoint always returns HTTP `200` — readers inspect the `status` field. This is intentional so that a single failing dependency does not flap the load balancer; consumers who need stricter semantics should map `status: "degraded"` to their own alerting.

### Use cases

- **Kubernetes / Docker healthchecks:** hit `/health` and require `status === "ok"` for `readiness`; accept `"degraded"` for `liveness`.
- **Status pages:** poll `/health` and surface per-service status from `services`.
- **Local dev troubleshooting:** if any service is `"error"`, check your `docker compose` stack.

### What is not checked

- Chain RPC reachability — tested only lazily, at the moment a workflow activity needs it.
- The CCTP attestation endpoint (Circle Iris).
- Wallet balances and gas budgets.

For those, see the [monitoring guide](../../how-to/operations/monitor-workflows-in-temporal.md).
