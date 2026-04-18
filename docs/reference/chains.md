# Supported chains

Every supported chain uses Circle's native USDC via CCTP V2 — burn/mint, zero slippage, no wrapped tokens.

Chains are **opt-in**: each is enabled by setting `FACILITATOR_<CHAIN>` plus its RPC URL. Unconfigured chains are silently excluded from `GET /supported`, `GET /discover`, and `GET /.well-known/x402.json`.

## Mainnet

| Chain       | CAIP-2           | CCTP domain | Family  | SDK                    |
| ----------- | ---------------- | ----------- | ------- | ---------------------- |
| Base        | `eip155:8453`    | 6           | EVM     | `viem`                 |
| Ethereum    | `eip155:1`       | 0           | EVM     | `viem`                 |
| Optimism    | `eip155:10`      | 2           | EVM     | `viem`                 |
| Arbitrum    | `eip155:42161`   | 3           | EVM     | `viem`                 |
| Linea       | `eip155:59144`   | 11          | EVM     | `viem`                 |
| Unichain    | `eip155:130`     | 10          | EVM     | `viem`                 |
| World Chain | `eip155:480`     | 14          | EVM     | `viem`                 |
| Solana      | `solana:mainnet` | 5           | Solana  | `@solana/web3.js`      |
| Stellar     | `stellar:pubnet` | 27          | Stellar | `@stellar/stellar-sdk` |

## Testnet

| Chain               | CAIP-2            | CCTP domain |
| ------------------- | ----------------- | ----------- |
| Base Sepolia        | `eip155:84532`    | 6           |
| Ethereum Sepolia    | `eip155:11155111` | 0           |
| Optimism Sepolia    | `eip155:11155420` | 2           |
| Arbitrum Sepolia    | `eip155:421614`   | 3           |
| Linea Sepolia       | `eip155:59141`    | 11          |
| Unichain Sepolia    | `eip155:1301`     | 10          |
| World Chain Sepolia | `eip155:4801`     | 14          |
| Solana devnet       | `solana:devnet`   | 5           |
| Stellar testnet     | `stellar:testnet` | 27          |

Select which set is active with `NETWORK_ENV=mainnet` or `NETWORK_ENV=testnet`.

## Pull mechanism (buyer → facilitator)

| Family  | Pull mechanism                                               | CCTP burn call                                                                                  |
| ------- | ------------------------------------------------------------ | ----------------------------------------------------------------------------------------------- |
| EVM     | `USDC.transferWithAuthorization` (EIP-3009)                  | `TokenMessengerV2.depositForBurn` — or `depositForBurnWithHook` when the destination is Stellar |
| Solana  | Facilitator pays fee + `TransferChecked` authorized by buyer | CCTP program `depositForBurn`                                                                   |
| Stellar | Facilitator is fee source + buyer-signed payment op          | Soroban `TokenMessengerMinter.deposit_for_burn`                                                 |

The buyer **never pays gas** in the x402 flow — the Facilitator submits every transaction. In MPP charge mode, the buyer broadcasts directly and pays their own fee.

## Cross-chain destination: Stellar

When a buyer pays on an EVM chain and the seller is on Stellar, the EVM adapter uses `depositForBurnWithHook` on `TokenMessengerV2` with the `CctpForwarder` contract as `mintRecipient`. `hookData` carries the seller's Stellar address. When Circle attests, the worker calls `receiveMessage` on the destination's `MessageTransmitter`; `CctpForwarder` atomically mints and forwards USDC to the seller's Stellar account.

You do not have to do anything on the seller side — registering on `stellar:pubnet` is enough.

## EVM key sharing

All 7 EVM chains share a single private key: set `FACILITATOR_PRIVATE_KEY_EVM` once, on the worker. The same `0x…` address serves as `FACILITATOR_BASE`, `FACILITATOR_ETHEREUM`, `FACILITATOR_OPTIMISM`, etc. — set each one to the same address.

Solana and Stellar use separate keys:

- `FACILITATOR_PRIVATE_KEY_SOLANA` — base64-encoded keypair.
- `FACILITATOR_PRIVATE_KEY_STELLAR` — Stellar secret key (`S…`).

## One-time USDC approval per EVM chain

Before the Facilitator can burn on an EVM chain, its wallet must approve `TokenMessengerV2` to spend USDC. Do this once per chain:

```bash
cast send <USDC_CONTRACT> \
  "approve(address,uint256)" \
  <TokenMessengerV2> \
  $(python3 -c "print(2**256-1)") \
  --private-key $FACILITATOR_PRIVATE_KEY_EVM \
  --rpc-url $BASE_RPC_URL
```

The exact `USDC_CONTRACT` and `TokenMessengerV2` addresses per chain are in Circle's public deployment docs.

## Chains explicitly excluded

Polygon and Avalanche are excluded: CCTP V1 only, which has a different `depositForBurn` signature and ~13-minute settlement. They would require a separate adapter with a separate test matrix.

## Adding a new chain

Any new CCTP V2 deployment fits the existing EVM adapter. See [add a new EVM chain](../how-to/contributors/add-a-new-evm-chain.md).
