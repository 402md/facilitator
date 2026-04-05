import { describe, expect, test, afterEach } from 'bun:test'
import { resolveNetworkEnv } from './env'

describe('resolveNetworkEnv', () => {
  const original = process.env.NETWORK_ENV

  afterEach(() => {
    if (original === undefined) delete process.env.NETWORK_ENV
    else process.env.NETWORK_ENV = original
  })

  test('defaults to testnet when unset', () => {
    delete process.env.NETWORK_ENV
    expect(resolveNetworkEnv()).toBe('testnet')
  })

  test('defaults to testnet when empty string', () => {
    process.env.NETWORK_ENV = ''
    expect(resolveNetworkEnv()).toBe('testnet')
  })

  test('returns "mainnet" when set to mainnet', () => {
    process.env.NETWORK_ENV = 'mainnet'
    expect(resolveNetworkEnv()).toBe('mainnet')
  })

  test('returns "testnet" when set to testnet', () => {
    process.env.NETWORK_ENV = 'testnet'
    expect(resolveNetworkEnv()).toBe('testnet')
  })

  test('throws on invalid value', () => {
    process.env.NETWORK_ENV = 'prod'
    expect(() => resolveNetworkEnv()).toThrow('Invalid NETWORK_ENV="prod"')
  })
})
