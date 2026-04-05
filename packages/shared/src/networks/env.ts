import type { NetworkEnv } from './adapter.types'
import { base } from './chains/base'
import { solana } from './chains/solana'
import { stellar } from './chains/stellar'

export function resolveNetworkEnv(): NetworkEnv {
  const value = process.env.NETWORK_ENV
  if (value === undefined || value === '') return 'testnet'
  if (value !== 'mainnet' && value !== 'testnet') {
    throw new Error(`Invalid NETWORK_ENV="${value}". Must be "mainnet" or "testnet".`)
  }
  return value
}

const PRIVATE_KEY_ENV: Record<string, string> = {
  base: 'FACILITATOR_PRIVATE_KEY_BASE',
  solana: 'FACILITATOR_PRIVATE_KEY_SOLANA',
  stellar: 'FACILITATOR_PRIVATE_KEY_STELLAR',
}

export function validateNetworkEnv(opts?: { requirePrivateKeys?: boolean }): {
  ok: boolean
  missing: string[]
} {
  const env = resolveNetworkEnv()
  const chains = [base, solana, stellar]
  const missing: string[] = []

  for (const def of chains) {
    const cfg = def[env]
    if (cfg.rpcUrlDefault === null && !process.env[cfg.rpcUrlEnv]) {
      missing.push(cfg.rpcUrlEnv)
    }
    if (!process.env[cfg.facilitatorEnv]) {
      missing.push(cfg.facilitatorEnv)
    }
    if (opts?.requirePrivateKeys) {
      const pkEnv = PRIVATE_KEY_ENV[def.slug]
      if (!process.env[pkEnv]) {
        missing.push(pkEnv)
      }
    }
  }

  const unique = Array.from(new Set(missing))
  return { ok: unique.length === 0, missing: unique }
}
