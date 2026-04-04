# Product Marketing Context

*Last updated: 2026-04-04*

## Product Overview
**One-liner:** Cross-chain USDC settlement provider for agentic payments — buyer pays on any chain, seller receives on their chain. One HTTP request.
**What it does:** 402md Facilitator is a dual-protocol (x402 + MPP) cross-chain settlement provider. When an AI agent or developer makes a payment on one blockchain (e.g., Solana) and the seller only accepts on another (e.g., Base), 402md bridges the USDC via Circle CCTP V2 — native burn/mint, zero slippage, zero wrapped tokens. The seller onboards with a single API call, uses standard SDKs, and receives USDC directly on their preferred chain.
**Product category:** Cross-chain payment infrastructure / Agentic payments settlement
**Product type:** Infrastructure API (B2B, developer-facing)
**Business model:** Free at launch (0% platform fee, only gas allowance deducted from cross-chain payments). Configurable platform fee (target 0.25%) activated when volume justifies ($100K+/month sustained, or 50+ sellers, or market validation). Revenue = platform fee on settlement volume.

## Target Audience
**Target companies:** API providers and AI-native companies monetizing endpoints via HTTP 402 protocols (x402 and MPP). Also platforms (Cloudflare, Vercel) looking to enable paywalled APIs without chain lock-in.
**Decision-makers:** Developers, technical founders, DevRel leads at API-first companies and AI agent builders.
**Primary use case:** Accept USDC payments from AI agents on any blockchain without caring which chain the buyer is on.
**Jobs to be done:**
- "I want to monetize my API and accept USDC from any chain without managing multiple wallets or bridges"
- "I want my AI agent to pay for skills/APIs regardless of which chain it holds USDC on"
- "I want cross-chain settlement that's cheaper than Stripe's 1.5% stablecoin fee"
**Use cases:**
- x402 seller on Base wants to accept payments from Solana-based AI agents
- MPP service provider wants free crypto settlement instead of Stripe's 1.5%
- Platform (Cloudflare Workers, Vercel) wants to offer API paywalling across all CCTP chains
- AI agent builder wants their agent to pay for any skill without worrying about chain mismatch

## Personas
| Persona | Cares about | Challenge | Value we promise |
|---------|-------------|-----------|------------------|
| x402 Seller (API developer) | Maximizing conversion, minimal integration overhead | Loses transactions when buyer is on a different chain; listing 20+ chains is impractical | One wallet, all chains. Register once, use standard @x402/express SDK. Zero 402md dependencies |
| AI Agent Builder | Seamless cross-chain payments, low latency | Agent holds USDC on one chain but seller only accepts another — tx fails | Pay from any CCTP chain, gas-free (x402). Resource delivered in ms, settlement in background |
| MPP Service Provider | Lower fees than Stripe, crypto-native settlement | Stripe charges 1.5% for stablecoins; Tempo settles only on its own L1 | Free crypto settlement (network fees only), dual-protocol support |
| Platform (Cloudflare, Vercel) | Chain-agnostic API monetization for their users | Don't want to lock developers into a single chain | Offer paywalled APIs across all supported chains with no chain lock-in |

## Problems & Pain Points
**Core problem:** When a buyer (AI agent) has USDC on Chain A and the seller only accepts on Chain B, the payment fails. No existing x402 facilitator or MPP payment method provides atomic cross-chain USDC settlement.
**Why alternatives fall short:**
- **No cross-chain facilitator exists in x402** — PayAI mentions "cross-chain bridge" but it's not atomic within the x402 flow; Questflow routes between EVMs only; thirdweb supports 700+ chains but each tx operates on one chain
- **Stripe charges 1.5%** for stablecoin settlement (Base/Polygon/Ethereum only)
- **Tempo settles only on its own L1** — not where sellers actually are
- **Manual bridging** forces agents to manage bridge UX, slippage, and wrapped tokens — breaks the one-request-one-payment promise of x402/MPP
**What it costs them:** Lost transactions from chain mismatch, reduced conversion rate, fragmented wallet management, or paying 1.5% to Stripe when a free alternative could exist.
**Emotional tension:** Frustration at a fragmented multi-chain ecosystem where payments should "just work" but don't. Fear of picking the wrong chain and missing buyers.

