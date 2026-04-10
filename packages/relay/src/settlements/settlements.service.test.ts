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
  x402Version: 2,
  paymentPayload: { payload: { signature: '0xValidSignature1234567890abcdef' } },
  paymentRequirements: {
    scheme: 'exact',
    network: 'eip155:8453',
    payTo: '0xFacilitatorBase',
    amount: '1000000',
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
    expect(result.invalidReason).toContain('merchantId')
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
    expect(result.invalidReason).toContain('Unsupported network')
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
    expect(result.invalidReason).toContain('payTo')
  })
})

describe('dispatchSettlement', () => {
  beforeEach(() => {
    resetAllMocks()
    mockDb.setSellers([TEST_SELLER])
  })

  test('starts sameChainSettle when buyer and seller are on the same network', async () => {
    const req = {
      x402Version: 2,
      paymentPayload: {
        payload: {
          authorization: {
            from: '0xBuyerAddr',
            to: '0xFacilitatorBase',
            value: '1000000',
            validAfter: '0',
            validBefore: '9999999999',
            nonce: '0x1',
          },
          signature: '0xSameChainSig_aaaaaa1234567890',
        },
      },
      paymentRequirements: {
        scheme: 'exact',
        network: 'eip155:8453',
        payTo: FACILITATOR_ADDRESSES['eip155:8453'],
        amount: '1000000',
        extra: { merchantId: 'ab-test01' },
      },
    }

    const result = await dispatchSettlement(req)

    expect(result.success).toBe(true)
    expect(result.network).toBe('eip155:8453')
    expect(result.transaction).toBeString()

    const started = mockTemporal.getStartedWorkflows()
    expect(started).toHaveLength(1)
    expect(started[0].name).toBe('sameChainSettle')
  })

  test('starts crossChainSettle when buyer and seller are on different networks', async () => {
    const req = {
      x402Version: 2,
      paymentPayload: {
        payload: {
          authorization: {
            from: '0xBuyerAddr',
            to: '0xFacilitatorSol',
            value: '1000000',
            validAfter: '0',
            validBefore: '9999999999',
            nonce: '0x1',
          },
          signature: '0xCrossChainSig_bbbbb1234567890',
        },
      },
      paymentRequirements: {
        scheme: 'exact',
        network: 'solana:mainnet',
        payTo: FACILITATOR_ADDRESSES['solana:mainnet'],
        amount: '1000000',
        extra: { merchantId: 'ab-test01' },
      },
    }

    const result = await dispatchSettlement(req)

    expect(result.success).toBe(true)
    expect(result.network).toBe('solana:mainnet')
    expect(result.transaction).toBeString()

    const started = mockTemporal.getStartedWorkflows()
    expect(started).toHaveLength(1)
    expect(started[0].name).toBe('crossChainSettle')
  })

  test('throws ReplayError for duplicate signature', async () => {
    const sig = '0xReplaySig_ccccc123456789012345'
    mockRedis._store.set(`402md:replay:${sig}`, '1')

    const req = {
      x402Version: 2,
      paymentPayload: { payload: { signature: sig } },
      paymentRequirements: {
        scheme: 'exact',
        network: 'eip155:8453',
        payTo: FACILITATOR_ADDRESSES['eip155:8453'],
        amount: '1000000',
        extra: { merchantId: 'ab-test01' },
      },
    }

    await expect(dispatchSettlement(req)).rejects.toBeInstanceOf(ReplayError)
  })

  test('throws CircuitBreakerError when paused', async () => {
    mockRedis._store.set('402md:pause', 'true')

    const req = {
      x402Version: 2,
      paymentPayload: { payload: { signature: '0xPausedSig_ddddd12345678901234' } },
      paymentRequirements: {
        scheme: 'exact',
        network: 'eip155:8453',
        payTo: FACILITATOR_ADDRESSES['eip155:8453'],
        amount: '1000000',
        extra: { merchantId: 'ab-test01' },
      },
    }

    await expect(dispatchSettlement(req)).rejects.toBeInstanceOf(CircuitBreakerError)
  })
})

describe('getFeeQuote', () => {
  test('returns correct fee breakdown for cross-chain quote', () => {
    const quote = getFeeQuote('eip155:8453', 'solana:mainnet', '1000000')

    expect(quote.gasAllowance).toBe('3500')
    expect(quote.platformFee).toBe('0')
    expect(quote.totalDeduction).toBe('3500')
    expect(quote.sellerReceives).toBe('996500')
    expect(quote.currency).toBe('USDC')
    expect(quote.decimals).toBe(6)
  })
})
