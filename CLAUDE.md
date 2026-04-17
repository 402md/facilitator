# 402md Facilitator

> Cross-chain USDC settlement provider for agentic payments.
> Dual-protocol (x402 + MPP). Buyer pays on any chain, seller receives on their chain. One HTTP request.

Planning workspace — no code here. Code lives in `402md-worker` (Temporal/Node.js) and `402md-relay` (Elysia/Bun). No custom smart contracts — worker calls USDC + CCTP directly via chain SDKs.

## Supported Chains

All on CCTP V2 with Circle native USDC. EVM chains share one private key (same `0x...` address everywhere); Solana and Stellar each have their own.

- **EVM**: Base, Ethereum, Optimism, Arbitrum, Linea, Unichain, World Chain
- **Solana**: mainnet + devnet
- **Stellar**: pubnet + testnet

Chains are opt-in: each one is activated by setting `FACILITATOR_<CHAIN>` + its RPC URL. Polygon and Avalanche are explicitly excluded (CCTP V1 only — settlement is ~13 min vs seconds, and `depositForBurn` has a different signature).

## How to Work

### 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

- State assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them — don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

### 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

The test: would a senior engineer say this is overcomplicated? If yes, simplify.

### 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it — don't delete it.
- Remove imports/variables/functions that YOUR changes made unused.
- Every changed line should trace directly to the request.

### 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:
- "Add validation" → write tests for invalid inputs, then make them pass
- "Fix the bug" → write a test that reproduces it, then make it pass
- "Refactor X" → ensure tests pass before and after

For multi-step tasks, state a brief plan:
```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
```

## Project Rules

- All documents and code in **English**
- Never add `Co-Authored-By` lines to commits
- Use `bun` for all commands
- USDC values are always strings — never `parseFloat` or `Number()`
- Keep documents consistent: changes in one doc may require updates in others
- When updating the plan, preserve phase structure (1 → 2 → 2.5 → 3 → 4)
- Fee model: **free at launch** (network fees only), configurable platform fee for later

See `.claude/rules/` for detailed standards on tech stack, code, testing, security, error handling, and infrastructure.
