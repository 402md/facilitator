# 402md Bridge — Discovery & Planning Workspace

> **402md Bridge** — Cross-chain USDC settlement provider for agentic payments.
> Dual-protocol (x402 + MPP). Buyer pays on any chain, seller receives on their chain. One HTTP request.

## What This Is

Planning workspace for the 402md Bridge project. No code here — only discovery, technical specification, and implementation plan documents. Code lives in separate repos (`402md-worker`, `402md-relay`). No custom smart contracts — worker calls USDC + CCTP directly via chain SDKs.

## Seller DX

No dashboard, no login, no SDK. One curl to start receiving cross-chain USDC:

```bash
# 1. Register your wallet (one-time)
curl -X POST https://mysite.com/register \
  -d '{"walletAddress":"0x...", "network":"base"}'

```

## Rules

- All documents and code in **English**
- Never add `Co-Authored-By` lines to commits
- Use `bun` for all commands
- USDC values are always strings — never `parseFloat` or `Number()`
- Keep documents consistent: changes in one doc may require updates in others
- When updating the plan, preserve phase structure (1 → 2 → 2.5 → 3 → 4)
- Fee model: **free at launch** (network fees only), configurable platform fee for later

See `.claude/rules/` for detailed standards on tech stack, code, testing, security, error handling, and infrastructure.
