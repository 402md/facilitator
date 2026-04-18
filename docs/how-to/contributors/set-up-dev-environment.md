# Set up a development environment

You want to hack on the facilitator itself. This guide gets you from a fresh clone to a running local stack with test wallets.

## 1. Clone and install

```bash
git clone https://github.com/402md/facilitator.git
cd facilitator

bun install
```

## 2. Start infrastructure

```bash
docker compose up -d
```

Wait ~10 s for Temporal to finish auto-setup, then:

```bash
temporal operator namespace create 402md-settlement

temporal operator search-attribute create \
  --name sellerNetwork --type Keyword \
  --name buyerNetwork --type Keyword \
  --name settlementStatus --type Keyword \
  --name protocol --type Keyword
```

## 3. Generate test wallets

You need facilitator wallets on every chain you want to test. One EVM key works across all 7 EVM chains.

**EVM:**

```bash
# Install foundry, or use any library that outputs a keypair
cast wallet new
```

Save the address and private key.

**Stellar testnet:**

Use the [Stellar Lab](https://laboratory.stellar.org/#account-creator?network=test) account creator. Save the public key (`G…`) and secret (`S…`).

**Solana devnet:**

```bash
solana-keygen new --outfile ~/.config/solana/devnet-facilitator.json
cat ~/.config/solana/devnet-facilitator.json | base64
```

The base64 string is what you put in `FACILITATOR_PRIVATE_KEY_SOLANA`.

## 4. Fund the wallets

Testnet funding options:

- **Stellar:** [Friendbot](https://laboratory.stellar.org/#account-creator?network=test) gives you XLM. Get testnet USDC via Stellar's circles.com sandbox (ask the team for a link — there is no public faucet yet).
- **Base Sepolia:** use a public [Base Sepolia faucet](https://www.alchemy.com/faucets/base-sepolia) for ETH; use [Circle's USDC faucet](https://faucet.circle.com) for testnet USDC.
- **Solana devnet:** `solana airdrop 2 <address>`; USDC via Circle's faucet.

## 5. One-time USDC approval on each EVM chain

The facilitator wallet must approve `TokenMessengerV2` to spend USDC. Do this once per EVM chain you plan to enable:

```bash
cast send \
  <USDC_CONTRACT_ADDRESS> \
  "approve(address,uint256)" \
  <TOKEN_MESSENGER_V2_ADDRESS> \
  $(python3 -c "print(2**256-1)") \
  --private-key $FACILITATOR_PRIVATE_KEY_EVM \
  --rpc-url $BASE_SEPOLIA_RPC_URL
```

Circle's docs list `USDC_CONTRACT_ADDRESS` and `TOKEN_MESSENGER_V2_ADDRESS` per chain. You only do this once per chain — the approval is for `2^256 − 1` USDC and never expires.

## 6. Configure env files

```bash
cp packages/relay/.env.example packages/relay/.env
cp packages/worker/.env.example packages/worker/.env
```

Fill in at least:

```bash
NETWORK_ENV=testnet

DATABASE_URL=postgresql://postgres:postgres@localhost:5432/fourzerotwomd
REDIS_URL=redis://localhost:6379
TEMPORAL_ADDRESS=localhost:7233
TEMPORAL_NAMESPACE=402md-settlement

FACILITATOR_BASE=0x...
FACILITATOR_STELLAR=G...
FACILITATOR_SOLANA=...

# worker only:
FACILITATOR_PRIVATE_KEY_EVM=0x...
FACILITATOR_PRIVATE_KEY_STELLAR=S...
FACILITATOR_PRIVATE_KEY_SOLANA=<base64>
```

See [environment variables](../../reference/environment-variables.md) for the full list.

## 7. Run database migrations

```bash
cd packages/relay
bun run db:migrate
cd -
```

## 8. Run relay and worker

```bash
# terminal 1
cd packages/relay && bun run dev

# terminal 2
cd packages/worker && bun run dev
```

Or from the root:

```bash
bun run dev
```

## 9. Verify

```bash
curl http://localhost:3000/health
```

All three services (db, redis, temporal) should be `"ok"`.

## 10. Run the demo (optional)

```bash
./scripts/demo.sh
```

See [run the demo](./run-the-demo.md).

## Development tips

### ESLint and Prettier run on every commit

Husky + lint-staged enforce `prettier --check` and `eslint` on staged files. A failing commit is usually a formatting issue — run `bun run format:fix` and `bun run lint --fix` and retry.

### USDC amounts are strings

Never `parseFloat` or `Number()`. Never use JS arithmetic on amounts. Use `decimal.js` or `BigInt`. This is enforced in review and documented in [code standards](../../../.claude/rules/code-standards.md).

### Commit format

Conventional commits: `feat:`, `fix:`, `docs:`, `chore:`, `refactor:`, `hotfix:`. Lowercase. Imperative mood. Never add `Co-Authored-By` lines.

See [git workflow rules](../../../.claude/rules/git-workflow.md).

## Next

- [Run the demo](./run-the-demo.md)
- [Add a new EVM chain](./add-a-new-evm-chain.md)
- [Write a network adapter](./write-a-new-network-adapter.md)
