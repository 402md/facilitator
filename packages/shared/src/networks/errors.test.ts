import { describe, expect, test } from 'bun:test'
import { UnsupportedNetworkError } from './errors'

describe('UnsupportedNetworkError', () => {
  test('has correct name', () => {
    const err = new UnsupportedNetworkError('eip155:1', ['eip155:8453'])
    expect(err.name).toBe('UnsupportedNetworkError')
  })

  test('message includes attempted network', () => {
    const err = new UnsupportedNetworkError('eip155:1', ['eip155:8453', 'solana:mainnet'])
    expect(err.message).toContain('eip155:1')
  })

  test('exposes attempted and supported as properties', () => {
    const err = new UnsupportedNetworkError('eip155:1', ['eip155:8453'])
    expect(err.attempted).toBe('eip155:1')
    expect(err.supported).toEqual(['eip155:8453'])
  })

  test('carries HTTP statusCode and error code for relay error handler', () => {
    const err = new UnsupportedNetworkError('eip155:1', ['eip155:8453'])
    expect(err.statusCode).toBe(400)
    expect(err.code).toBe('UNSUPPORTED_NETWORK')
    expect(err.details.supportedNetworks).toEqual(['eip155:8453'])
  })
})
