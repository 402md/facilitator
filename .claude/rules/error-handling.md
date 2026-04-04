# Error Handling & Retry Policies — 402md Bridge

## Temporal Activity Retry Policies

### On-Chain Activities (pull, split, burn, mint) — 2m timeout
- maxAttempts: 10
- initialInterval: 1s
- backoffCoefficient: 2
- maxInterval: 30s

### Attestation (waitAttestation) — 30m timeout
- maxAttempts: 20
- initialInterval: 5s
- backoffCoefficient: 1.5
- maxInterval: 60s
- heartbeatTimeout: 2m

### Side-Effects (ledger, notification) — 30s timeout
- maxAttempts: 5
- initialInterval: 500ms
- backoffCoefficient: 2
- maxInterval: 10s

## Failure Compensation

### Burn succeeds + Mint fails
- Workflow enters `failed` state
- Attestation remains valid indefinitely
- Operator dashboard shows `MINT_PENDING`
- Manual retry via admin endpoint — no fund loss

### Pull succeeds + Burn fails
- USDC sits in facilitator wallet
- Recovery: retry burn (common) or refund buyer
- Ledger records `BURN_PENDING`

## Dead Letter Detection

- Temporal visibility queries with search attributes (`sellerNetwork`, `buyerNetwork`, `status`)
- Monitor for stuck/failed workflows
