import type { Chain } from 'viem'

export type NetworkEnv = 'mainnet' | 'testnet'
export type ChainSlug = 'base' | 'solana' | 'stellar'

export interface PullFromBuyerInput {
  network: string
  buyer: string
  amount: string
  authorization: {
    validAfter: string
    validBefore: string
    nonce: string
    signature: string
  }
}

export interface TransferToSellerInput {
  network: string
  seller: string
  amount: string
}

export interface CctpBurnInput {
  fromNetwork: string
  toNetwork: string
  amount: string
  recipient: string
  destinationDomain: number
  cctpForwarder?: string
}

export interface CctpBurnResult {
  txHash: string
  messageHash: string
}

export interface AttestationResult {
  attestation: string
  messageBytes: string
}

export interface CctpMintInput {
  network: string
  attestation: AttestationResult
  burnResult: CctpBurnResult
}

export interface ChainAdapter {
  pullFromBuyer(input: PullFromBuyerInput): Promise<string>
  transferToSeller(input: TransferToSellerInput): Promise<string>
  cctpBurn(input: CctpBurnInput): Promise<CctpBurnResult>
  cctpMint(input: CctpMintInput): Promise<string>
}

export interface EnvConfig {
  caip2: string
  usdc: string
  cctpDomain: number
  cctpTokenMessenger: string
  cctpMessageTransmitter: string
  cctpForwarder?: string
  rpcUrlEnv: string
  rpcUrlDefault: string | null
  facilitatorEnv: string
  viemChain?: Chain
  networkPassphrase?: string
  createAdapter: (resolved: ResolvedNetwork) => ChainAdapter
}

export interface ChainDefinition {
  slug: ChainSlug
  mainnet: EnvConfig
  testnet: EnvConfig
}

export interface ResolvedNetwork {
  slug: ChainSlug
  caip2: string
  usdc: string
  cctpDomain: number
  cctpTokenMessenger: string
  cctpMessageTransmitter: string
  cctpForwarder?: string
  rpcUrl: string
  facilitatorAddress: string
  viemChain?: Chain
  networkPassphrase?: string
}
