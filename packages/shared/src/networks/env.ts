import type { NetworkEnv } from './adapter.types'

export function resolveNetworkEnv(): NetworkEnv {
  const value = process.env.NETWORK_ENV
  if (value === undefined || value === '') return 'testnet'
  if (value !== 'mainnet' && value !== 'testnet') {
    throw new Error(`Invalid NETWORK_ENV="${value}". Must be "mainnet" or "testnet".`)
  }
  return value
}
