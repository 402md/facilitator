import { Mppx, stellar } from '@stellar/mpp/charge/server'
import { USDC_SAC_TESTNET, USDC_SAC_MAINNET, STELLAR_TESTNET, STELLAR_PUBNET } from '@stellar/mpp'
import { resolveNetworkEnv } from '@402md/shared/networks'
import { findByMerchantId } from '@/sellers/sellers.repository'
import { SellerNotFoundError } from '@/shared/errors'

const isTestnet = resolveNetworkEnv() === 'testnet'

function createMppServer(recipient: string) {
  const currency = isTestnet ? USDC_SAC_TESTNET : USDC_SAC_MAINNET
  const network = isTestnet ? STELLAR_TESTNET : STELLAR_PUBNET

  return Mppx.create({
    methods: [
      stellar({
        recipient,
        currency,
        network,
      }),
    ],
    secretKey: process.env.MPP_SECRET_KEY ?? 'dev-secret-key-change-in-production',
  })
}

export async function handleCharge(
  merchantId: string,
  amount: string,
  request: Request,
): Promise<Response> {
  const seller = await findByMerchantId(merchantId)
  if (!seller) throw new SellerNotFoundError(merchantId)

  const mppx = createMppServer(seller.walletAddress)
  const result = await mppx.charge({ amount })(request)

  if (result.status === 402) {
    return result.challenge
  }

  return result.withReceipt(Response.json({ paid: true, merchantId }))
}

export async function getMppConfig(merchantId: string) {
  const seller = await findByMerchantId(merchantId)
  if (!seller) throw new SellerNotFoundError(merchantId)

  const currency = isTestnet ? USDC_SAC_TESTNET : USDC_SAC_MAINNET
  const network = isTestnet ? STELLAR_TESTNET : STELLAR_PUBNET

  return {
    merchantId,
    protocol: 'mpp',
    methods: [
      {
        name: 'stellar',
        intent: 'charge',
        recipient: seller.walletAddress,
        currency,
        network,
      },
    ],
  }
}
