import { Keypair } from '@stellar/stellar-sdk'
import { Mppx, stellar } from '@stellar/mpp/charge/client'

const FACILITATOR_URL = process.env.FACILITATOR_URL ?? 'http://localhost:3000'
const DEMO_SELLER_URL = process.env.DEMO_SELLER_URL ?? 'http://localhost:4000'
const AGENT_SECRET_KEY = process.env.AGENT_SECRET_KEY ?? ''

if (!AGENT_SECRET_KEY) {
  console.error('AGENT_SECRET_KEY env var is required (Stellar secret key starting with S...)')
  process.exit(1)
}

const keypair = Keypair.fromSecret(AGENT_SECRET_KEY)
console.log(`Agent wallet: ${keypair.publicKey()}`)

const mppx = Mppx.create({
  methods: [stellar.charge({ keypair })],
  polyfillFetch: false,
})

async function discoverServices() {
  console.log('\n--- Discovering services via bazaar ---')
  const res = await fetch(`${FACILITATOR_URL}/bazaar`)
  const data = (await res.json()) as {
    services: { merchantId: string; walletAddress: string; network: string }[]
  }
  console.log(`Found ${data.services.length} service(s)`)
  for (const s of data.services) {
    console.log(`  ${s.merchantId} (${s.network}) — ${s.walletAddress}`)
  }
  return data.services
}

async function searchWithPayment(query: string) {
  console.log(`\nSearching for: "${query}"`)
  const url = `${DEMO_SELLER_URL}/search?q=${encodeURIComponent(query)}`

  const res = await mppx.fetch(url)

  if (!res.ok) {
    console.log(`  Error: ${res.status} ${res.statusText}`)
    return null
  }

  const data = (await res.json()) as {
    query: string
    results: { title: string; url: string }[]
    merchantId: string
  }

  console.log(`  Found ${data.results.length} result(s):`)
  for (const r of data.results) {
    console.log(`    - ${r.title}: ${r.url}`)
  }
  return data
}

async function main() {
  console.log('=== 402md Demo Agent ===')
  console.log(`Facilitator: ${FACILITATOR_URL}`)
  console.log(`Seller: ${DEMO_SELLER_URL}`)

  const services = await discoverServices()

  if (services.length === 0) {
    console.log('No services found. Make sure demo-seller is running.')
    process.exit(1)
  }

  const queries = ['stellar', 'cctp', 'x402', 'mpp', 'facilitator']
  let totalQueries = 0

  console.log('\n--- Making paid queries ---')
  for (const q of queries) {
    const result = await searchWithPayment(q)
    if (result) totalQueries++
  }

  console.log('\n=== Summary ===')
  console.log(`Queries completed: ${totalQueries}/${queries.length}`)
  console.log(`Agent: ${keypair.publicKey()}`)
}

main().catch((err) => {
  console.error('Agent failed:', err)
  process.exit(1)
})
