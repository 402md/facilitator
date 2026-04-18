# Check settlement status

A buyer paid. You want to know when the USDC arrives, and whether anything failed. This guide covers the two ways to check.

## Option 1 — poll the relay

Every successful `POST /settle` returns a `transaction` field containing the Temporal `workflowId`:

```json
{
  "success": true,
  "transaction": "x402-hb-a1b2c3-1700000000",
  "network": "eip155:8453",
  "payer": "0xBuyer..."
}
```

Poll:

```bash
curl https://api.402md.com/bridge/status/x402-hb-a1b2c3-1700000000
```

Response for a cross-chain settlement in progress:

```json
{
  "step": "attesting",
  "pullTxHash": "0x...",
  "burnTxHash": "0x..."
}
```

Possible `step` values:

| Workflow    | Steps                                                                                   |
| ----------- | --------------------------------------------------------------------------------------- |
| Same-chain  | `pulling` → `transferring` → `recording` → `settled` (or `failed`)                      |
| Cross-chain | `pulling` → `burning` → `attesting` → `minting` → `recording` → `settled` (or `failed`) |

Poll every 5–10 s. Expect:

- **Same-chain:** terminal in < 5 s.
- **Solana or Stellar source:** terminal in ~5–30 s.
- **EVM source, cross-chain:** terminal in ~15–19 min (dominated by source chain finality + Circle attestation).

## Option 2 — subscribe via bazaar transactions

If you want a recent-transactions feed rather than per-payment polling:

```bash
curl "https://api.402md.com/bazaar/transactions?merchantId=hb-a1b2c3&status=settled&limit=20"
```

This returns settled transactions with gross/net amounts and every on-chain tx hash. Useful for a seller dashboard. Cache is 60 s, so do not hammer it.

## What "settled" means

- **Same-chain:** USDC is in your wallet.
- **Cross-chain:** Circle minted USDC on the destination chain and, if the destination is Stellar, the `CctpForwarder` contract forwarded it to you. The relay's ledger entry is written after the mint confirms.

## When settlement fails

| `step: failed` cause        | What to do                                                                                                                                                 |
| --------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pullFromBuyer` failed      | Buyer's authorization was invalid or funds insufficient. Not your problem — return a refund to them out-of-band only if you already released the resource. |
| `cctpBurn` failed           | USDC sits in the facilitator wallet. Operators investigate; you are not out of pocket.                                                                     |
| `waitAttestation` timed out | Circle took > 30 min. Operators will retry; Circle attestations never expire once issued.                                                                  |
| `cctpMint` failed           | Operators retry. No fund loss — the burn is final and the attestation is reusable.                                                                         |

In every failure mode you, as the seller, have received nothing yet but the buyer either paid or will be refunded. The ledger is consistent — no double-debits.

For contextual detail see [error handling rules](../../../.claude/rules/error-handling.md).

## Next

- [API reference — settlements](../../reference/api/settlements.md)
- [Temporal workflows explanation](../../explanation/temporal-workflows.md)
