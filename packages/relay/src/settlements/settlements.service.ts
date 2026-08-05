import { getTemporalClient } from '@/shared/temporal'
import { findByMerchantId } from '@/sellers/sellers.repository'
import { SellerNotFoundError, InvalidPaymentError, ReplayError } from '@/shared/errors'
import {
  calculateFees,
  getCctpDomain,
  getNetwork,
  isWellFormedSignature,
  recoverAuthorizationSigner,
  supportedCaip2s,
  supportsEip3009,
  getFacilitatorAddress,
} from '@402md/shared/networks'
import { checkCircuitBreakers, recordVolume } from '@/shared/circuit-breaker'
import { reserveReplay, releaseReplay } from '@/shared/replay'
import type {
  PaymentAuthorization,
  PaymentRequest,
  VerifyRequest,
  VerifyResponse,
  SettleRequest,
  SettleResponse,
  FeeQuote,
} from './settlements.types'

const PLATFORM_FEE_BPS = parseInt(process.env.PLATFORM_FEE_BPS ?? '0', 10)

/**
 * How long `/settle` waits for the buyer's USDC to be captured on the source
 * chain. That is a single tx confirmation, not the CCTP bridge — 60s matches
 * the x402 default `maxTimeoutSeconds` budget with room for slow chains.
 * Read per call so tests can shrink it.
 */
function settleWaitTimeoutMs(): number {
  return parseInt(process.env.SETTLE_WAIT_TIMEOUT_MS ?? '60000', 10)
}

/**
 * Each in-flight `/settle` polls Temporal at this rate for as long as it waits,
 * so the default trades a little latency on a 1–15s capture for a much smaller
 * query rate when many settlements are open at once.
 */
function settlePollIntervalMs(): number {
  return parseInt(process.env.SETTLE_POLL_INTERVAL_MS ?? '500', 10)
}

/** Error reasons from the x402 spec (§9), plus the workflow-level ones we add. */
const REASON = {
  invalidPaymentRequirements: 'invalid_payment_requirements',
  invalidNetwork: 'invalid_network',
  invalidPayload: 'invalid_payload',
  signature: 'invalid_exact_evm_payload_signature',
  recipientMismatch: 'invalid_exact_evm_payload_recipient_mismatch',
  valueMismatch: 'invalid_exact_evm_payload_authorization_value_mismatch',
  validAfter: 'invalid_exact_evm_payload_authorization_valid_after',
  validBefore: 'invalid_exact_evm_payload_authorization_valid_before',
  unexpectedSettleError: 'unexpected_settle_error',
} as const

interface PaymentRejection {
  reason: string
  message: string
}

type ValidationResult =
  | { ok: false; rejection: PaymentRejection }
  | { ok: true; authorization: PaymentAuthorization; signature: string }

function reject(reason: string, message: string): ValidationResult {
  return { ok: false, rejection: { reason, message } }
}

function isPositiveIntegerString(value: unknown): value is string {
  return typeof value === 'string' && /^\d+$/.test(value) && BigInt(value) > 0n
}

function isUnsignedIntegerString(value: unknown): value is string {
  return typeof value === 'string' && /^\d+$/.test(value)
}

/**
 * Every check that decides whether a payment is acceptable, minus the seller
 * lookup — callers already hold the seller and report its absence differently.
 *
 * `/settle` runs this too, not just `/verify`: a caller can skip `/verify`
 * entirely, so validating only there would be advisory at best.
 */
