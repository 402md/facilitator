import type { ChainAdapter, ChainDefinition, EnvConfig, ResolvedNetwork } from './adapter.types'
import { isChainEnabled, resolveNetworkEnv } from './env'
import { UnsupportedNetworkError } from './errors'
import { base } from './chains/base'
import { ethereum } from './chains/ethereum'
import { optimism } from './chains/optimism'
import { arbitrum } from './chains/arbitrum'
import { linea } from './chains/linea'
import { unichain } from './chains/unichain'
import { worldchain } from './chains/worldchain'
import { solana } from './chains/solana'
import { stellar } from './chains/stellar'
import { getGasAllowanceBySlug, getCctpDomainBySlug, calculateFeesBySlug } from './gas-schedule'

const CHAINS: ChainDefinition[] = [
  base,
  ethereum,
  optimism,
  arbitrum,
  linea,
  unichain,
  worldchain,
  solana,
  stellar,
]

function resolveEnvConfig(def: ChainDefinition, envCfg: EnvConfig): ResolvedNetwork {
  const rpcUrl = process.env[envCfg.rpcUrlEnv] ?? envCfg.rpcUrlDefault ?? ''
  const facilitatorAddress = process.env[envCfg.facilitatorEnv] ?? ''
  return {
    slug: def.slug,
    caip2: envCfg.caip2,
    usdc: envCfg.usdc,
    cctpDomain: envCfg.cctpDomain,
    cctpTokenMessenger: envCfg.cctpTokenMessenger,
    cctpMessageTransmitter: envCfg.cctpMessageTransmitter,
    cctpForwarder: envCfg.cctpForwarder,
    rpcUrl,
    facilitatorAddress,
    viemChain: envCfg.viemChain,
    networkPassphrase: envCfg.networkPassphrase,
  }
}

const activeEnv = resolveNetworkEnv()

// Only register chains whose FACILITATOR_* env var is set. Unconfigured chains
// are silently excluded — callers that try to use them get UnsupportedNetworkError.
const enabledChains: ChainDefinition[] = CHAINS.filter(isChainEnabled)

export const networks: ResolvedNetwork[] = enabledChains.map((def) =>
  resolveEnvConfig(def, def[activeEnv]),
)

export const supportedCaip2s: string[] = networks.map((n) => n.caip2)

// Static caip2 → slug lookup over ALL known chains (mainnet + testnet),
// independent of FACILITATOR_* env gating. Use for env-free concerns like
// cost comparison where we only need the gas-schedule slug.
const caip2ToSlug = new Map<string, ChainDefinition['slug']>()
for (const def of CHAINS) {
  caip2ToSlug.set(def.mainnet.caip2, def.slug)
  caip2ToSlug.set(def.testnet.caip2, def.slug)
}

export function resolveSlugByCaip2(caip2: string): ChainDefinition['slug'] | undefined {
  return caip2ToSlug.get(caip2)
}

const byCaip2 = new Map<string, { network: ResolvedNetwork; def: ChainDefinition }>()
for (let i = 0; i < networks.length; i++) {
  byCaip2.set(networks[i].caip2, { network: networks[i], def: enabledChains[i] })
}

export function getNetwork(caip2: string): ResolvedNetwork {
  const entry = byCaip2.get(caip2)
  if (!entry) {
    throw new UnsupportedNetworkError(caip2, supportedCaip2s)
  }
  return entry.network
}

export function getFacilitatorAddress(caip2: string): string {
  return getNetwork(caip2).facilitatorAddress
}

export function getAdapter(caip2: string): ChainAdapter {
  const entry = byCaip2.get(caip2)
  if (!entry) throw new UnsupportedNetworkError(caip2, supportedCaip2s)
  return entry.def[activeEnv].createAdapter(entry.network)
}

export function getGasAllowance(fromCaip2: string, toCaip2: string): string {
  return getGasAllowanceBySlug(getNetwork(fromCaip2).slug, getNetwork(toCaip2).slug)
}

export function getCctpDomain(caip2: string): number {
  return getCctpDomainBySlug(getNetwork(caip2).slug)
}

export function calculateFees(
  grossAmount: string,
  fromCaip2: string,
  toCaip2: string,
  platformFeeBps = 0,
): { gasAllowance: string; platformFee: string; netAmount: string } {
  return calculateFeesBySlug(
    grossAmount,
    getNetwork(fromCaip2).slug,
    getNetwork(toCaip2).slug,
    platformFeeBps,
  )
}

export type {
  ResolvedNetwork,
  ChainAdapter,
  ChainSlug,
  NetworkEnv,
  PullFromBuyerInput,
  TransferToSellerInput,
  CctpBurnInput,
  CctpBurnResult,
  CctpMintInput,
  AttestationResult,
} from './adapter.types'
export { UnsupportedNetworkError } from './errors'
export { isChainEnabled, resolveNetworkEnv, validateNetworkEnv } from './env'
export { getCircleIrisUrl, getCircleAttestationUrl } from './cctp'
export { getGasAllowanceBySlug, calculateFeesBySlug } from './gas-schedule'
