# Testing Strategy — 402md Bridge

## Worker (Temporal)

Test with Temporal test environment (isolated):
1. Happy path — both workflows complete with mocked activities
2. Activity failure + retry — mock activity to fail N times then succeed
3. Worker crash recovery — cancel mid-workflow → restart → verify resume
4. Idempotency — start workflow with same ID twice → dedup

## Relay (Elysia)

- Integration tests against real endpoints
- E2E: buyer pays → relay verifies → Temporal workflow settles
- MPP charge: buyer broadcasts → relay verifies → CCTP bridge

## Circuit Breakers (Off-Chain)

- Per-tx limit: relay rejects amounts above `maxTxAmount`
- Daily volume limit: worker checks Redis counter before pull
- Pause: relay rejects all settle requests when pause flag is set