async function validatePayment(req: PaymentRequest): Promise<ValidationResult> {
  const { paymentPayload, paymentRequirements } = req

  if (!supportedCaip2s.includes(paymentRequirements.network)) {
    return reject(REASON.invalidNetwork, `Unsupported network: ${paymentRequirements.network}`)
  }

  const expectedPayTo = getFacilitatorAddress(paymentRequirements.network)
  if (paymentRequirements.payTo !== expectedPayTo) {
    return reject(REASON.recipientMismatch, 'payTo does not match facilitator address')
  }

  if (!isPositiveIntegerString(paymentRequirements.amount)) {
    return reject(
      REASON.invalidPaymentRequirements,
      'Amount must be an integer string greater than zero',
    )
  }

  const { authorization, signature } = paymentPayload.payload

  if (!authorization) {
    return reject(REASON.invalidPayload, 'Missing authorization in payload')
  }

  const missing = (['from', 'to', 'value', 'validAfter', 'validBefore', 'nonce'] as const).find(
    (field) => typeof authorization[field] !== 'string' || authorization[field].length === 0,
  )
  if (missing) {
    return reject(REASON.invalidPayload, `Missing authorization.${missing}`)
  }

  if (authorization.value !== paymentRequirements.amount) {
    return reject(
      REASON.valueMismatch,
      `Authorized ${authorization.value} but requirements ask ${paymentRequirements.amount}`,
    )
  }

  if (authorization.to !== paymentRequirements.payTo) {
    return reject(REASON.recipientMismatch, 'authorization.to does not match payTo')
  }

  if (
    !isUnsignedIntegerString(authorization.validAfter) ||
    !isUnsignedIntegerString(authorization.validBefore)
  ) {
    return reject(REASON.invalidPayload, 'validAfter and validBefore must be integer strings')
  }

  const now = BigInt(Math.floor(Date.now() / 1000))
  if (BigInt(authorization.validAfter) > now) {
    return reject(REASON.validAfter, 'Authorization is not valid yet')
  }
  if (BigInt(authorization.validBefore) <= now) {
    return reject(REASON.validBefore, 'Authorization has expired')
  }

  if (typeof signature !== 'string' || signature.length === 0) {
    return reject(REASON.signature, 'Missing payment signature')
  }

  const accepted: ValidationResult = { ok: true, authorization, signature }

  const network = getNetwork(paymentRequirements.network)
  if (!supportsEip3009(network)) {
    // Solana and Stellar carry a chain-native authorization instead of an
    // EIP-3009 signature. Nothing to recover here — the adapter is what
    // validates it when the pull is submitted.
    return accepted
  }

  if (!isWellFormedSignature(signature)) {
    return reject(REASON.signature, 'Signature must be 65 bytes of hex')
  }

  let signer: string
  try {
    signer = await recoverAuthorizationSigner(network, authorization, signature)
  } catch (err) {
    return reject(REASON.signature, `Signature recovery failed: ${(err as Error).message}`)
  }

  if (signer.toLowerCase() !== authorization.from.toLowerCase()) {
    return reject(REASON.signature, 'Signature was not produced by authorization.from')
  }

  return accepted
}

export async function verifyPayment(req: VerifyRequest): Promise<VerifyResponse> {
  const payer = req.paymentPayload.payload.authorization?.from
  const withPayer = payer ? { payer } : {}

  const merchantId = req.paymentRequirements.extra?.merchantId
  if (!merchantId) {
    return {
      isValid: false,
      invalidReason: REASON.invalidPaymentRequirements,
      invalidMessage: 'Missing merchantId in extra',
      ...withPayer,
    }
  }

  if (!(await findByMerchantId(merchantId))) {
    return {
      isValid: false,
      invalidReason: REASON.invalidPaymentRequirements,
      invalidMessage: `Unknown merchantId: ${merchantId}`,
      ...withPayer,
    }
  }

  const result = await validatePayment(req)
  if (!result.ok) {
    return {
      isValid: false,
      invalidReason: result.rejection.reason,
      invalidMessage: result.rejection.message,
      ...withPayer,
    }
  }

  return { isValid: true, ...withPayer }
}

type CaptureOutcome =
  | { transaction: string; failure?: undefined }
  | { transaction: ''; failure: PaymentRejection }

function captureFailed(message: string): CaptureOutcome {
  return { transaction: '', failure: { reason: REASON.unexpectedSettleError, message } }
}

type WorkflowHandle = {
  query(name: string): Promise<unknown>
  result(): Promise<unknown>
}

type WorkflowStatus = { step?: string; pullTxHash?: string; error?: string }

/** Both settle workflows return the capture hash; that is all we read here. */
type WorkflowResult = { pullTxHash?: string }

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

/**
 * Wait for the buyer's funds to land in the facilitator wallet.
 *
 * This is the leg that makes the payment real, and the only one x402 cares
 * about: once `pullFromBuyer` confirms, the buyer has irreversibly paid and
 * `transaction` has a genuine tx hash to report. The CCTP burn/attest/mint that
 * follows is 402md delivering to the seller and takes minutes — no HTTP client
 * would wait for it, so it stays asynchronous.
 */
