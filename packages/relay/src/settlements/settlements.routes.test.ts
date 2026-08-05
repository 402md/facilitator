import { beforeEach, describe, expect, test } from 'bun:test'
import {
  resetAllMocks,
  mockDb,
  mockRedis,
  mockTemporal,
  buildPaymentRequest,
  TEST_BUYER_ADDRESS,
  TEST_PULL_TX,
  TEST_SELLER,
} from '@/shared/test-helpers'
import { Elysia } from 'elysia'
import { settlementsRoutes } from './settlements.routes'

// See the note in settlements.service.test.ts — deliberately not cleaned up.
process.env.SETTLE_WAIT_TIMEOUT_MS = '300'
process.env.SETTLE_POLL_INTERVAL_MS = '20'

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

const post = (path: string, body: unknown) =>
  app.handle(
    new Request(`http://localhost${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }),
  )

describe('POST /verify', () => {
  beforeEach(() => {
    resetAllMocks()
    mockDb.setSellers([TEST_SELLER])
  })

  test('returns 200 with isValid true for a valid payment', async () => {
    const res = await post('/verify', await buildPaymentRequest())

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.isValid).toBe(true)
    expect(body.payer).toBe(TEST_BUYER_ADDRESS)
  })

  test('returns 200 with isValid false and a spec error code for a bad signature', async () => {
    const req = await buildPaymentRequest()
    req.paymentPayload.payload.signature = '0xnotasignature'

    const res = await post('/verify', req)

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.isValid).toBe(false)
    expect(body.invalidReason).toBe('invalid_exact_evm_payload_signature')
    expect(body.invalidMessage).toBeString()
  })
})

describe('POST /settle', () => {
  beforeEach(() => {
    resetAllMocks()
    mockDb.setSellers([TEST_SELLER])
  })

  test('returns 200 with the capture tx hash for a settled payment', async () => {
    const res = await post('/settle', await buildPaymentRequest())

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(body.transaction).toBe(TEST_PULL_TX)
    expect(body.network).toBe('eip155:8453')
    expect(body.payer).toBe(TEST_BUYER_ADDRESS)
  })

  test('returns 200 with success false when the workflow fails', async () => {
    mockTemporal.setStatus({ step: 'pulling' })
    mockTemporal.setFailure(new Error('pull reverted'))

    const res = await post('/settle', await buildPaymentRequest())

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(false)
    expect(body.transaction).toBe('')
    expect(body.errorReason).toBe('unexpected_settle_error')
    expect(body.workflowId).toBeString()
  })

  test('returns 200 with success false for an invalid payment', async () => {
    const req = await buildPaymentRequest()
    req.paymentPayload.payload.signature = '0xnotasignature'

    const res = await post('/settle', req)

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(false)
    expect(body.errorReason).toBe('invalid_exact_evm_payload_signature')
  })

  test('returns 409 for a replayed transaction', async () => {
    const req = await buildPaymentRequest()
    mockRedis._store.set(`402md:replay:${req.paymentPayload.payload.signature}`, '1')

    const res = await post('/settle', req)

    expect(res.status).toBe(409)
    expect((await res.json()).error).toBe('REPLAY_DETECTED')
  })

  test('returns 503 when the circuit breaker is active', async () => {
    mockRedis._store.set('402md:pause', 'true')

    const res = await post('/settle', await buildPaymentRequest())

    expect(res.status).toBe(503)
    expect((await res.json()).error).toBe('CIRCUIT_BREAKER')
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
    expect((await res.json()).status).toBe('settled')
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
