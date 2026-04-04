import { describe, test, expect, beforeEach } from 'bun:test'
import { resetAllMocks, mockDb, TEST_SELLER } from '@/shared/test-helpers'
import { Elysia } from 'elysia'
import { mppRoutes } from './mpp.routes'

const app = new Elysia()
  .onError(({ error, set }) => {
    if ('statusCode' in error && typeof error.statusCode === 'number') {
      set.status = error.statusCode
      return { error: (error as { code?: string }).code ?? 'ERROR', message: error.message }
    }
    set.status = 500
    return { error: 'INTERNAL_ERROR', message: 'Internal server error' }
  })
  .use(mppRoutes)

function jsonPost(path: string, body: unknown) {
  return new Request(`http://localhost${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

function jsonGet(path: string) {
  return new Request(`http://localhost${path}`)
}

describe('GET /merchants/:merchantId/mpp/config', () => {
  beforeEach(() => {
    resetAllMocks()
  })

  test('returns 200 with config for valid merchantId', async () => {
    mockDb.setSellers([TEST_SELLER])

    const res = await app.handle(jsonGet('/merchants/ab-test01/mpp/config'))

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.merchantId).toBe('ab-test01')
    expect(body.stellar.recipient).toBeDefined()
    expect(body.solana.recipient).toBeDefined()
    expect(body.evm.recipient).toBeDefined()
  })

  test('returns 404 for nonexistent merchantId', async () => {
    mockDb.setSellers([])

    const res = await app.handle(jsonGet('/merchants/nonexistent/mpp/config'))

    expect(res.status).toBe(404)
    const body = await res.json()
    expect(body.error).toBe('SELLER_NOT_FOUND')
  })
})

describe('POST /merchants/:merchantId/mpp/verify', () => {
  beforeEach(() => {
    resetAllMocks()
    mockDb.setSellers([TEST_SELLER])
  })

  test('returns 200 for charge verification', async () => {
    const res = await app.handle(
      jsonPost('/merchants/ab-test01/mpp/verify', {
        method: 'stellar',
        intent: 'charge',
        txHash: '0xverify1',
        challengeId: 'ch-1',
        amount: '1000000',
        buyerNetwork: 'stellar:pubnet',
      }),
    )

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.valid).toBe(true)
    expect(body.txHash).toBe('0xverify1')
  })

  test('returns 200 for session open action', async () => {
    const res = await app.handle(
      jsonPost('/merchants/ab-test01/mpp/verify', {
        method: 'stellar',
        intent: 'session',
        action: 'open',
        challengeId: 'ch-2',
        amount: '5000000',
        buyerNetwork: 'stellar:pubnet',
        channelAddress: 'ch-sess-1',
      }),
    )

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.valid).toBe(true)
    expect(body.txHash).toBeDefined()
  })
})

describe('POST /merchants/:merchantId/mpp/settle', () => {
  beforeEach(() => {
    resetAllMocks()
    mockDb.setSellers([TEST_SELLER])
  })

  test('returns 200 with settlement accepted', async () => {
    const res = await app.handle(
      jsonPost('/merchants/ab-test01/mpp/settle', {
        method: 'evm',
        intent: 'charge',
        txHash: '0xsettle1',
        amount: '1000000',
        buyerNetwork: 'eip155:8453',
      }),
    )

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.accepted).toBe(true)
    expect(body.workflowId).toBeDefined()
    expect(body.type).toBe('SAME_CHAIN')
  })
})
