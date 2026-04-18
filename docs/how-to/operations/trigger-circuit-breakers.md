# Trigger circuit breakers

The relay has three off-chain circuit breakers. Use them to limit damage if a key is compromised, a buggy seller is draining gas, or you need a maintenance window.

All three are enforced at `POST /settle`. When any triggers, the relay responds `503 Service Unavailable` with `error: "CIRCUIT_BREAKER"`.

## Per-transaction limit (`MAX_TX_AMOUNT`)

The relay rejects any settle request whose `amount` exceeds this threshold.

- Env var: `MAX_TX_AMOUNT` (base units).
- Default: `1000000000` — i.e. 1000 USDC on EVM.
- Set lower while you are in early access, higher as volume grows.

Change it by updating the env on the relay and restarting. No database involved.

## Daily volume limit (`DAILY_VOLUME_LIMIT`)

Cumulative daily settle volume across all sellers. Enforced by a Redis counter with a 24h TTL.

- Env var: `DAILY_VOLUME_LIMIT` (base units).
- Default: `10000000000` — i.e. 10000 USDC/day on EVM.
- Scope: global (one counter for the whole relay fleet — uses Redis, so multiple relay instances share it).

Reset: the counter auto-expires 24h after the first increment. To reset manually, delete the Redis key (`DEL volume:daily:YYYY-MM-DD` — inspect with `redis-cli KEYS 'volume:daily:*'`).

## Global pause

A Redis flag that the relay checks on every `POST /settle`. When set, every settle is rejected.

Toggle it from a Redis shell:

```bash
# Pause
redis-cli SET facilitator:pause 1

# Resume
redis-cli DEL facilitator:pause
```

An admin HTTP endpoint for this is planned but not yet shipped — exposing it requires an auth layer that is separate from the public API.

## When to trigger each

| Scenario                                                                            | Use                                                  |
| ----------------------------------------------------------------------------------- | ---------------------------------------------------- |
| Someone guessed your relay's FACILITATOR_URL and is spamming `/settle` with garbage | Rate limit is enough.                                |
| Gas wallet is draining faster than expected                                         | Lower `MAX_TX_AMOUNT` and `DAILY_VOLUME_LIMIT`.      |
| Deploying a breaking change to the worker                                           | Set pause, deploy, unpause.                          |
| Facilitator private key is suspected compromised                                    | Set pause immediately, rotate keys, migrate sellers. |

## What circuit breakers do **not** do

- They do not stop `POST /verify`. Buyers and sellers can still negotiate payment; only settlement is blocked. This is intentional — sellers should not serve resources they cannot settle. Use the pause flag only when you can tolerate this.
- They do not pause in-flight Temporal workflows. Use Temporal's own `terminate` or `cancel` commands if you need to stop an already-dispatched settlement.

## Verify the breaker

```bash
curl -X POST https://api.402md.com/settle \
  -H "Content-Type: application/json" \
  -d '<valid payload>'
```

When pause is active:

```json
{ "error": "CIRCUIT_BREAKER", "message": "Settlement is paused" }
```

Status code `503`.

## Next

- [Security model](../../explanation/security-model.md) — the full threat model.
- [API reference — settlements](../../reference/api/settlements.md)
