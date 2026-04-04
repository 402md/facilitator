import { describe, expect, test } from 'bun:test'
import { calculateFees, getCctpDomain, getGasAllowance } from '@/shared/gas-schedule'

describe('getGasAllowance', () => {
  test('returns 800 for eip155:8453 -> solana:mainnet', () => {
    expect(getGasAllowance('eip155:8453', 'solana:mainnet')).toBe('800')
  })

  test('returns 500 for stellar:pubnet -> eip155:8453', () => {
    expect(getGasAllowance('stellar:pubnet', 'eip155:8453')).toBe('500')
  })

  test('throws for unsupported chain pair', () => {
    expect(() => getGasAllowance('eip155:1', 'solana:mainnet')).toThrow(
      'No gas schedule for eip155:1->solana:mainnet',
    )
  })
})

describe('getCctpDomain', () => {
  test('returns correct domain for each supported network', () => {
    expect(getCctpDomain('eip155:8453')).toBe(6)
    expect(getCctpDomain('solana:mainnet')).toBe(5)
    expect(getCctpDomain('stellar:pubnet')).toBe(7)
  })
})

describe('calculateFees', () => {
  test('with platformFeeBps=0 returns net = gross - gasAllowance', () => {
    const result = calculateFees('10000', 'eip155:8453', 'solana:mainnet', 0)
    expect(result.gasAllowance).toBe('800')
    expect(result.platformFee).toBe('0')
    expect(result.netAmount).toBe('9200')
  })

  test('with platformFeeBps=50 deducts correct platform fee and gas', () => {
    // gross=10000, gas=800, platformFee = 10000 * 50 / 10000 = 50
    // net = 10000 - 800 - 50 = 9150
    const result = calculateFees('10000', 'eip155:8453', 'solana:mainnet', 50)
    expect(result.gasAllowance).toBe('800')
    expect(result.platformFee).toBe('50')
    expect(result.netAmount).toBe('9150')
  })
})
