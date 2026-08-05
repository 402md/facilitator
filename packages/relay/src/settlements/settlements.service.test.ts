import { beforeEach, describe, expect, test } from 'bun:test'
import {
  resetAllMocks,
  mockDb,
  mockRedis,
  mockTemporal,
  buildPaymentRequest,
  signTestAuthorization,
  TEST_BUYER_ADDRESS,
  TEST_PULL_TX,
  TEST_SELLER,
  FACILITATOR_ADDRESSES,
} from '@/shared/test-helpers'
import { verifyPayment, dispatchSettlement, getFeeQuote } from './settlements.service'
import { ReplayError, CircuitBreakerError } from '@/shared/errors'

// Keep the capture wait short so timeout cases do not stall the suite. Left set
// for the whole process on purpose: clearing it in afterAll would restore the
// 60s default for whichever settlement file bun happens to run next.
process.env.SETTLE_WAIT_TIMEOUT_MS = '300'
process.env.SETTLE_POLL_INTERVAL_MS = '20'

const SOLANA_SELLER = { ...TEST_SELLER, network: 'solana:mainnet' }

describe('verifyPayment', () => {
  beforeEach(() => {
    resetAllMocks()
    mockDb.setSellers([TEST_SELLER])
  })

  test('accepts a correctly signed authorization', async () => {
    const result = await verifyPayment(await buildPaymentRequest())

    expect(result.isValid).toBe(true)
    expect(result.payer).toBe(TEST_BUYER_ADDRESS)
  })

  test('rejects a signature that does not recover to authorization.from', async () => {
    const req = await buildPaymentRequest()
    // Valid 65-byte signature, wrong signer.
    const { signature } = await signTestAuthorization({
      privateKey: '0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d',
    })
    req.paymentPayload.payload.signature = signature

    const result = await verifyPayment(req)

    expect(result.isValid).toBe(false)
    expect(result.invalidReason).toBe('invalid_exact_evm_payload_signature')
  })

  test('rejects a garbage signature', async () => {
    const req = await buildPaymentRequest()
    req.paymentPayload.payload.signature = '0xValidSignature1234567890abcdef'

    const result = await verifyPayment(req)

    expect(result.isValid).toBe(false)
    expect(result.invalidReason).toBe('invalid_exact_evm_payload_signature')
  })

  test('rejects an authorization signed for a different amount', async () => {
    const req = await buildPaymentRequest({ value: '1' })
    req.paymentRequirements.amount = '1000000'

    const result = await verifyPayment(req)

    expect(result.isValid).toBe(false)
    expect(result.invalidReason).toBe('invalid_exact_evm_payload_authorization_value_mismatch')
  })

  test('rejects an expired authorization', async () => {
    const req = await buildPaymentRequest({ validBefore: '1000' })

    const result = await verifyPayment(req)

    expect(result.isValid).toBe(false)
    expect(result.invalidReason).toBe('invalid_exact_evm_payload_authorization_valid_before')
  })

  test('rejects an authorization that is not valid yet', async () => {
    const validAfter = String(Math.floor(Date.now() / 1000) + 3600)
    const req = await buildPaymentRequest({ validAfter })

    const result = await verifyPayment(req)

    expect(result.isValid).toBe(false)
    expect(result.invalidReason).toBe('invalid_exact_evm_payload_authorization_valid_after')
  })

  test('rejects a payload with no authorization at all', async () => {
    const req = await buildPaymentRequest()
    delete (req.paymentPayload.payload as { authorization?: unknown }).authorization

    const result = await verifyPayment(req)

    expect(result.isValid).toBe(false)
    expect(result.invalidReason).toBe('invalid_payload')
  })

  test('rejects when merchantId is missing', async () => {
    const req = await buildPaymentRequest()
    req.paymentRequirements.extra = {}

    const result = await verifyPayment(req)

    expect(result.isValid).toBe(false)
    expect(result.invalidReason).toBe('invalid_payment_requirements')
    expect(result.invalidMessage).toContain('merchantId')
  })

  test('rejects an unsupported network', async () => {
    const req = await buildPaymentRequest()
    req.paymentRequirements.network = 'eip155:1'

    const result = await verifyPayment(req)

    expect(result.isValid).toBe(false)
    expect(result.invalidReason).toBe('invalid_network')
  })

  test('rejects when payTo is not the facilitator address', async () => {
    const req = await buildPaymentRequest()
    req.paymentRequirements.payTo = '0x000000000000000000000000000000000000dEaD'

    const result = await verifyPayment(req)

    expect(result.isValid).toBe(false)
    expect(result.invalidReason).toBe('invalid_exact_evm_payload_recipient_mismatch')
  })

  test('rejects when authorization.to does not match payTo', async () => {
    const req = await buildPaymentRequest({ to: '0x000000000000000000000000000000000000dEaD' })

    const result = await verifyPayment(req)

    expect(result.isValid).toBe(false)
    expect(result.invalidReason).toBe('invalid_exact_evm_payload_recipient_mismatch')
  })

  describe('non-EVM buyer networks', () => {
    // Solana and Stellar carry a chain-native authorization, so there is no
    // EIP-3009 signature to recover — but every other rule still applies.
    const solanaRequest = (over: Record<string, string> = {}) => ({
      x402Version: 2,
      paymentPayload: {
        payload: {
          authorization: {
            from: 'BuyerSolAddr',
            to: FACILITATOR_ADDRESSES['solana:mainnet'],
            value: '1000000',
            validAfter: '0',
            validBefore: '99999999999',
            nonce: 'sol-nonce-1',
            ...over,
          },
          signature: 'sol-native-authorization-blob',
        },
      },
      paymentRequirements: {
        scheme: 'exact',
        network: 'solana:mainnet',
        payTo: FACILITATOR_ADDRESSES['solana:mainnet'],
        amount: '1000000',
        extra: { merchantId: 'ab-test01' },
      },
    })

    test('accepts a chain-native authorization without EIP-3009 recovery', async () => {
      const result = await verifyPayment(solanaRequest())

      expect(result.isValid).toBe(true)
      expect(result.payer).toBe('BuyerSolAddr')
    })

    test('still enforces the amount match', async () => {
      const result = await verifyPayment(solanaRequest({ value: '1' }))

      expect(result.isValid).toBe(false)
      expect(result.invalidReason).toBe('invalid_exact_evm_payload_authorization_value_mismatch')
    })

    test('still enforces the validity window', async () => {
      const result = await verifyPayment(solanaRequest({ validBefore: '1000' }))

      expect(result.isValid).toBe(false)
      expect(result.invalidReason).toBe('invalid_exact_evm_payload_authorization_valid_before')
    })

    test('still requires a signature to be present', async () => {
      const req = solanaRequest()
      req.paymentPayload.payload.signature = ''

      const result = await verifyPayment(req)

      expect(result.isValid).toBe(false)
      expect(result.invalidReason).toBe('invalid_exact_evm_payload_signature')
    })
  })
})

