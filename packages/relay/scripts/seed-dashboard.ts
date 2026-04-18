/**
 * Seed the dashboard with synthetic sellers, bazaar resources, and transactions.
 *
 * Usage (from packages/relay):
 *   bun run scripts/seed-dashboard.ts
 *   bun run scripts/seed-dashboard.ts --reset
 *
 * All seeded rows use merchantIds prefixed with `seed-` so the reset is safe
 * and never touches real data.
 */
import { sql, inArray, like } from 'drizzle-orm'
import { db, sellers, bazaarResources, transactions } from '@402md/shared/db'

const SEED_PREFIX = 'seed-'

const CHAINS = [
  { slug: 'base', caip2: 'eip155:8453', evm: true },
  { slug: 'ethereum', caip2: 'eip155:1', evm: true },
  { slug: 'optimism', caip2: 'eip155:10', evm: true },
  { slug: 'arbitrum', caip2: 'eip155:42161', evm: true },
  { slug: 'linea', caip2: 'eip155:59144', evm: true },
  { slug: 'unichain', caip2: 'eip155:130', evm: true },
  { slug: 'worldchain', caip2: 'eip155:480', evm: true },
  { slug: 'solana', caip2: 'solana:mainnet', evm: false },
  { slug: 'stellar', caip2: 'stellar:pubnet', evm: false },
]

const PROTOCOLS = ['x402', 'mpp'] as const
const STATUSES = ['settled', 'settled', 'settled', 'settled', 'pending', 'failed'] as const

const RESOURCE_CATALOG = [
  { path: '/weather/forecast', description: 'Global weather forecast API', cents: '5000' },
  { path: '/market/quote', description: 'Real-time stock quote', cents: '10000' },
  { path: '/llm/chat', description: 'Cheap LLM chat endpoint', cents: '25000' },
  { path: '/embed/text', description: 'Text embedding 1536-dim', cents: '2000' },
  { path: '/ocr/extract', description: 'OCR image-to-text', cents: '50000' },
  { path: '/translate/en-es', description: 'EN→ES machine translation', cents: '3000' },
  { path: '/speech/transcribe', description: 'Audio transcription', cents: '150000' },
  { path: '/image/generate', description: 'AI image generation', cents: '200000' },
  { path: '/geocode/reverse', description: 'Reverse geocoding', cents: '1000' },
  { path: '/news/feed', description: 'Curated news feed', cents: '500' },
  { path: '/crypto/price', description: 'Crypto price ticker', cents: '1500' },
  { path: '/scrape/url', description: 'URL scrape + summarize', cents: '80000' },
]

const BUYER_EVM = '0xA1B2C3D4E5F60718293A4B5C6D7E8F9012345678'
const BUYER_SOL = 'So1anaB4yer1111111111111111111111111111111'
const BUYER_STELLAR = 'GABC5SELLERXSTELLARZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZA'

function walletFor(chain: (typeof CHAINS)[number], idx: number): string {
  if (chain.evm) return `0x${(idx + 1).toString(16).padStart(2, '0').repeat(20)}`.slice(0, 42)
  if (chain.slug === 'solana')
    return `So1anaSel1er${idx.toString().padStart(2, '0')}${'1'.repeat(30)}`.slice(0, 44)
  return `GSELLER${idx.toString().padStart(2, '0')}${'A'.repeat(48)}`.slice(0, 56)
}

function buyerFor(caip2: string): string {
  if (caip2.startsWith('eip155:')) return BUYER_EVM
  if (caip2.startsWith('solana:')) return BUYER_SOL
  return BUYER_STELLAR
}

