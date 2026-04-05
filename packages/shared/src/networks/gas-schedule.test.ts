import { describe, expect, test } from 'bun:test'
import { getGasAllowanceBySlug, calculateFeesBySlug, getCctpDomainBySlug } from './gas-schedule'

describe('getGasAllowanceBySlug', () => {
  test('returns 800 for base -> solana', () => {
    expect(getGasAllowanceBySlug('base', 'solana')).toBe('800')
  })

  test('returns 500 for stellar -> base', () => {
    expect(getGasAllowanceBySlug('stellar', 'base')).toBe('500')
  })

  test('returns 400 for same-chain base -> base', () => {
    expect(getGasAllowanceBySlug('base', 'base')).toBe('400')
  })

  test('throws for unknown pair', () => {
    expect(() => getGasAllowanceBySlug('arbitrum' as never, 'solana')).toThrow(
      'No gas schedule for arbitrum->solana',
    )
  })
})

describe('getCctpDomainBySlug', () => {
  test('returns correct domain per chain', () => {
    expect(getCctpDomainBySlug('base')).toBe(6)
    expect(getCctpDomainBySlug('solana')).toBe(5)
    expect(getCctpDomainBySlug('stellar')).toBe(7)
  })
})

describe('calculateFeesBySlug', () => {
  test('with platformFeeBps=0 returns net = gross - gasAllowance', () => {
    const result = calculateFeesBySlug('10000', 'base', 'solana', 0)
    expect(result.gasAllowance).toBe('800')
    expect(result.platformFee).toBe('0')
    expect(result.netAmount).toBe('9200')
  })

  test('with platformFeeBps=50 deducts gas + platform fee', () => {
    const result = calculateFeesBySlug('10000', 'base', 'solana', 50)
    expect(result.gasAllowance).toBe('800')
    expect(result.platformFee).toBe('50')
    expect(result.netAmount).toBe('9150')
  })
})
