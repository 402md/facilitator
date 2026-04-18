---
name: how-to-use-facilitator
description: How an AI agent or an x402 seller integrates with the 402md Facilitator to send or receive cross-chain USDC payments.
type: skill-md
---

# How to use the 402md Facilitator

The 402md Facilitator is a cross-chain USDC settlement relay for the **x402** protocol (HTTP 402) and the **Machine Payments Protocol (MPP)**. A buyer pays on any supported chain; the seller receives native USDC on their chosen chain. No custom SDK, no smart contracts.

Base URL: `https://facilitator.402.md`

## Supported chains

All chains use Circle CCTP V2 with native USDC. Polygon and Avalanche are explicitly excluded (CCTP V1 only).

- **EVM**: Base, Ethereum, Optimism, Arbitrum, Linea, Unichain, World Chain
- **Solana**: mainnet
- **Stellar**: pubnet

## If you are a seller (you want to receive USDC)

1. **Register your wallet once.** Send one HTTP request:

   ```http
   POST https://facilitator.402.md/register
   Content-Type: application/json

   {
     "wallet": "GSELLER...",
     "network": "stellar:pubnet"
   }
   ```

   Response includes your `merchantId` plus facilitator pay-to addresses for every supported chain. That `merchantId` routes every cross-chain payment back to your single wallet.

2. **Use the standard `@x402/express` middleware** from Coinbase. Point each route's `payTo` to the facilitator address for that chain and include your `merchantId` in `extra`:

   ```ts
   import { paymentMiddleware } from '@x402/express'

   app.use(
     paymentMiddleware(
       {
         'GET /your-endpoint': {
           accepts: [
             {
               scheme: 'exact',
               network: 'eip155:8453',
               payTo: '0x...',
               price: '$0.001',
               extra: { merchantId: '7c-vQZHANEd5ICp' },
             },
             {
               scheme: 'exact',
               network: 'solana:mainnet',
               payTo: '4r7q...',
               price: '$0.001',
               extra: { merchantId: '7c-vQZHANEd5ICp' },
             },
             {
               scheme: 'exact',
               network: 'stellar:pubnet',
               payTo: 'GAX5...',
               price: '$0.001',
               extra: { merchantId: '7c-vQZHANEd5ICp' },
             },
           ],
         },
       },
       'https://facilitator.402.md',
     ),
   )
   ```

3. **Do nothing else.** 402md verifies payments, bridges via CCTP V2 when needed, and delivers native USDC to your wallet.

## If you are a buyer / agent (you want to pay)

1. **GET the seller's resource.** If it is x402-protected, you will receive an HTTP `402 Payment Required` with a list of accepted payment methods (chains, prices, and facilitator addresses).
2. **Sign a standard x402 `PaymentPayload`** on whichever supported chain you hold USDC on. No 402md-specific fields; use the standard x402 payload.
3. **Replay the request** with the `X-PAYMENT` header set to the base64-encoded payload. The seller verifies with the facilitator (`POST /verify`) and settles (`POST /settle`). You get the resource in the response.

No bridges, no swaps, no wrapped tokens — 402md uses Circle CCTP V2 under the hood.

## Machine Payments Protocol (MPP)

The facilitator also exposes MPP endpoints for Stellar-ecosystem agents (OpenAI, Anthropic, Dune, etc.). Same facilitator, same settlement rail, different HTTP surface. See the OpenAPI spec for the MPP route set.

## Fees

- **Platform fee**: 0% at launch.
- **Gas allowance**: fixed schedule per route, deducted from the payout. Example on a $1.00 payment: Stellar→Stellar $0.00001, Base→Base $0.0020, Base→Stellar $0.0032.
- **Same-chain**: direct USDC transfer, no bridge, lowest cost.

## Discovery endpoints

- `GET /health` — dependency status (DB, Redis, Temporal)
- `GET /swagger` — full OpenAPI reference
- `GET /swagger/json` — machine-readable OpenAPI spec
- `GET /discovery/resources` — public registry of active x402 resources (filter by network, sort by uses or volume)
- `GET /discovery/routes` — cross-chain route activity and cost matrix
- `GET /.well-known/api-catalog` — RFC 9727 link set pointing at the OpenAPI spec, docs, and status

## Non-goals

- 402md never custodies seller funds. CCTP V2 mints directly to the seller's address.
- 402md does not deploy custom smart contracts. It calls USDC (EIP-3009) and CCTP TokenMessenger directly via chain SDKs.
- 402md does not run a dashboard, login, or seller SDK. The public `/dashboard` is a read-only view of aggregate activity; all of its data is also available via `/discovery/*` as structured JSON.

## Links

- Landing: https://facilitator.402.md/
- OpenAPI: https://facilitator.402.md/swagger/json
- Source: https://github.com/402md
- x402 spec: https://www.x402.org/
- Circle CCTP V2: https://www.circle.com/cctp
