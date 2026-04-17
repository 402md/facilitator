import { describe, expect, test } from 'bun:test'
import '@/shared/test-helpers'
import { parseWindow, getCostComparison, RouteNotConfiguredError } from './aggregations'
import { toLimitOffset } from './bazaar.routes'

describe('parseWindow', () => {
  test('accepts 1d / 7d / 30d', () => {
    expect(parseWindow('1d')).toBe('1d')
    expect(parseWindow('7d')).toBe('7d')
    expect(parseWindow('30d')).toBe('30d')
  })

  test('defaults to 7d for unknown or missing', () => {
    expect(parseWindow(undefined)).toBe('7d')
    expect(parseWindow('')).toBe('7d')
    expect(parseWindow('42h')).toBe('7d')
    expect(parseWindow('2d')).toBe('7d')
  })
})

describe('getCostComparison', () => {
  test('returns three tiers with CCTP allowance from gas schedule', () => {
    const result = getCostComparison({
      buyerNetwork: 'eip155:8453',
      sellerNetwork: 'stellar:pubnet',
    })

    expect(result.buyerNetwork).toBe('eip155:8453')
    expect(result.sellerNetwork).toBe('stellar:pubnet')
    expect(result.tiers).toHaveLength(3)
    expect(result.tiers.map((t) => t.amount)).toEqual(['100000', '1000000', '100000000'])

    for (const tier of result.tiers) {
      expect(typeof tier.cctpAllowance).toBe('string')
      expect(typeof tier.percentAlternative).toBe('string')
      expect(typeof tier.savingsVsPercent).toBe('string')
      // savings = percentAlternative - cctpAllowance
      const expected = (BigInt(tier.percentAlternative) - BigInt(tier.cctpAllowance)).toString()
      expect(tier.savingsVsPercent).toBe(expected)
    }
  })

  test('percentAlternative respects the $0.10 floor for small amounts', () => {
    const result = getCostComparison({
      buyerNetwork: 'eip155:8453',
      sellerNetwork: 'stellar:pubnet',
    })
    const smallest = result.tiers[0]
    // $0.10 amount * 1% = $0.001, but the floor is $0.10 → percentAlternative = 100_000 micro-USDC
    expect(smallest.percentAlternative).toBe('100000')
  })

  test('percentAlternative scales at 1% above the floor', () => {
    const result = getCostComparison({
      buyerNetwork: 'eip155:8453',
      sellerNetwork: 'stellar:pubnet',
    })
    // $100 amount * 1% = $1.00 = 1_000_000 micro-USDC
    expect(result.tiers[2].percentAlternative).toBe('1000000')
  })

  test('includes documentation notes', () => {
    const result = getCostComparison({
      buyerNetwork: 'eip155:8453',
      sellerNetwork: 'stellar:pubnet',
    })
    expect(result.notes.cctpSource).toBe('gas-schedule.ts')
    expect(result.notes.percentAssumption).toContain('1%')
    expect(result.notes.percentAssumption).toContain('$0.10')
  })

  test('throws RouteNotConfiguredError for unsupported network', () => {
    expect(() =>
      getCostComparison({ buyerNetwork: 'eip155:999999', sellerNetwork: 'stellar:pubnet' }),
    ).toThrow(RouteNotConfiguredError)
  })
})

describe('RouteNotConfiguredError', () => {
  test('has code and statusCode fields for error-handling middleware', () => {
    const err = new RouteNotConfiguredError('eip155:8453', 'eip155:999999')
    expect(err.code).toBe('ROUTE_NOT_CONFIGURED')
    expect(err.statusCode).toBe(404)
    expect(err.message).toContain('eip155:8453')
    expect(err.message).toContain('eip155:999999')
  })
})

describe('toLimitOffset', () => {
  test('defaults when both undefined', () => {
    expect(toLimitOffset(undefined, undefined)).toEqual({ limit: 20, offset: 0 })
  })

  test('parses valid numeric strings', () => {
    expect(toLimitOffset('50', '10')).toEqual({ limit: 50, offset: 10 })
  })

  test('clamps limit to max 100', () => {
    expect(toLimitOffset('500', '0')).toEqual({ limit: 100, offset: 0 })
  })

  test('clamps limit to min 1', () => {
    expect(toLimitOffset('0', '0')).toEqual({ limit: 1, offset: 0 })
    expect(toLimitOffset('-5', '0')).toEqual({ limit: 1, offset: 0 })
  })

  test('clamps offset to min 0', () => {
    expect(toLimitOffset('20', '-10')).toEqual({ limit: 20, offset: 0 })
  })

  test('falls back to defaults when input is not a finite number', () => {
    // This is the NaN regression: Number('abc') = NaN, must not reach SQL
    expect(toLimitOffset('abc', 'xyz')).toEqual({ limit: 20, offset: 0 })
    expect(toLimitOffset('Infinity', 'NaN')).toEqual({ limit: 20, offset: 0 })
  })

  test('handles empty string as missing (falls back to defaults)', () => {
    expect(toLimitOffset('', '')).toEqual({ limit: 20, offset: 0 })
  })
})
