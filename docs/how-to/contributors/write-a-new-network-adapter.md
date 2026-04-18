# Write a new network adapter

All 7 EVM chains share one adapter. Solana and Stellar have their own. Adding a new non-EVM family (for example, Aptos, Sui, or a new L2 with an unusual signing model) means writing a new adapter.

This guide shows the shape of an adapter and what you have to implement.

## The interface

```typescript
export interface ChainAdapter {
  /** Pull USDC from buyer using a signed authorization. */
  pullFromBuyer(input: PullFromBuyerInput): Promise<{ txHash: string }>

  /** Same-chain transfer to seller. */
  transferToSeller(input: TransferToSellerInput): Promise<{ txHash: string }>

  /** Cross-chain: burn USDC via CCTP V2. */
  cctpBurn(input: CctpBurnInput): Promise<CctpBurnResult>

  /** Cross-chain: mint USDC on destination using attestation. */
  cctpMint(input: CctpMintInput): Promise<{ txHash: string }>

  /** Inspect a chain address for validity. */
  validateAddress(address: string): boolean
}
```

Defined in `packages/shared/src/networks/types.ts`. Every field the input types carry is documented there.

## 1. Scaffold

Create `packages/shared/src/networks/<chain>-adapter.ts`:

```typescript
import type { ChainAdapter } from './types'

export function createFooAdapter(config: {
  rpcUrl: string
  facilitatorPrivateKey: string
  facilitatorAddress: string
  usdcContract: string
  cctpTokenMessenger: string
  cctpMessageTransmitter: string
}): ChainAdapter {
  // initialize clients here
  return {
    async pullFromBuyer(input) {
      /* … */
    },
    async transferToSeller(input) {
      /* … */
    },
    async cctpBurn(input) {
      /* … */
    },
    async cctpMint(input) {
      /* … */
    },
    validateAddress(address) {
      /* … */
    },
  }
}
```

## 2. Implement each method

### `pullFromBuyer`

Accept the buyer's signed authorization and submit the chain's equivalent of EIP-3009 `transferWithAuthorization`. The output is a pulled USDC balance in the facilitator wallet.

Things the worker guarantees:

- The authorization has been verified against `network`, `payTo`, `amount`.
- The input includes `nonce`, `validAfter`, `validBefore`, and the signature.

Your job is to craft and broadcast the tx. Return the tx hash once the chain confirms.

### `transferToSeller`

Same-chain only. Transfer `amount` USDC from the facilitator wallet to the seller's address. Standard USDC transfer — no authorization, no CCTP.

### `cctpBurn`

Call the chain's CCTP `depositForBurn` equivalent. Your input includes `destinationDomain` (the Circle domain ID of the destination chain) and `mintRecipient` (padded 32-byte representation of the destination address). For EVM destinations, this is the address; for Stellar destinations, it is the `CctpForwarder` contract with the seller's Stellar address in `hookData`.

Return `{ txHash, messageBytes }`. `messageBytes` is the CCTP message that Circle will attest over — the worker uses it to poll Iris.

If the chain does not support CCTP V2 directly, your adapter cannot participate in cross-chain settlement. Document it clearly.

### `cctpMint`

Receive the CCTP attestation (the signature Circle produced over `messageBytes`) and call `receiveMessage` on the chain's `MessageTransmitter`. The chain's CCTP contract mints USDC to the encoded recipient atomically.

Return `{ txHash }`.

### `validateAddress`

Cheap check: does this string look like a valid address on this chain? Used by the relay before dispatching settlement. Do not do RPC calls here — purely format validation.

## 3. Register the adapter

Open `packages/shared/src/networks/index.ts` and wire your adapter into the `getAdapter` lookup:

```typescript
if (caip2.startsWith('foo:')) {
  return createFooAdapter({
    rpcUrl: env.FOO_RPC_URL,
    facilitatorPrivateKey: env.FACILITATOR_PRIVATE_KEY_FOO,
    facilitatorAddress: env.FACILITATOR_FOO,
    // …
  })
}
```

Add a chain definition matching the EVM pattern (see [add a new EVM chain](./add-a-new-evm-chain.md)), but point it at the new adapter instead of the EVM one.

## 4. Add env vars

- `FACILITATOR_FOO` — facilitator's address on the new chain.
- `FACILITATOR_PRIVATE_KEY_FOO` — worker-only signing key, whatever format the chain's SDK wants.
- `FOO_RPC_URL` — RPC endpoint.

Update `packages/relay/.env.example`, `packages/worker/.env.example`, and `docs/reference/environment-variables.md`.

## 5. Tests

Adapters are tested in `packages/shared/tests/networks/<chain>-adapter.test.ts`. Mock the chain RPC with a local fixture where possible. Test:

- `pullFromBuyer` happy path with a valid authorization.
- `pullFromBuyer` rejection with an invalid signature.
- `cctpBurn` emits the right `messageBytes`.
- `cctpMint` succeeds with a valid attestation and fails with an invalid one.
- `validateAddress` accepts valid addresses and rejects obvious junk.

## 6. Integration test

Add a scenario in `packages/worker/tests/workflows/cross-chain-settle.integration.test.ts` that runs a `crossChainSettle` with your new adapter on each end. Use Temporal's test environment (activities mocked) to avoid real chain calls in CI.

## 7. Document

- Add the chain to `docs/reference/chains.md`.
- Add the env vars to `docs/reference/environment-variables.md`.
- Add the family to the "Pull mechanism" table in the chains reference.
- Add an entry to the README's supported chains.

## Pitfalls

- **Authorization format drift.** Each chain's "signed authorization to pull" has different semantics. Stellar uses Soroban SAC signatures; Solana uses signed transactions; EVM uses EIP-3009. Do not try to unify these — the adapter is where the chain-specific logic lives.
- **Decimals.** EVM and Solana use 6 decimals for USDC. Stellar uses 7. A new chain might use something else. Store the value in the chain definition, not the adapter.
- **Failure modes.** Activities retry by default. Your adapter should throw on transient failures (network, rate limit) so Temporal's retry policy can catch them. Throw `NonRetryableError` for permanent failures (invalid address, insufficient funds) — those should not retry.

## Next

- [Temporal workflows explanation](../../explanation/temporal-workflows.md) — retry policies and compensation.
- [Supported chains reference](../../reference/chains.md).
