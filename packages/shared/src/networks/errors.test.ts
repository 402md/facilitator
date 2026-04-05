import { describe, expect, test } from 'bun:test'
import { UnsupportedNetworkError } from './errors'

describe('UnsupportedNetworkError', () => {
  test('has correct name', () => {
    const err = new UnsupportedNetworkError('eip155:1', ['eip155:8453'])
    expect(err.name).toBe('UnsupportedNetworkError')
  })

  test('message includes attempted and supported networks', () => {
    const err = new UnsupportedNetworkError('eip155:1', ['eip155:8453', 'solana:mainnet'])
    expect(err.message).toContain('eip155:1')
    expect(err.message).toContain('eip155:8453')
    expect(err.message).toContain('solana:mainnet')
  })

  test('exposes attempted and supported as properties', () => {
    const err = new UnsupportedNetworkError('eip155:1', ['eip155:8453'])
    expect(err.attempted).toBe('eip155:1')
    expect(err.supported).toEqual(['eip155:8453'])
  })
})
