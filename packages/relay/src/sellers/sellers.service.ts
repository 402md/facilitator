import { nanoid } from 'nanoid'
import { createSeller, findByMerchantId, findByWallet } from './sellers.repository'
import { SellerNotFoundError, UnsupportedNetworkError } from '@/shared/errors'
import type { RegisterRequest, RegisterResponse, DiscoveryResponse } from './sellers.types'

const SUPPORTED_NETWORKS = ['eip155:8453', 'solana:mainnet', 'stellar:pubnet']

const FACILITATOR_ADDRESSES: Record<string, string> = {
  'eip155:8453': process.env.FACILITATOR_BASE ?? '0xFacilitatorBase',
  'solana:mainnet': process.env.FACILITATOR_SOLANA ?? 'FacilitatorSolAddr',
  'stellar:pubnet': process.env.FACILITATOR_STELLAR ?? 'FacilitatorStellarAddr',
}

const FACILITATOR_URL = process.env.FACILITATOR_URL ?? 'https://api.402md.com'

const USDC_ASSETS: Record<string, string> = {
  'eip155:8453': '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
  'solana:mainnet': 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
  'stellar:pubnet': 'USDC:GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN',
}

function buildCodeSnippet(merchantId: string, addresses: Record<string, string>): string {
  const accepts = Object.entries(addresses)
    .map(
      ([network, payTo]) =>
        `      { scheme: "exact", network: "${network}", payTo: "${payTo}", price: "$0.001", extra: { merchantId: "${merchantId}" } }`,
    )
    .join(',\n')

  return `// Standard @x402/express — zero 402md dependencies
const server = new x402ResourceServer(
  new HTTPFacilitatorClient({ url: "${FACILITATOR_URL}" })
)

app.use(paymentMiddleware({
  "GET /your-endpoint": {
    accepts: [
${accepts}
    ],
  },
}, server))`
}

export async function registerSeller(req: RegisterRequest): Promise<RegisterResponse> {
  if (!SUPPORTED_NETWORKS.includes(req.network)) {
    throw new UnsupportedNetworkError(req.network, SUPPORTED_NETWORKS)
  }

  const existing = await findByWallet(req.wallet, req.network)
  if (existing) {
    return {
      merchantId: existing.merchantId,
      wallet: existing.walletAddress,
      network: existing.network,
      facilitatorAddresses: FACILITATOR_ADDRESSES,
      codeSnippet: buildCodeSnippet(existing.merchantId, FACILITATOR_ADDRESSES),
    }
  }

  const merchantId = `${req.wallet.slice(2, 4).toLowerCase()}-${nanoid(6)}`
  const seller = await createSeller({
    merchantId,
    walletAddress: req.wallet,
    network: req.network,
  })

  return {
    merchantId: seller.merchantId,
    wallet: seller.walletAddress,
    network: seller.network,
    facilitatorAddresses: FACILITATOR_ADDRESSES,
    codeSnippet: buildCodeSnippet(seller.merchantId, FACILITATOR_ADDRESSES),
  }
}

export async function getDiscovery(merchantId: string): Promise<DiscoveryResponse> {
  const seller = await findByMerchantId(merchantId)
  if (!seller) throw new SellerNotFoundError(merchantId)

  const acceptedNetworks = SUPPORTED_NETWORKS.map((network) => ({
    network,
    payTo: FACILITATOR_ADDRESSES[network],
    asset: USDC_ASSETS[network],
    maxTimeoutSeconds: network === seller.network ? 60 : 120,
    extra: { merchantId },
    bridge: network !== seller.network,
  }))

  return {
    merchantId,
    acceptedNetworks,
    sellerNetwork: seller.network,
    fees: {
      platform: '0% (free during early access)',
      gasAllowance: 'Fixed per chain pair — deducted from cross-chain payments (see /bridge/fees)',
      sameChain: 'Gas allowance deducted from seller (see /bridge/fees)',
    },
    estimatedSettlement: {
      standard: '~5-30s (Solana/Stellar origin), ~15-19min (EVM origin)',
      note: 'Time depends on source chain finality. Solana ~25s, Stellar ~5-10s, EVM ~15-19min.',
    },
    gasFree: true,
  }
}