async function waitForCapture(handle: WorkflowHandle): Promise<CaptureOutcome> {
  // A box rather than two `let`s: control-flow narrowing does not see the
  // assignments made inside the handlers below, and a property read stays
  // honest where a narrowed local would need a cast.
  const settlement: { result?: WorkflowResult; error?: Error } = {}

  // Attach both handlers up front: a workflow that fails while we are between
  // polls must not surface as an unhandled rejection.
  handle.result().then(
    (result) => {
      settlement.result = (result ?? {}) as WorkflowResult
    },
    (err: Error) => {
      settlement.error = err
    },
  )

  const deadline = Date.now() + settleWaitTimeoutMs()
  const interval = settlePollIntervalMs()

  while (Date.now() < deadline) {
    let status: WorkflowStatus | null
    try {
      status = (await handle.query('status')) as WorkflowStatus
    } catch {
      // Querying a workflow that just closed can fail; the result below is
      // authoritative about what happened.
      status = null
    }

    if (status?.pullTxHash) {
      return { transaction: status.pullTxHash }
    }
    // The workflow returns the same hash, so a query that never surfaced it —
    // a transient failure, a race with completion — must not cost the seller a
    // settlement that actually happened.
    if (settlement.result?.pullTxHash) {
      return { transaction: settlement.result.pullTxHash }
    }
    if (settlement.error) {
      return captureFailed(settlement.error.message)
    }
    if (status?.step === 'failed') {
      return captureFailed(status.error ?? 'Settlement failed')
    }
    if (settlement.result) {
      return captureFailed('Workflow completed without a pull tx hash')
    }

    await sleep(interval)
  }

  return captureFailed('Timed out waiting for the payment to be pulled')
}

export async function dispatchSettlement(req: SettleRequest): Promise<SettleResponse> {
  const merchantId = req.paymentRequirements.extra?.merchantId
  if (!merchantId) throw new InvalidPaymentError('Missing merchantId in extra')

  const seller = await findByMerchantId(merchantId)
  if (!seller) throw new SellerNotFoundError(merchantId)

  const buyerNetwork = req.paymentRequirements.network
  const payer = req.paymentPayload.payload.authorization?.from
  const withPayer = payer ? { payer } : {}

  // Ahead of the circuit breakers, which parse `amount` as a bigint and would
  // throw on a malformed one instead of answering with a payment reason.
  const validation = await validatePayment(req)
  if (!validation.ok) {
    return {
      success: false,
      errorReason: validation.rejection.reason,
      errorMessage: validation.rejection.message,
      transaction: '',
      network: buyerNetwork,
      ...withPayer,
    }
  }
  const { authorization, signature } = validation

  await checkCircuitBreakers(req.paymentRequirements.amount)

  // Claimed only once the payment is known good, and atomically, so two
  // concurrent settles for the same signature cannot both proceed.
  const replayKey = signature
  if (!(await reserveReplay(replayKey))) throw new ReplayError()

  const sellerNetwork = seller.network
  const isSameChain = buyerNetwork === sellerNetwork

  const { gasAllowance, platformFee } = calculateFees(
    req.paymentRequirements.amount,
    buyerNetwork,
    sellerNetwork,
    PLATFORM_FEE_BPS,
  )

  const txRef = replayKey.slice(0, 16)
  const workflowType = isSameChain ? 'same' : 'cross'
  const workflowId = `${workflowType}-${sellerNetwork}-${buyerNetwork}-${txRef}`
  const taskQueue = isSameChain ? 'fast-settlement' : 'cross-settlement'
  const workflowName = isSameChain ? 'sameChainSettle' : 'crossChainSettle'

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

  const temporal = await getTemporalClient()

  let handle: WorkflowHandle
  try {
    handle = (await temporal.workflow.start(workflowName, {
      taskQueue,
      workflowId,
      args: [params],
      workflowExecutionTimeout: isSameChain ? '5m' : '30m',
    })) as WorkflowHandle
  } catch (err) {
    // Nothing is running, so the signature must stay spendable.
    await releaseReplay(replayKey)
    throw err
  }

  // Counted at dispatch, not on success: a workflow that outlives our wait can
  // still pull. The daily limit is a safety ceiling, so over-counting a
  // settlement that later fails is the harmless direction to be wrong in.
  await recordVolume(req.paymentRequirements.amount)

  const outcome = await waitForCapture(handle)

  // `workflowId` is repeated under `extensions` because the x402 client schema
  // strips unknown top-level fields — this is the copy a seller behind the
  // standard middleware actually receives.
  const locator = { workflowId, extensions: { '402md': { workflowId } } }

  if (outcome.failure) {
    // The key is deliberately kept: the workflow may still be running, and its
    // id derives from this signature, so a repeat of this exact request lands
    // on the same execution rather than pulling twice.
    return {
      success: false,
      errorReason: outcome.failure.reason,
      errorMessage: outcome.failure.message,
      transaction: '',
      network: buyerNetwork,
      ...locator,
      ...withPayer,
    }
  }

  return {
    success: true,
    transaction: outcome.transaction,
    network: buyerNetwork,
    amount: req.paymentRequirements.amount,
    ...locator,
    ...withPayer,
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
