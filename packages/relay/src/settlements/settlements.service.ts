import { getTemporalClient } from '@/shared/temporal'
import { findByMerchantId } from '@/sellers/sellers.repository'
import { SellerNotFoundError, InvalidPaymentError, ReplayError } from '@/shared/errors'
import {
  calculateFees,
  getCctpDomain,
  supportedCaip2s,
  getFacilitatorAddress,
} from '@402md/shared/networks'
import { checkCircuitBreakers, recordVolume } from '@/shared/circuit-breaker'
import { checkReplay, markProcessed } from '@/shared/replay'
import type {
  VerifyRequest,
  VerifyResponse,
  SettleRequest,
  SettleResponse,
  FeeQuote,
} from './settlements.types'

const PLATFORM_FEE_BPS = parseInt(process.env.PLATFORM_FEE_BPS ?? '0', 10)

export async function verifyPayment(req: VerifyRequest): Promise<VerifyResponse> {
  const { paymentPayload, paymentRequirements } = req

  if (!paymentRequirements.extra?.merchantId) {
    return { isValid: false, invalidReason: 'Missing merchantId in extra' }
  }

  const seller = await findByMerchantId(paymentRequirements.extra.merchantId)
  if (!seller) {
    return { isValid: false, invalidReason: 'Unknown merchantId' }
  }

  if (!supportedCaip2s.includes(paymentRequirements.network)) {
    return { isValid: false, invalidReason: `Unsupported network: ${paymentRequirements.network}` }
  }

  const expectedPayTo = getFacilitatorAddress(paymentRequirements.network)
  if (paymentRequirements.payTo !== expectedPayTo) {
    return { isValid: false, invalidReason: 'payTo does not match facilitator address' }
  }

  if (!paymentPayload.payload.signature || paymentPayload.payload.signature.length < 10) {
    return { isValid: false, invalidReason: 'Invalid or missing payment signature' }
  }

  const amount = BigInt(paymentRequirements.amount)
  if (amount <= 0n) {
    return { isValid: false, invalidReason: 'Amount must be greater than zero' }
  }

  return { isValid: true }
}

export async function dispatchSettlement(req: SettleRequest): Promise<SettleResponse> {
  await checkCircuitBreakers(req.paymentRequirements.amount)
  const replayKey = req.paymentPayload.payload.signature
  if (await checkReplay(replayKey)) throw new ReplayError()
  await markProcessed(replayKey)

  const merchantId = req.paymentRequirements.extra?.merchantId
  if (!merchantId) throw new InvalidPaymentError('Missing merchantId in extra')

  const seller = await findByMerchantId(merchantId)
  if (!seller) throw new SellerNotFoundError(merchantId)

  const buyerNetwork = req.paymentRequirements.network
  const sellerNetwork = seller.network
  const isSameChain = buyerNetwork === sellerNetwork

  const { gasAllowance, platformFee } = calculateFees(
    req.paymentRequirements.amount,
    buyerNetwork,
    sellerNetwork,
    PLATFORM_FEE_BPS,
  )

  const txRef = req.paymentPayload.payload.signature.slice(0, 16)
  const workflowType = isSameChain ? 'same' : 'cross'
  const workflowId = `${workflowType}-${sellerNetwork}-${buyerNetwork}-${txRef}`
  const taskQueue = isSameChain ? 'fast-settlement' : 'cross-settlement'
  const workflowName = isSameChain ? 'sameChainSettle' : 'crossChainSettle'

  const temporal = await getTemporalClient()

  const { authorization, signature } = req.paymentPayload.payload
  const buyerAddress = authorization.from
  const resource = req.paymentPayload.resource

  const params = isSameChain
    ? {
        sellerId: seller.id,
        sellerAddress: seller.walletAddress,
        buyerAddress,
        network: buyerNetwork,
        amount: req.paymentRequirements.amount,
        authorization: {
          validAfter: authorization.validAfter,
          validBefore: authorization.validBefore,
          nonce: authorization.nonce,
          signature,
        },
        gasAllowance,
        platformFee,
        resource,
        merchantId,
        payTo: req.paymentRequirements.payTo,
        scheme: req.paymentRequirements.scheme ?? 'exact',
      }
    : {
        sellerId: seller.id,
        sellerAddress: seller.walletAddress,
        sellerNetwork,
        buyerAddress,
        buyerNetwork,
        amount: req.paymentRequirements.amount,
        authorization: {
          validAfter: authorization.validAfter,
          validBefore: authorization.validBefore,
          nonce: authorization.nonce,
          signature,
        },
        sourceDomain: getCctpDomain(buyerNetwork),
        destinationDomain: getCctpDomain(sellerNetwork),
        gasAllowance,
        platformFee,
        resource,
        merchantId,
        payTo: req.paymentRequirements.payTo,
        scheme: req.paymentRequirements.scheme ?? 'exact',
      }

  await temporal.workflow.start(workflowName, {
    taskQueue,
    workflowId,
    args: [params],
    workflowExecutionTimeout: isSameChain ? '5m' : '30m',
  })

  await recordVolume(req.paymentRequirements.amount)

  return {
    success: true,
    transaction: workflowId,
    network: buyerNetwork,
  }
}

export async function getWorkflowStatus(workflowId: string) {
  const temporal = await getTemporalClient()
  const handle = temporal.workflow.getHandle(workflowId)
  const status = await handle.query('status')
  return status
}

export function getFeeQuote(from: string, to: string, amount: string): FeeQuote {
  const { gasAllowance, platformFee, netAmount } = calculateFees(amount, from, to, PLATFORM_FEE_BPS)
  const totalDeduction = (BigInt(gasAllowance) + BigInt(platformFee)).toString()
  return {
    platformFee,
    gasAllowance,
    totalDeduction,
    sellerReceives: netAmount,
    currency: 'USDC',
    decimals: 6,
    note: `Gas allowance from fixed schedule (${from}->${to}). Seller receives gross - gasAllowance - platformFee.`,
  }
}
