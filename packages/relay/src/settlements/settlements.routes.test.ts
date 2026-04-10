import { beforeEach, describe, expect, test } from 'bun:test'
import {
  resetAllMocks,
  mockDb,
  mockRedis,
  mockTemporal,
  TEST_SELLER,
  FACILITATOR_ADDRESSES,
} from '@/shared/test-helpers'
import { Elysia } from 'elysia'
import { settlementsRoutes } from './settlements.routes'

const app = new Elysia()
  .onError(({ error, set }) => {
    if ('statusCode' in error && typeof error.statusCode === 'number') {
      set.status = error.statusCode
      return { error: (error as { code?: string }).code ?? 'ERROR', message: error.message }
    }
    set.status = 500
    return { error: 'INTERNAL_ERROR', message: 'Internal server error' }
  })
  .use(settlementsRoutes)

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

describe('POST /verify', () => {
  beforeEach(() => {
    resetAllMocks()
  })

  test('returns 200 with isValid true for a valid payment', async () => {
    mockDb.setSellers([TEST_SELLER])

    const res = await app.handle(
      new Request('http://localhost/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(validRequest),
      }),
    )

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.isValid).toBe(true)
  })
})

describe('POST /settle', () => {
  beforeEach(() => {
    resetAllMocks()
  })

  test('returns 200 with success for a valid settlement', async () => {
    mockDb.setSellers([TEST_SELLER])

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
          signature: '0xSettleRouteSig_aaaa1234567890',
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

    const res = await app.handle(
      new Request('http://localhost/settle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(req),
      }),
    )

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(body.transaction).toBeString()
    expect(body.network).toBe('eip155:8453')
  })

  test('returns 409 for a replayed transaction', async () => {
    mockDb.setSellers([TEST_SELLER])
    const sig = '0xReplayRouteSig_bbbb1234567890ab'
    mockRedis._store.set(`402md:replay:${sig}`, '1')

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
          signature: sig,
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

    const res = await app.handle(
      new Request('http://localhost/settle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(req),
      }),
    )

    expect(res.status).toBe(409)
    const body = await res.json()
    expect(body.error).toBe('REPLAY_DETECTED')
  })

  test('returns 503 when circuit breaker is active', async () => {
    mockDb.setSellers([TEST_SELLER])
    mockRedis._store.set('402md:pause', 'true')

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
          signature: '0xPausedRouteSig_cccc1234567890',
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

    const res = await app.handle(
      new Request('http://localhost/settle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(req),
      }),
    )

    expect(res.status).toBe(503)
    const body = await res.json()
    expect(body.error).toBe('CIRCUIT_BREAKER')
  })
})

describe('GET /bridge/status/:id', () => {
  beforeEach(() => {
    resetAllMocks()
  })

  test('returns 200 with workflow status', async () => {
    mockTemporal.setStatus({ status: 'settled', steps: {} })

    const res = await app.handle(new Request('http://localhost/bridge/status/cross-abc-123'))

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.status).toBe('settled')
  })
})

describe('GET /bridge/fees', () => {
  beforeEach(() => {
    resetAllMocks()
  })

  test('returns 200 with fee quote', async () => {
    const res = await app.handle(
      new Request('http://localhost/bridge/fees?from=eip155:8453&to=solana:mainnet&amount=1000000'),
    )

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.gasAllowance).toBe('3500')
    expect(body.platformFee).toBe('0')
    expect(body.sellerReceives).toBe('996500')
    expect(body.currency).toBe('USDC')
  })
})