## Competitive Landscape
**Direct:** No direct competitor exists yet — no x402/MPP facilitator does atomic cross-chain USDC settlement. 402md is first-mover in this specific niche.
**Secondary:** Stripe MPP — same problem (API monetization), different solution (fiat rails + 1.5% fee). Falls short because it's expensive for crypto-native sellers and limited to Base/Polygon/Ethereum.
**Secondary:** Coinbase CDP Facilitator — dominant x402 facilitator, but same-chain only. If Coinbase adds native bridging, it's the biggest threat. Falls short today because no cross-chain support.
**Indirect:** Manual bridging (Wormhole, LayerZero, etc.) — requires the buyer or agent to pre-bridge, adding latency, complexity, and slippage. Falls short because it breaks the seamless HTTP 402 flow.
**Indirect:** Tempo L1 — settles MPP payments but only on Tempo's own chain, not where sellers want to receive.

## Differentiation
**Key differentiators:**
- **Only cross-chain x402/MPP facilitator** — first and only provider of atomic cross-chain USDC settlement within HTTP 402 protocols
- **Free at launch** — 0% platform fee vs Stripe's 1.5%. Only gas allowance (fractions of a cent) deducted
- **Zero seller dependencies** — seller uses standard @x402/express SDK from Coinbase. No 402md fork, no 402md packages, no dashboard, no account
- **Non-custodial (Model A)** — CCTP mints directly to seller. Facilitator never custodies seller funds
- **Dual-protocol** — supports both x402 and MPP, covering the entire agentic payments ecosystem
- **No custom smart contracts** — calls standard USDC (EIP-3009) + CCTP TokenMessenger directly. Adding a new EVM chain = new RPC config, zero deploys
**How we do it differently:** Single API call to register (`POST /register`), then the seller uses the standard x402 SDK with `extra: { merchantId }`. Behind the scenes, 402md's Temporal-orchestrated worker pulls USDC from the buyer's chain, retains gas allowance, and burns/mints via CCTP V2 directly to the seller's wallet.
**Why that's better:** Zero integration overhead for the seller. No wrapped tokens, no slippage (native USDC burn/mint). Gas-free for the buyer. Resource delivered in milliseconds, settlement in background.
**Why customers choose us:** It's the only option that solves cross-chain settlement for x402/MPP — and it's free.

## Objections
| Objection | Response |
|-----------|----------|
| "Settlement takes 15-19 minutes for EVM-origin transfers" | The buyer gets the resource instantly (after verify, ~ms). Settlement happens async in background. For Solana/Stellar origin, it's 5-30 seconds. EVM latency is a CCTP constraint, not ours. |
| "How do I know my funds are safe?" | Model A is non-custodial — CCTP mints directly to your wallet. No custom smart contracts, no fund custody. Daily volume limits and circuit breakers cap exposure. |
| "What if you shut down?" | You use the standard @x402/express SDK. If 402md disappears, remove the facilitator entries from `accepts[]` — your same-chain payments keep working with any other facilitator. Zero lock-in. |
| "Why is it free? What's the catch?" | We're building market share. Gas allowance (fractions of a cent) covers our costs. Platform fee (0.25%) activates later when volume justifies — still 6x cheaper than Stripe. |

**Anti-persona:**
- **Non-technical people** — 402md is developer infrastructure. If someone can't read a curl command or doesn't know what a blockchain is, this is not for them. No dashboard, no GUI, no hand-holding.
- Projects that need instant settlement (Model A has 5s-19min latency depending on source chain)
- Projects that need fiat conversion
- Projects not using x402 or MPP protocols
- Non-USDC payments

## Switching Dynamics
**Push:** Chain mismatch kills transactions — sellers lose buyers who hold USDC on a different chain. Stripe's 1.5% fee feels excessive for stablecoin-to-stablecoin settlement.
**Pull:** Free cross-chain settlement. One registration call. Zero new dependencies. Standard SDK. Non-custodial.
**Habit:** Sellers already have same-chain facilitators working. "Good enough" if most buyers happen to be on the same chain. Inertia of existing setup.
**Anxiety:** "Is it safe?" (non-custodial model addresses this). "Will it be maintained?" (solo founder risk). "What if CCTP has issues?" (circuit breakers, auto-pause).

## Customer Language

