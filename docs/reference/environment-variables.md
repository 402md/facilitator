# Environment variables

Every env var read by the relay, worker, shared library, and demo packages. Required variables have bold names.

## relay (`packages/relay`)

| Name                          | Default                               | Purpose                                                          |
| ----------------------------- | ------------------------------------- | ---------------------------------------------------------------- |
| **`NETWORK_ENV`**             | `testnet`                             | `testnet` or `mainnet` — selects the mainnet/testnet CAIP-2 set. |
| **`DATABASE_URL`**            | —                                     | PostgreSQL connection string.                                    |
| `REDIS_URL`                   | `redis://localhost:6379`              | Redis connection string.                                         |
| `TEMPORAL_ADDRESS`            | `localhost:7233`                      | Temporal server address.                                         |
| `TEMPORAL_NAMESPACE`          | `402md-settlement`                    | Temporal namespace.                                              |
| `PORT`                        | `3000`                                | HTTP port.                                                       |
| `FACILITATOR_URL`             | `https://api.402md.com`               | Canonical relay URL, echoed in `/.well-known/x402.json`.         |
| `PLATFORM_FEE_BPS`            | `0`                                   | Platform fee in basis points.                                    |
| `MAX_TX_AMOUNT`               | `1000000000`                          | Per-tx circuit breaker (base units).                             |
| `DAILY_VOLUME_LIMIT`          | `10000000000`                         | Daily volume circuit breaker (base units).                       |
| `MPP_SECRET_KEY`              | `dev-secret-key-change-in-production` | HMAC secret for MPP challenges.                                  |
| `OTEL_ENABLED`                | `false`                               | Enable OpenTelemetry tracing.                                    |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | `http://localhost:4318/v1/traces`     | OTLP collector endpoint.                                         |
| `FACILITATOR_<CHAIN>`         | —                                     | Receiving address per enabled chain. See chain table below.      |
| `<CHAIN>_RPC_URL`             | Public defaults on testnet            | RPC endpoint per enabled chain.                                  |

## worker (`packages/worker`)

Everything the relay reads, **plus**:

| Name                              | Default | Purpose                                          |
| --------------------------------- | ------- | ------------------------------------------------ |
| `FACILITATOR_PRIVATE_KEY_EVM`     | —       | EVM private key, shared across all 7 EVM chains. |
| `FACILITATOR_PRIVATE_KEY_SOLANA`  | —       | Solana keypair, base64-encoded.                  |
| `FACILITATOR_PRIVATE_KEY_STELLAR` | —       | Stellar secret key (`S…`).                       |

Only the worker reads private keys. Never set them on the relay.

## shared (`packages/shared`)

No direct env — inherits from whichever process imports it. Variables it reads when loaded:

- `NETWORK_ENV`
- `DATABASE_URL`
- `REDIS_URL`
- `OTEL_EXPORTER_OTLP_ENDPOINT`
- All `FACILITATOR_*` and `<CHAIN>_RPC_URL`
- All `FACILITATOR_PRIVATE_KEY_*`

## demo-seller (`packages/demo-seller`)

Runtime-only. No `.env.example` ships.

| Name                | Default                 | Purpose                              |
| ------------------- | ----------------------- | ------------------------------------ |
| `FACILITATOR_URL`   | `http://localhost:3000` | Relay endpoint to register with.     |
| **`SELLER_WALLET`** | —                       | Seller's wallet on `SELLER_NETWORK`. |
| `SELLER_NETWORK`    | `stellar:testnet`       | Network the demo registers on.       |
| `DEMO_SELLER_PORT`  | `4000`                  | HTTP port.                           |
| `MPP_SECRET_KEY`    | `demo-seller-secret`    | HMAC secret matching the relay's.    |

## demo-agent (`packages/demo-agent`)

Runtime-only. No `.env.example` ships.

| Name                   | Default                 | Purpose                                                |
| ---------------------- | ----------------------- | ------------------------------------------------------ |
| `FACILITATOR_URL`      | `http://localhost:3000` | Relay endpoint for bazaar lookup.                      |
| `DEMO_SELLER_URL`      | `http://localhost:4000` | Demo seller to query.                                  |
| **`AGENT_SECRET_KEY`** | —                       | Stellar secret key (`S…`) used to sign MPP challenges. |

## Per-chain variable names

One receiving address and one RPC URL per enabled EVM chain, plus their non-EVM equivalents:

| Chain       | Address env              | RPC env              |
| ----------- | ------------------------ | -------------------- |
| Base        | `FACILITATOR_BASE`       | `BASE_RPC_URL`       |
| Ethereum    | `FACILITATOR_ETHEREUM`   | `ETHEREUM_RPC_URL`   |
| Optimism    | `FACILITATOR_OPTIMISM`   | `OPTIMISM_RPC_URL`   |
| Arbitrum    | `FACILITATOR_ARBITRUM`   | `ARBITRUM_RPC_URL`   |
| Linea       | `FACILITATOR_LINEA`      | `LINEA_RPC_URL`      |
| Unichain    | `FACILITATOR_UNICHAIN`   | `UNICHAIN_RPC_URL`   |
| World Chain | `FACILITATOR_WORLDCHAIN` | `WORLDCHAIN_RPC_URL` |
| Solana      | `FACILITATOR_SOLANA`     | `SOLANA_RPC_URL`     |
| Stellar     | `FACILITATOR_STELLAR`    | `STELLAR_RPC_URL`    |

A chain becomes enabled when its `FACILITATOR_*` address is set. Unset = disabled, silently.

All 7 EVM chains share the same `0x…` address and the same `FACILITATOR_PRIVATE_KEY_EVM` — set the same value into `FACILITATOR_BASE`, `FACILITATOR_ETHEREUM`, etc.

## Validating your config

The worker calls `validateNetworkEnv({ requirePrivateKeys: true })` at boot. It will fail fast if any enabled chain is missing its address or key.

For a manual check:

```bash
cd packages/relay
bun run -e "import('@402md/shared').then(s => console.log(s.validateNetworkEnv()))"
```

It prints `{ ok: true }` or `{ ok: false, missing: [...] }`.
