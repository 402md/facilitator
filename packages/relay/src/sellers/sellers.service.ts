import { nanoid } from 'nanoid'
import { createSeller, findByMerchantId } from './sellers.repository'
import { SellerNotFoundError } from '@/shared/errors'
import { supportedCaip2s, networks, UnsupportedNetworkError } from '@402md/shared/networks'
import type { RegisterRequest, RegisterResponse, DiscoveryResponse } from './sellers.types'

function buildFacilitatorAddresses(): Record<string, string> {
  return Object.fromEntries(networks.map((n) => [n.caip2, n.facilitatorAddress]))
}

function buildCodeSnippet(merchantId: string, addresses: Record<string, string>): string {
  const accepts = Object.entries(addresses)
    .map(
      ([network, payTo]) =>
        `      { scheme: "exact", network: "${network}", payTo: "${payTo}", price: "$0.001", extra: { merchantId: "${merchantId}" } }`,
    )
    .join(',\n')

  return `app.use(paymentMiddleware({
  "GET /your-endpoint": {
    accepts: [
${accepts}
    ],
  },
}, "https://facilitator.402.md"))`
}

export async function registerSeller(req: RegisterRequest): Promise<RegisterResponse> {
  if (!supportedCaip2s.includes(req.network)) {
    throw new UnsupportedNetworkError(req.network, supportedCaip2s)
  }

  const facilitatorAddresses = buildFacilitatorAddresses()
  const merchantId = `${req.wallet.slice(2, 4).toLowerCase()}-${nanoid(12)}`
  const seller = await createSeller({
    merchantId,
    walletAddress: req.wallet,
    network: req.network,
  })

  return {
    merchantId: seller.merchantId,
    wallet: seller.walletAddress,
    network: seller.network,
    facilitatorAddresses,
    codeSnippet: buildCodeSnippet(seller.merchantId, facilitatorAddresses),
  }
}

export async function getDiscovery(merchantId: string): Promise<DiscoveryResponse> {
  const seller = await findByMerchantId(merchantId)
  if (!seller) throw new SellerNotFoundError(merchantId)

  const acceptedNetworks = networks.map((n) => ({
    network: n.caip2,
    payTo: n.facilitatorAddress,
    asset: n.usdc,
    maxTimeoutSeconds: n.caip2 === seller.network ? 60 : 120,
    extra: { merchantId },
    bridge: n.caip2 !== seller.network,
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

// Re-export the default facilitator addresses for consumers that only want the map.
export { buildFacilitatorAddresses as _facilitatorAddresses }