function txHash(prefix: string, n: number): string {
  return `0x${prefix}${n.toString(16).padStart(60, '0')}`
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

async function reset() {
  console.log('→ wiping previous seed rows…')
  const seedSellers = await db
    .select({ id: sellers.id })
    .from(sellers)
    .where(like(sellers.merchantId, `${SEED_PREFIX}%`))
  const ids = seedSellers.map((s) => s.id)
  if (ids.length > 0) {
    await db.delete(transactions).where(inArray(transactions.sellerId, ids))
    await db.delete(bazaarResources).where(inArray(bazaarResources.sellerId, ids))
    await db.delete(sellers).where(inArray(sellers.id, ids))
  }
  // transactions w/ no sellerId fallback wipe
  await db.execute(
    sql`DELETE FROM transactions WHERE pull_tx_hash LIKE '0xseed%' OR burn_tx_hash LIKE '0xseed%'`,
  )
  console.log(`  removed ${ids.length} sellers and dependents`)
}

async function seed() {
  console.log('→ inserting sellers…')
  const sellerRows = CHAINS.map((chain, i) => ({
    merchantId: `${SEED_PREFIX}${chain.slug}-${i + 1}`,
    walletAddress: walletFor(chain, i + 1),
    network: chain.caip2,
  }))
  const insertedSellers = await db.insert(sellers).values(sellerRows).returning()
  console.log(`  inserted ${insertedSellers.length} sellers`)

  console.log('→ inserting bazaar resources…')
  const resourceRows = insertedSellers.flatMap((seller, i) => {
    const slice = RESOURCE_CATALOG.slice(i % 3, (i % 3) + 3)
    return slice.map((r) => ({
      resourceUrl: `https://api.seller${i + 1}.example.com${r.path}`,
      baseUrl: `https://api.seller${i + 1}.example.com`,
      description: r.description,
      sellerId: seller.id,
      merchantId: seller.merchantId,
      network: seller.network,
      payTo: seller.walletAddress,
      amount: r.cents,
      scheme: 'exact',
      useCount: randomInt(10, 800),
      totalVolume: (BigInt(r.cents) * BigInt(randomInt(10, 800))).toString(),
    }))
  })
  await db.insert(bazaarResources).values(resourceRows)
  console.log(`  inserted ${resourceRows.length} resources`)

  console.log('→ inserting transactions…')
  const TX_COUNT = 300
  const txRows: (typeof transactions.$inferInsert)[] = []
  for (let i = 0; i < TX_COUNT; i++) {
    const seller = pick(insertedSellers)
    const sellerChain = CHAINS.find((c) => c.caip2 === seller.network)!
    // 35% cross-chain so the matrix has spread
    const crossChain = Math.random() < 0.35
    const buyerChain = crossChain
      ? pick(CHAINS.filter((c) => c.caip2 !== sellerChain.caip2))
      : sellerChain
    const type = crossChain ? 'BRIDGE_SETTLEMENT' : 'SAME_CHAIN'
    const protocol = pick(PROTOCOLS)
    const status = pick(STATUSES)

    const gross = BigInt(randomInt(500, 500000)) // $0.0005 – $0.50
    const gasAllowance = crossChain ? BigInt(randomInt(100, 2000)) : 0n
    const net = gross - gasAllowance
    const daysAgo = randomInt(0, 29)
    const createdAt = new Date(Date.now() - daysAgo * 86400 * 1000 - randomInt(0, 86400 * 1000))
    const settledAt =
      status === 'settled' ? new Date(createdAt.getTime() + randomInt(5, 60) * 1000) : null

    txRows.push({
      type,
      protocol,
      status,
      buyerAddress: buyerFor(buyerChain.caip2),
      buyerNetwork: buyerChain.caip2,
      sellerAddress: seller.walletAddress,
      sellerNetwork: seller.network,
      sellerId: seller.id,
      grossAmount: gross.toString(),
      netAmount: net.toString(),
      platformFee: '0',
      gasAllowance: gasAllowance.toString(),
      pullTxHash: txHash('seed', i),
      burnTxHash: crossChain ? txHash('seedb', i) : null,
      mintTxHash: crossChain && status === 'settled' ? txHash('seedm', i) : null,
      createdAt,
      settledAt,
    })
  }
  // batch insert in chunks of 100 (PG param limit safety)
  for (let i = 0; i < txRows.length; i += 100) {
    await db.insert(transactions).values(txRows.slice(i, i + 100))
  }
  console.log(`  inserted ${txRows.length} transactions`)
}

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL not set')
    process.exit(1)
  }
  if (process.argv.includes('--reset')) await reset()
  await seed()
  console.log('✔ dashboard seeded — hit /dashboard to see it')
  process.exit(0)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
