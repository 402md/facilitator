# Add a new EVM chain

CCTP V2 is deployed on 7 EVM chains today. When Circle deploys V2 on another EVM chain, adding it to the Facilitator is a config change — no new adapter, no contract deploy, no audit.

This guide walks through adding a hypothetical chain `Foo Chain`, CAIP-2 `eip155:4200`, CCTP domain `42`.

## 1. Register the chain definition

Open `packages/shared/src/networks/index.ts`. Add a new entry to the EVM chain array:

```typescript
import { fooChain, fooChainSepolia } from 'viem/chains'

const evmChains: ChainDefinition[] = [
  // … existing entries …
  {
    slug: 'fooChain',
    caip2: { mainnet: 'eip155:4200', testnet: 'eip155:4201' },
    viemChain: { mainnet: fooChain, testnet: fooChainSepolia },
    envAddressKey: 'FACILITATOR_FOOCHAIN',
    envRpcKey: 'FOOCHAIN_RPC_URL',
    cctpDomain: 42,
    usdcContract: {
      mainnet: '0x...',
      testnet: '0x...',
    },
    tokenMessengerV2: {
      mainnet: '0x...',
      testnet: '0x...',
    },
  },
]
```

All addresses (USDC, TokenMessengerV2) are from Circle's public [CCTP V2 deployment docs](https://developers.circle.com/stablecoins/docs/cctp-protocol-contract).

## 2. Add the gas allowance

Open `packages/shared/src/networks/gas-schedule.ts`. Add the new chain's allowances in every direction against every other chain it can settle with. For a mainnet-only chain and three existing chains (Base, Solana, Stellar):

```typescript
{ from: 'fooChain', to: 'fooChain', allowance: '500' }, // same-chain
{ from: 'fooChain', to: 'base', allowance: '500' },
{ from: 'base', to: 'fooChain', allowance: '500' },
{ from: 'fooChain', to: 'solana', allowance: '800' },
{ from: 'solana', to: 'fooChain', allowance: '1200' },
{ from: 'fooChain', to: 'stellar', allowance: '800' },
{ from: 'stellar', to: 'fooChain', allowance: '800' },
```

Pick allowances based on observed gas costs on the new chain. Start generous — the Facilitator absorbs the variance, so being too low hurts the operator. You can tighten numbers later based on production data.

## 3. Update the documentation

Two places:

- `docs/reference/chains.md` — add the new chain to both the mainnet and testnet tables.
- The root `README.md` chain list — add an entry to keep marketing copy in sync.

## 4. Test

Spin up a worker with `FACILITATOR_FOOCHAIN` and `FOOCHAIN_RPC_URL` set. Register a seller on the new chain:

```bash
curl -X POST http://localhost:3000/register \
  -H "Content-Type: application/json" \
  -d '{ "wallet": "0xSELLER...", "network": "eip155:4201" }'
```

Check:

- `GET /supported` lists `eip155:4201`.
- `GET /.well-known/x402.json` includes the chain under `networks`.
- `GET /bridge/fees?from=eip155:4201&to=stellar:pubnet&amount=1000000` returns the expected allowance.

Make a tiny payment end-to-end (source: new chain, destination: Stellar) via the demo agent. Watch the Temporal workflow in the UI to confirm every step.

## 5. Approve USDC spend on the new chain

One-time: the Facilitator wallet must approve `TokenMessengerV2` on the new chain:

```bash
cast send \
  <FOO_USDC_CONTRACT> \
  "approve(address,uint256)" \
  <FOO_TOKEN_MESSENGER_V2> \
  $(python3 -c "print(2**256-1)") \
  --private-key $FACILITATOR_PRIVATE_KEY_EVM \
  --rpc-url $FOOCHAIN_RPC_URL
```

Document it in the team's operations runbook so it's not forgotten during the next deploy.

## Pitfalls

- **Same EVM key, different address?** EVM uses a single key across all chains. Make sure `FACILITATOR_FOOCHAIN` is the same `0x…` as `FACILITATOR_BASE` et al. If you generate a new key you will break settlement on every other chain.
- **Chain not on CCTP V2?** Then you cannot add it here. CCTP V1 (Polygon, Avalanche) has a different signature and slower finality — out of scope until V1 is supported.
- **Using `depositForBurnWithHook` to a non-Stellar destination?** Don't. The hook is only wired for Stellar destinations. EVM → EVM and EVM → Solana use plain `depositForBurn`.

## Next

- [Write a network adapter](./write-a-new-network-adapter.md) — for non-EVM chains (Solana, Stellar, Aptos-like families).
- [Supported chains reference](../../reference/chains.md)
