import { describe, test, expect, beforeEach } from 'bun:test'
import { resetAllMocks, mockDb, TEST_SELLER, FACILITATOR_ADDRESSES } from '@/shared/test-helpers'
import { registerSeller, getDiscovery } from './sellers.service'

describe('registerSeller', () => {
  beforeEach(() => {
    resetAllMocks()
  })

  test('creates new seller and returns merchantId, facilitatorAddresses, codeSnippet', async () => {
    mockDb.setSellers([])

    const result = await registerSeller({ wallet: '0xNewWallet1234567890', network: 'eip155:8453' })

    expect(typeof result.merchantId).toBe('string')
    expect(result.merchantId.length).toBeGreaterThan(0)
    expect(Object.keys(result.facilitatorAddresses)).toHaveLength(3)
    expect(result.facilitatorAddresses).toEqual(FACILITATOR_ADDRESSES)
    expect(typeof result.codeSnippet).toBe('string')
    expect(result.codeSnippet).toContain(result.merchantId)
  })

  test('throws InvalidPaymentError for unsupported network', async () => {
    mockDb.setSellers([])

    expect(
      registerSeller({ wallet: '0xNewWallet1234567890', network: 'eip155:1' }),
    ).rejects.toThrow('Unsupported network')
  })

  test('returns existing seller when wallet already registered', async () => {
    mockDb.setSellers([TEST_SELLER])

    const result = await registerSeller({
      wallet: TEST_SELLER.walletAddress,
      network: TEST_SELLER.network,
    })

    expect(result.merchantId).toBe(TEST_SELLER.merchantId)
    expect(result.wallet).toBe(TEST_SELLER.walletAddress)
    expect(result.network).toBe(TEST_SELLER.network)
  })
})

describe('getDiscovery', () => {
  beforeEach(() => {
    resetAllMocks()
  })

  test('returns multi-chain config with 3 accepted networks', async () => {
    mockDb.setSellers([TEST_SELLER])

    const result = await getDiscovery('ab-test01')

    expect(result.acceptedNetworks).toHaveLength(3)
    expect(result.sellerNetwork).toBe('eip155:8453')
    expect(result.gasFree).toBe(true)
    expect(result.merchantId).toBe('ab-test01')

    const networks = result.acceptedNetworks.map((n) => n.network)
    expect(networks).toContain('eip155:8453')
    expect(networks).toContain('solana:mainnet')
    expect(networks).toContain('stellar:pubnet')
  })

  test('throws SellerNotFoundError for nonexistent merchantId', async () => {
    mockDb.setSellers([])

    expect(getDiscovery('nonexistent')).rejects.toThrow('Seller not found')
  })
})
