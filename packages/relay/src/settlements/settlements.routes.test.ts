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
  paymentPayload: { signature: '0xValidSignature1234567890abcdef' },
  paymentRequirements: {
    scheme: 'exact',
    network: 'eip155:8453',
    payTo: '0xFacilitatorBase',
    maxAmountRequired: '1000000',
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

  test('returns 200 with workflowId for a valid settlement', async () => {
    mockDb.setSellers([TEST_SELLER])

    const req = {
      paymentPayload: { signature: '0xSettleRouteSig_aaaa1234567890' },
      paymentRequirements: {
        scheme: 'exact',
        network: 'eip155:8453',
        payTo: FACILITATOR_ADDRESSES['eip155:8453'],
        maxAmountRequired: '1000000',
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
    expect(body.accepted).toBe(true)
    expect(body.workflowId).toBeString()
  })

  test('returns 409 for a replayed transaction', async () => {
    mockDb.setSellers([TEST_SELLER])
    const sig = '0xReplayRouteSig_bbbb1234567890ab'
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
      paymentPayload: { signature: '0xPausedRouteSig_cccc1234567890' },
      paymentRequirements: {
        scheme: 'exact',
        network: 'eip155:8453',
        payTo: FACILITATOR_ADDRESSES['eip155:8453'],
        maxAmountRequired: '1000000',
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
    expect(body.gasAllowance).toBe('800')
    expect(body.platformFee).toBe('0')
    expect(body.sellerReceives).toBe('999200')
    expect(body.currency).toBe('USDC')
  })
})
