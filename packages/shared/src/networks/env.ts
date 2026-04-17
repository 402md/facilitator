import type { ChainDefinition, ChainSlug, NetworkEnv } from './adapter.types'
import { base } from './chains/base'
import { ethereum } from './chains/ethereum'
import { optimism } from './chains/optimism'
import { arbitrum } from './chains/arbitrum'
import { linea } from './chains/linea'
import { unichain } from './chains/unichain'
import { worldchain } from './chains/worldchain'
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

// All EVM chains share one private key — same account maps to same 0x address on every EIP-155 chain.
const PRIVATE_KEY_ENV: Record<ChainSlug, string> = {
  base: 'FACILITATOR_PRIVATE_KEY_EVM',
  ethereum: 'FACILITATOR_PRIVATE_KEY_EVM',
  optimism: 'FACILITATOR_PRIVATE_KEY_EVM',
  arbitrum: 'FACILITATOR_PRIVATE_KEY_EVM',
  linea: 'FACILITATOR_PRIVATE_KEY_EVM',
  unichain: 'FACILITATOR_PRIVATE_KEY_EVM',
  worldchain: 'FACILITATOR_PRIVATE_KEY_EVM',
  solana: 'FACILITATOR_PRIVATE_KEY_SOLANA',
  stellar: 'FACILITATOR_PRIVATE_KEY_STELLAR',
}

/**
 * A chain is "enabled" when its FACILITATOR_* address env var is set.
 * Unconfigured chains are skipped entirely — boot does not fail, and they
 * simply don't appear in the registry. This lets the operator roll out new
 * chains incrementally: set the facilitator address + RPC URL for one chain
 * at a time, restart, done.
 */
export function isChainEnabled(def: ChainDefinition): boolean {
  const env = resolveNetworkEnv()
  const cfg = def[env]
  return Boolean(process.env[cfg.facilitatorEnv])
}

export function validateNetworkEnv(opts?: { requirePrivateKeys?: boolean }): {
  ok: boolean
  missing: string[]
} {
  const env = resolveNetworkEnv()
  const chains = [base, ethereum, optimism, arbitrum, linea, unichain, worldchain, solana, stellar]
  const missing: string[] = []

  for (const def of chains) {
    // Skip unconfigured chains entirely — they're disabled, not invalid.
    if (!isChainEnabled(def)) continue

    const cfg = def[env]
    if (cfg.rpcUrlDefault === null && !process.env[cfg.rpcUrlEnv]) {
      missing.push(cfg.rpcUrlEnv)
    }
    if (opts?.requirePrivateKeys) {
      const pkEnv = PRIVATE_KEY_ENV[def.slug]
      // Legacy fallback: FACILITATOR_PRIVATE_KEY_BASE is accepted as a substitute
      // for FACILITATOR_PRIVATE_KEY_EVM during the migration window.
      const legacyAccepted =
        pkEnv === 'FACILITATOR_PRIVATE_KEY_EVM' && Boolean(process.env.FACILITATOR_PRIVATE_KEY_BASE)
      if (!process.env[pkEnv] && !legacyAccepted) {
        missing.push(pkEnv)
      }
    }
  }

  const unique = Array.from(new Set(missing))
  return { ok: unique.length === 0, missing: unique }
}
