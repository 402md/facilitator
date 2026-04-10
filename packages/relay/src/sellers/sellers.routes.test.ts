import { describe, test, expect, beforeEach } from 'bun:test'
import { resetAllMocks, mockDb, TEST_SELLER } from '@/shared/test-helpers'
import { Elysia } from 'elysia'
import { sellersRoutes } from './sellers.routes'

const app = new Elysia()
  .onError(({ error, set, code }) => {
    if (code === 'VALIDATION') return
    if ('statusCode' in error && typeof error.statusCode === 'number') {
      set.status = error.statusCode
      return { error: (error as { code?: string }).code ?? 'ERROR', message: error.message }
    }
    set.status = 500
    return { error: 'INTERNAL_ERROR', message: 'Internal server error' }
  })
  .use(sellersRoutes)

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

describe('POST /register', () => {
  beforeEach(() => {
    resetAllMocks()
  })

  test('returns 201 with valid body', async () => {
    mockDb.setSellers([])

    const res = await app.handle(
      jsonPost('/register', { wallet: '0xNewWallet1234567890', network: 'eip155:8453' }),
    )

    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.merchantId).toBeDefined()
    expect(Object.keys(body.facilitatorAddresses)).toHaveLength(3)
    expect(typeof body.codeSnippet).toBe('string')
  })

  test('returns 400 for unsupported network', async () => {
    mockDb.setSellers([])

    const res = await app.handle(
      jsonPost('/register', { wallet: '0xNewWallet1234567890', network: 'eip155:1' }),
    )

    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBe('UNSUPPORTED_NETWORK')
  })

  test('returns 422 for missing wallet field', async () => {
    const res = await app.handle(jsonPost('/register', { network: 'eip155:8453' }))

    expect(res.status).toBe(422)
  })
})

describe('GET /discover', () => {
  beforeEach(() => {
    resetAllMocks()
  })

  test('returns 200 with discovery config for valid merchantId', async () => {
    mockDb.setSellers([TEST_SELLER])

    const res = await app.handle(jsonGet('/discover?merchantId=ab-test01'))

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.merchantId).toBe('ab-test01')
    expect(body.acceptedNetworks).toHaveLength(3)
    expect(body.sellerNetwork).toBe('eip155:8453')
    expect(body.gasFree).toBe(true)
  })

  test('returns 404 for nonexistent merchantId', async () => {
    mockDb.setSellers([])

    const res = await app.handle(jsonGet('/discover?merchantId=invalid'))

    expect(res.status).toBe(404)
    const body = await res.json()
    expect(body.error).toBe('SELLER_NOT_FOUND')
  })
})

describe('GET /supported', () => {
  test('returns 200 with x402 supported kinds', async () => {
    const res = await app.handle(jsonGet('/supported'))

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.kinds).toHaveLength(3)
    expect(body.extensions).toEqual([])
    expect(body.signers).toEqual({})

    const networkIds = body.kinds.map((k: { network: string }) => k.network)
    expect(networkIds).toContain('eip155:8453')
    expect(networkIds).toContain('solana:mainnet')
    expect(networkIds).toContain('stellar:pubnet')

    for (const kind of body.kinds) {
      expect(kind.x402Version).toBe(2)
      expect(kind.scheme).toBe('exact')
    }
  })
})

describe('GET /.well-known/x402.json', () => {
  test('returns 200 with facilitator metadata', async () => {
    const res = await app.handle(jsonGet('/.well-known/x402.json'))

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.version).toBe('2')
    expect(body.facilitator.name).toBe('402md Facilitator')
    expect(body.facilitator.networks).toHaveLength(3)
    expect(body.facilitator.crossChain).toBe(true)
    expect(body.facilitator.bridgeProvider).toBe('circle-cctp-v2')
  })
})
