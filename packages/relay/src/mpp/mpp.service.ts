import { findByMerchantId } from '@/sellers/sellers.repository'
import { SellerNotFoundError } from '@/shared/errors'
import { checkReplay, markProcessed } from '@/shared/replay'
import { getTemporalClient } from '@/shared/temporal'
import { calculateFees } from '@/shared/gas-schedule'
import type { MppVerifyRequest, MppVerifyResponse, MppSettleRequest, MppSettleResponse, MppConfigResponse } from './mpp.types'

const FACILITATOR_ADDRESSES = {
  stellar: process.env.FACILITATOR_STELLAR ?? 'GFacilitator',
  solana: process.env.FACILITATOR_SOLANA ?? 'FacilitatorSolanaAddr',
  evm: process.env.FACILITATOR_BASE ?? '0xFacilitatorBase',
}

export async function getMppConfig(merchantId: string): Promise<MppConfigResponse> {
  const seller = await findByMerchantId(merchantId)
  if (!seller) throw new SellerNotFoundError(merchantId)

  return {
    merchantId,
    sellerNetwork: seller.network,
    stellar: {
      recipient: FACILITATOR_ADDRESSES.stellar,
      currency: 'USDC:GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN',
      network: 'pubnet',
    },
    solana: {
      recipient: FACILITATOR_ADDRESSES.solana,
      usdcMint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
      network: 'mainnet',
    },
    evm: {
      recipient: FACILITATOR_ADDRESSES.evm,
      usdcAddress: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
      chainId: 8453,
    },
  }
}

export async function verifyCharge(
  merchantId: string,
  req: MppVerifyRequest,
): Promise<MppVerifyResponse> {
  if (req.txHash) {
    if (await checkReplay(`mpp:${req.txHash}`)) {
      return { valid: false, error: 'Duplicate transaction' }
    }
    await markProcessed(`mpp:${req.txHash}`)
  }

  return { valid: true, txHash: req.txHash }
}

export async function settleCharge(
  merchantId: string,
  req: MppSettleRequest,
): Promise<MppSettleResponse> {
  const seller = await findByMerchantId(merchantId)
  if (!seller) throw new SellerNotFoundError(merchantId)

  const isSameChain = req.buyerNetwork === seller.network

  const temporal = await getTemporalClient()
  const workflowId = `mpp-${seller.network}-${req.buyerNetwork}-${req.txHash.slice(0, 16)}`
  const taskQueue = isSameChain ? 'fast-settlement' : 'cross-settlement'
  const workflowName = isSameChain ? 'sameChainSettle' : 'crossChainSettle'

  const { gasAllowance, platformFee } = calculateFees(
    req.amount,
    req.buyerNetwork,
    seller.network,
    0,
  )

  await temporal.workflow.start(workflowName, {
    taskQueue,
    workflowId,
    args: [{
      sellerId: seller.id,
      sellerAddress: seller.walletAddress,
      sellerNetwork: seller.network,
      buyerAddress: 'mpp-buyer',
      buyerNetwork: req.buyerNetwork,
      amount: req.amount,
      authorization: { validAfter: '0', validBefore: '9999999999', nonce: req.txHash, signature: req.txHash },
      destinationDomain: 6,
      gasAllowance,
      platformFee,
    }],
    workflowExecutionTimeout: isSameChain ? '5m' : '30m',
  })

  return {
    accepted: true,
    workflowId,
    type: isSameChain ? 'SAME_CHAIN' : 'CROSS_CHAIN',
  }
}
