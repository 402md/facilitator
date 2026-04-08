import { Elysia } from 'elysia'
import { Mppx, stellar } from '@stellar/mpp/charge/server'
import { USDC_SAC_TESTNET, STELLAR_TESTNET } from '@stellar/mpp'

const FACILITATOR_URL = process.env.FACILITATOR_URL ?? 'http://localhost:3000'
const SELLER_WALLET = process.env.SELLER_WALLET ?? ''
const SELLER_NETWORK = process.env.SELLER_NETWORK ?? 'stellar:testnet'
const PORT = process.env.DEMO_SELLER_PORT ?? 4000

if (!SELLER_WALLET) {
  console.error('SELLER_WALLET env var is required')
  process.exit(1)
}

async function autoRegister(): Promise<string> {
  const res = await fetch(`${FACILITATOR_URL}/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      walletAddress: SELLER_WALLET,
      network: SELLER_NETWORK,
    }),
  })
  const data = (await res.json()) as { merchantId: string }
  console.log(`Registered with facilitator as merchant: ${data.merchantId}`)
  return data.merchantId
}

const merchantId = await autoRegister()

const mppx = Mppx.create({
  methods: [
    stellar({
      recipient: SELLER_WALLET,
      currency: USDC_SAC_TESTNET,
      network: STELLAR_TESTNET,
    }),
  ],
  secretKey: process.env.MPP_SECRET_KEY ?? 'demo-seller-secret',
})

const PRICE_PER_QUERY = '1000000' // 0.001 USDC in 7-decimal stroops (1_000_000)

const searchResults = [
  { title: 'Stellar Developer Docs', url: 'https://developers.stellar.org' },
  { title: 'Circle CCTP V2 Guide', url: 'https://developers.circle.com/cctp' },
  { title: 'x402 Protocol Spec', url: 'https://www.x402.org' },
  { title: 'MPP SDK Reference', url: 'https://github.com/stellar/stellar-mpp-sdk' },
  { title: '402md Facilitator', url: 'https://api.402md.com' },
]

new Elysia()
  .get('/', () => ({
    name: '402md Demo Seller',
    description: 'Search API paywalled with MPP on Stellar',
    merchantId,
    price: '0.001 USDC per query',
    facilitator: FACILITATOR_URL,
  }))
  .get('/search', async ({ query, request }) => {
    const result = await mppx.charge({ amount: PRICE_PER_QUERY })(request)

    if (result.status === 402) {
      return new Response(JSON.stringify({ error: 'Payment Required' }), {
        status: 402,
        headers: result.challenge.headers,
      })
    }

    const q = (query.q ?? '').toLowerCase()
    const filtered = q
      ? searchResults.filter(
          (r) => r.title.toLowerCase().includes(q) || r.url.toLowerCase().includes(q),
        )
      : searchResults

    return result.withReceipt(Response.json({ query: q || '*', results: filtered, merchantId }))
  })
  .listen(Number(PORT))

console.log(`Demo seller running on http://localhost:${PORT}`)
console.log(`  GET /search?q=stellar  (requires MPP payment of ${PRICE_PER_QUERY} stroops)`)
console.log(`  Merchant ID: ${merchantId}`)