> **Note:** No direct customer interviews yet. Target audience is crypto/AI-native developers who build and operate AI agents. Language below reflects how this audience thinks and speaks based on ecosystem context.

**How they describe the problem:**
- "My agent has USDC on Solana but this API only takes Base"
- "I'm losing payments from buyers on other chains"
- "I don't want to manage wallets on every chain"
- "Stripe takes 1.5% just to settle stablecoins — that's absurd"
- "Why can't my agent just pay from whatever chain it's on?"
- "Bridging manually before every API call kills the whole agentic flow"
**How they describe us:**
- "Cross-chain settlement for x402"
- "The bridge that makes x402 work across chains"
- "Free USDC bridging for API payments"
- "One curl and you're set up"
**Words to use:** settlement, bridge, cross-chain, facilitator, non-custodial, gas-free, CCTP, native USDC, zero slippage, one wallet, dual-protocol
**Words to avoid:** swap, exchange, wrapped tokens, custodial, middleware, proxy, merchant (use "seller"), customer/user (use "buyer" or "agent"), transfer/payment alone (use "settlement" for the full flow)
**Glossary:**
| Term | Meaning |
|------|---------|
| Facilitator | The relay that mediates x402 payments between buyer and seller |
| Bridge | Cross-chain settlement extension — receives on source chain, delivers on destination chain via CCTP |
| CCTP V2 | Circle's Cross-Chain Transfer Protocol — burns USDC on source chain, mints native USDC on destination |
| x402 | Coinbase's HTTP 402 payment protocol for API monetization |
| MPP | Machine Payments Protocol — Stripe + Tempo's standard for machine-to-machine payments |
| Seller | API provider who receives USDC for their endpoints/skills |
| Buyer / Agent | AI agent or developer that pays for API access |
| Settlement | Full delivery of USDC from buyer's chain to seller's preferred chain |
| Model A | Non-custodial: facilitator receives, retains gas allowance, CCTP burns net amount, mints directly to seller |
| Gas allowance | Fixed per-chain-pair fee (fractions of a cent) deducted from settlement to cover on-chain gas costs |
| Skill | An API monetized via x402/MPP, defined by SKILL.md |

## Brand Voice
**Tone:** Technical, direct, confident. No hype, no buzzwords beyond the domain. Transparent about limitations (latency, pre-launch status, solo founder).
**Style:** Developer-to-developer. Lead with the value prop, follow with the how. Code examples over marketing copy. Specifics over generalities (exact fees, exact latency, exact commands). Open source ethos — show the code, not the slide deck.
**Personality:** Transparent, simple, open source, builder-first, pragmatic.

## Proof Points
**Metrics:**
- 0% platform fee at launch (cheapest option in the market)
- Gas allowance < $0.002 per cross-chain settlement
- 5-30s settlement for Solana/Stellar origin, ~15-19 min for EVM origin
- < 50ms verify latency (buyer gets resource instantly)
- 3 chains at launch: Base, Solana, Stellar (all CCTP V2)
- 22K+ existing x402 sellers as addressable market
- 50+ MPP integrated services as addressable market
- $3-5T projected agentic payments market by 2030 (McKinsey)
**Customers:** Pre-launch. Target: active x402 sellers experiencing chain mismatch.
**Testimonials:** N/A (pre-launch)
**Value themes:**
| Theme | Proof |
|-------|-------|
| Cheapest settlement | 0% fee vs Stripe 1.5%. Only gas allowance ($0.0005-$0.0012) deducted |
| Simplest integration | One `POST /register` call. Standard @x402/express SDK. Zero 402md dependencies |
| Safest model | Non-custodial. No custom smart contracts. CCTP mints directly to seller. Circuit breakers cap exposure |
| Broadest reach | Dual-protocol (x402 + MPP). 3 chains at launch. Adding new EVM chain = config change only |

## Goals
**Business goal:** Become the default cross-chain settlement provider for x402 and MPP protocols. Validate cross-chain demand, reach 10+ active sellers in first 60 days.
**Conversion action:** `POST /register` — seller registers wallet and starts receiving cross-chain payments.
**Current metrics:** Pre-launch. Tracking: seller registrations, active sellers (1+ settlement/week), monthly settlement volume, cross-chain vs same-chain ratio.
