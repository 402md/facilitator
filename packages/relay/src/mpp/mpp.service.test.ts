import { describe, test, expect, beforeEach } from 'bun:test'
import { resetAllMocks, mockDb, mockRedis, mockTemporal, TEST_SELLER } from '@/shared/test-helpers'
import { getMppConfig, verifyCharge, settleCharge, handleSessionAction } from './mpp.service'

describe('getMppConfig', () => {
  beforeEach(() => {
    resetAllMocks()
  })

  test('returns config with addresses for all chains', async () => {
    mockDb.setSellers([TEST_SELLER])

    const config = await getMppConfig('ab-test01')

    expect(config.merchantId).toBe('ab-test01')
    expect(config.sellerNetwork).toBe('eip155:8453')
    expect(config.stellar.recipient).toBeDefined()
    expect(config.solana.recipient).toBeDefined()
    expect(config.evm.recipient).toBeDefined()
  })

  test('throws SellerNotFoundError for unknown merchantId', async () => {
    mockDb.setSellers([])

    expect(getMppConfig('nonexistent')).rejects.toThrow('Seller not found')
  })
})

describe('verifyCharge', () => {
  beforeEach(() => {
    resetAllMocks()
  })

  test('returns valid for new transaction', async () => {
    mockDb.setSellers([TEST_SELLER])

    const result = await verifyCharge('ab-test01', {
      method: 'stellar',
      intent: 'charge',
      txHash: '0xabc123',
      challengeId: 'ch-1',
      amount: '1000000',
      buyerNetwork: 'stellar:pubnet',
    })

    expect(result.valid).toBe(true)
    expect(result.txHash).toBe('0xabc123')
  })

  test('detects replay for duplicate txHash', async () => {
    mockDb.setSellers([TEST_SELLER])
    mockRedis._store.set('402md:replay:mpp:0xdup123', '1')

    const result = await verifyCharge('ab-test01', {
      method: 'stellar',
      intent: 'charge',
      txHash: '0xdup123',
      challengeId: 'ch-1',
      amount: '1000000',
      buyerNetwork: 'stellar:pubnet',
    })

    expect(result.valid).toBe(false)
    expect(result.error).toBe('Duplicate transaction')
  })
})

describe('settleCharge', () => {
  beforeEach(() => {
    resetAllMocks()
  })

  test('starts same-chain workflow when buyer and seller on same network', async () => {
    mockDb.setSellers([TEST_SELLER])

    const result = await settleCharge('ab-test01', {
      method: 'evm',
      intent: 'charge',
      txHash: '0xsettle123',
      amount: '1000000',
      buyerNetwork: 'eip155:8453',
    })

    expect(result.accepted).toBe(true)
    expect(result.type).toBe('SAME_CHAIN')

    const started = mockTemporal.getStartedWorkflows()
    expect(started).toHaveLength(1)
    expect(started[0].name).toBe('sameChainSettle')
  })

  test('starts cross-chain workflow when buyer and seller on different networks', async () => {
    mockDb.setSellers([TEST_SELLER])

    const result = await settleCharge('ab-test01', {
      method: 'evm',
      intent: 'charge',
      txHash: '0xsettle456',
      amount: '1000000',
      buyerNetwork: 'solana:mainnet',
    })

    expect(result.accepted).toBe(true)
    expect(result.type).toBe('CROSS_CHAIN')

    const started = mockTemporal.getStartedWorkflows()
    expect(started).toHaveLength(1)
    expect(started[0].name).toBe('crossChainSettle')
  })
})

describe('handleSessionAction', () => {
  beforeEach(() => {
    resetAllMocks()
    mockDb.setSellers([TEST_SELLER])
  })

  test('open creates session and returns valid with txHash', async () => {
    const result = await handleSessionAction('ab-test01', {
      method: 'stellar',
      intent: 'session',
      action: 'open',
      challengeId: 'ch-open',
      amount: '5000000',
      buyerNetwork: 'stellar:pubnet',
      channelAddress: 'ch-1',
    })

    expect(result.valid).toBe(true)
    expect(typeof result.txHash).toBe('string')
    expect(result.txHash!.length).toBeGreaterThan(0)
  })

  test('voucher validates cumulative amount within budget', async () => {
    const result = await handleSessionAction('ab-test01', {
      method: 'stellar',
      intent: 'session',
      action: 'voucher',
      challengeId: 'ch-v1',
      amount: '5000000',
      buyerNetwork: 'stellar:pubnet',
      channelAddress: 'ch-1',
      cumulativeAmount: '500000',
      signature: 'sig-1',
    })

    expect(result.valid).toBe(true)
    expect(result.acceptedCumulative).toBe('500000')
  })

  test('voucher rejects cumulative amount exceeding budget', async () => {
    const result = await handleSessionAction('ab-test01', {
      method: 'stellar',
      intent: 'session',
      action: 'voucher',
      challengeId: 'ch-v2',
      amount: '5000000',
      buyerNetwork: 'stellar:pubnet',
      channelAddress: 'ch-2',
      cumulativeAmount: '6000000',
      signature: 'sig-2',
    })

    expect(result.valid).toBe(false)
    expect(result.error).toContain('budget')
  })

  test('voucher rejects duplicate signature', async () => {
    mockRedis._store.set('402md:voucher:ch-dup:sig-dup', '1')

    const result = await handleSessionAction('ab-test01', {
      method: 'stellar',
      intent: 'session',
      action: 'voucher',
      challengeId: 'ch-v3',
      amount: '5000000',
      buyerNetwork: 'stellar:pubnet',
      channelAddress: 'ch-dup',
      cumulativeAmount: '500000',
      signature: 'sig-dup',
    })

    expect(result.valid).toBe(false)
    expect(result.error).toContain('Duplicate')
  })

  test('close starts batchSessionSettle workflow', async () => {
    mockRedis._store.set('402md:session:ch-close', '1000000')

    const result = await handleSessionAction('ab-test01', {
      method: 'stellar',
      intent: 'session',
      action: 'close',
      challengeId: 'ch-c1',
      amount: '5000000',
      buyerNetwork: 'stellar:pubnet',
      channelAddress: 'ch-close',
    })

    expect(result.valid).toBe(true)
    expect(result.workflowId).toContain('mpp-batch')

    const started = mockTemporal.getStartedWorkflows()
    expect(started).toHaveLength(1)
    expect(started[0].name).toBe('batchSessionSettle')
  })
})