describe('dispatchSettlement', () => {
  beforeEach(() => {
    resetAllMocks()
    mockDb.setSellers([TEST_SELLER])
  })

  test('starts sameChainSettle when buyer and seller share a network', async () => {
    const result = await dispatchSettlement(await buildPaymentRequest())

    expect(result.success).toBe(true)
    expect(mockTemporal.getStartedWorkflows()[0].name).toBe('sameChainSettle')
  })

  test('starts crossChainSettle when the networks differ', async () => {
    mockDb.setSellers([SOLANA_SELLER])

    const result = await dispatchSettlement(await buildPaymentRequest())

    expect(result.success).toBe(true)
    expect(mockTemporal.getStartedWorkflows()[0].name).toBe('crossChainSettle')
  })

  test('reports the on-chain pull hash as `transaction`, not the workflow id', async () => {
    const result = await dispatchSettlement(await buildPaymentRequest())

    expect(result.success).toBe(true)
    expect(result.transaction).toBe(TEST_PULL_TX)
    expect(result.transaction).not.toContain('same-')
    expect(result.workflowId).toStartWith('same-')
    expect(result.payer).toBe(TEST_BUYER_ADDRESS)
    expect(result.network).toBe('eip155:8453')
    expect(result.amount).toBe('1000000')
  })

  test('falls back to the workflow result when the status query never yields a hash', async () => {
    // A settlement that really happened must not be reported as a failure just
    // because the query side never surfaced the hash.
    mockTemporal.setQueryError(new Error('query failed: workflow closed'))
    mockTemporal.setResult({ success: true, pullTxHash: TEST_PULL_TX })

    const result = await dispatchSettlement(await buildPaymentRequest())

    expect(result.success).toBe(true)
    expect(result.transaction).toBe(TEST_PULL_TX)
  })

  test('reports a failure when the workflow completes with no hash anywhere', async () => {
    mockTemporal.setQueryError(new Error('query failed'))
    mockTemporal.setResult({ success: true })

    const result = await dispatchSettlement(await buildPaymentRequest())

    expect(result.success).toBe(false)
    expect(result.errorMessage).toContain('without a pull tx hash')
  })

  test('exposes the workflow id under extensions, where x402 clients keep it', async () => {
    const result = await dispatchSettlement(await buildPaymentRequest())

    const md = (result.extensions as { '402md': { workflowId: string } })['402md']
    expect(md.workflowId).toBe(result.workflowId as string)
    expect(md.workflowId).toStartWith('same-')
  })

  test('counts volume at dispatch so a slow settlement is not missed', async () => {
    mockTemporal.setStatus({ step: 'pulling' })
    mockTemporal.setNeverSettles()

    const result = await dispatchSettlement(await buildPaymentRequest())

    // The wait timed out, but the workflow is live and may still pull.
    expect(result.success).toBe(false)
    expect(mockRedis.incrby).toHaveBeenCalled()
  })

  test('does not report success when the workflow fails after being started', async () => {
    mockTemporal.setStatus({ step: 'pulling' })
    mockTemporal.setFailure(new Error('pull reverted: insufficient balance'))

    const result = await dispatchSettlement(await buildPaymentRequest())

    expect(result.success).toBe(false)
    expect(result.transaction).toBe('')
    expect(result.errorReason).toBe('unexpected_settle_error')
    expect(result.errorMessage).toContain('pull reverted')
  })

  test('does not report success when the workflow never captures the funds', async () => {
    mockTemporal.setStatus({ step: 'pulling' })
    mockTemporal.setNeverSettles()

    const result = await dispatchSettlement(await buildPaymentRequest())

    expect(result.success).toBe(false)
    expect(result.transaction).toBe('')
    expect(result.errorReason).toBe('unexpected_settle_error')
    // The workflow keeps running, so the caller is handed something to poll.
    expect(result.workflowId).toBeString()
  })

  test('does not count volume for a payment that never started a workflow', async () => {
    const req = await buildPaymentRequest()
    req.paymentPayload.payload.signature = '0xdeadbeef'

    await dispatchSettlement(req)

    expect(mockRedis.incrby).not.toHaveBeenCalled()
  })

  test('rejects an invalid payment without starting a workflow', async () => {
    const req = await buildPaymentRequest()
    req.paymentPayload.payload.signature = '0xdeadbeef'

    const result = await dispatchSettlement(req)

    expect(result.success).toBe(false)
    expect(result.errorReason).toBe('invalid_exact_evm_payload_signature')
    expect(mockTemporal.getStartedWorkflows()).toHaveLength(0)
  })

  test('answers with a payment reason for a malformed amount instead of throwing', async () => {
    const req = await buildPaymentRequest()
    req.paymentRequirements.amount = 'not-a-number'

    const result = await dispatchSettlement(req)

    expect(result.success).toBe(false)
    expect(result.errorReason).toBe('invalid_payment_requirements')
  })

  test('throws ReplayError for a signature that was already settled', async () => {
    const req = await buildPaymentRequest()
    mockRedis._store.set(`402md:replay:${req.paymentPayload.payload.signature}`, '1')

    await expect(dispatchSettlement(req)).rejects.toBeInstanceOf(ReplayError)
  })

  test('throws CircuitBreakerError when paused', async () => {
    mockRedis._store.set('402md:pause', 'true')

    await expect(dispatchSettlement(await buildPaymentRequest())).rejects.toBeInstanceOf(
      CircuitBreakerError,
    )
  })

  test('does not burn the replay key when the workflow fails to start', async () => {
    const req = await buildPaymentRequest()
    mockTemporal.setStartError(new Error('Temporal unreachable'))

    await expect(dispatchSettlement(req)).rejects.toThrow('Temporal unreachable')

    // The signature is untouched, so the buyer can be settled on a retry.
    expect(mockRedis._store.has(`402md:replay:${req.paymentPayload.payload.signature}`)).toBe(false)

    mockTemporal.setStartError(null)
    const retry = await dispatchSettlement(req)
    expect(retry.success).toBe(true)
  })

  test('keeps the replay key when the workflow started but settlement failed', async () => {
    const req = await buildPaymentRequest()
    mockTemporal.setStatus({ step: 'pulling' })
    mockTemporal.setFailure(new Error('pull reverted'))

    await dispatchSettlement(req)

    // The workflow is live and its id derives from this signature — a second
    // settle must not be able to start a parallel pull.
    await expect(dispatchSettlement(req)).rejects.toBeInstanceOf(ReplayError)
  })
})

describe('getFeeQuote', () => {
  test('returns the fee breakdown for a cross-chain quote', () => {
    const quote = getFeeQuote('eip155:8453', 'solana:mainnet', '1000000')

    expect(quote.gasAllowance).toBe('3500')
    expect(quote.platformFee).toBe('0')
    expect(quote.totalDeduction).toBe('3500')
    expect(quote.sellerReceives).toBe('996500')
    expect(quote.currency).toBe('USDC')
    expect(quote.decimals).toBe(6)
  })
})

describe('facilitator address fixture', () => {
  test('matches the configured facilitator address for Base', async () => {
    const req = await buildPaymentRequest()
    expect(req.paymentRequirements.payTo).toBe(FACILITATOR_ADDRESSES['eip155:8453'])
  })
})
