import { beforeEach, describe, expect, test } from 'bun:test'
import {
  resetAllMocks,
  mockDb,
  mockRedis,
  mockTemporal,
  TEST_SELLER,
  FACILITATOR_ADDRESSES,
} from '@/shared/test-helpers'
import { verifyPayment, dispatchSettlement, getFeeQuote } from './settlements.service'
import { ReplayError, CircuitBreakerError } from '@/shared/errors'

const validRequest = {
  paymentPayload: { signature: '0xValidSignature1234567890abcdef' },
  paymentRequirements: {
    scheme: 'exact',
    network: 'eip155:8453',
    payTo: '0xFacilitatorBase',
    maxAmountRequired: '1000000',
    extra: { merchantId: 'ab-test01' },
  },
}

describe('verifyPayment', () => {
  beforeEach(() => {
    resetAllMocks()
  })

  test('returns isValid true for valid payment', async () => {
    mockDb.setSellers([TEST_SELLER])

    const result = await verifyPayment(validRequest)

    expect(result).toEqual({ isValid: true })
  })

  test('returns isValid false when merchantId is missing', async () => {
    const req = {
      ...validRequest,
      paymentRequirements: {
        ...validRequest.paymentRequirements,
        extra: {},
      },
    }

    const result = await verifyPayment(req)

    expect(result.isValid).toBe(false)
    expect(result.reason).toContain('merchantId')
  })

  test('returns isValid false for unsupported network', async () => {
    mockDb.setSellers([TEST_SELLER])

    const req = {
      ...validRequest,
      paymentRequirements: {
        ...validRequest.paymentRequirements,
        network: 'eip155:1',
      },
    }

    const result = await verifyPayment(req)

    expect(result.isValid).toBe(false)
    expect(result.reason).toContain('Unsupported network')
  })

  test('returns isValid false when payTo does not match facilitator address', async () => {
    mockDb.setSellers([TEST_SELLER])

    const req = {
      ...validRequest,
      paymentRequirements: {
        ...validRequest.paymentRequirements,
        payTo: '0xWrongAddress',
      },
    }

    const result = await verifyPayment(req)

    expect(result.isValid).toBe(false)
    expect(result.reason).toContain('payTo')
  })
})

describe('dispatchSettlement', () => {
  beforeEach(() => {
    resetAllMocks()
    mockDb.setSellers([TEST_SELLER])
  })

  test('starts sameChainSettle when buyer and seller are on the same network', async () => {
    const req = {
      paymentPayload: { signature: '0xSameChainSig_aaaaaa1234567890' },
      paymentRequirements: {
        scheme: 'exact',
        network: 'eip155:8453',
        payTo: FACILITATOR_ADDRESSES['eip155:8453'],
        maxAmountRequired: '1000000',
        extra: { merchantId: 'ab-test01' },
      },
    }

    const result = await dispatchSettlement(req)

    expect(result.accepted).toBe(true)
    expect(result.type).toBe('SAME_CHAIN')

    const started = mockTemporal.getStartedWorkflows()
    expect(started).toHaveLength(1)
    expect(started[0].name).toBe('sameChainSettle')
  })

  test('starts crossChainSettle when buyer and seller are on different networks', async () => {
    const req = {
      paymentPayload: { signature: '0xCrossChainSig_bbbbb1234567890' },
      paymentRequirements: {
        scheme: 'exact',
        network: 'solana:mainnet',
        payTo: FACILITATOR_ADDRESSES['solana:mainnet'],
        maxAmountRequired: '1000000',
        extra: { merchantId: 'ab-test01' },
      },
    }

    const result = await dispatchSettlement(req)

    expect(result.accepted).toBe(true)
    expect(result.type).toBe('CROSS_CHAIN')

    const started = mockTemporal.getStartedWorkflows()
    expect(started).toHaveLength(1)
    expect(started[0].name).toBe('crossChainSettle')
  })

  test('throws ReplayError for duplicate signature', async () => {
    const sig = '0xReplaySig_ccccc123456789012345'
    mockRedis._store.set(`402md:replay:${sig}`, '1')

    const req = {
      paymentPayload: { signature: sig },
      paymentRequirements: {
        scheme: 'exact',
        network: 'eip155:8453',
        payTo: FACILITATOR_ADDRESSES['eip155:8453'],
        maxAmountRequired: '1000000',
        extra: { merchantId: 'ab-test01' },
      },
    }

    await expect(dispatchSettlement(req)).rejects.toBeInstanceOf(ReplayError)
  })

  test('throws CircuitBreakerError when paused', async () => {
    mockRedis._store.set('402md:pause', 'true')

    const req = {
      paymentPayload: { signature: '0xPausedSig_ddddd12345678901234' },
      paymentRequirements: {
        scheme: 'exact',
        network: 'eip155:8453',
        payTo: FACILITATOR_ADDRESSES['eip155:8453'],
        maxAmountRequired: '1000000',
        extra: { merchantId: 'ab-test01' },
      },
    }

    await expect(dispatchSettlement(req)).rejects.toBeInstanceOf(CircuitBreakerError)
  })
})

describe('getFeeQuote', () => {
  test('returns correct fee breakdown for cross-chain quote', () => {
    const quote = getFeeQuote('eip155:8453', 'solana:mainnet', '1000000')

    expect(quote.gasAllowance).toBe('800')
    expect(quote.platformFee).toBe('0')
    expect(quote.totalDeduction).toBe('800')
    expect(quote.sellerReceives).toBe('999200')
    expect(quote.currency).toBe('USDC')
    expect(quote.decimals).toBe(6)
  })
})
