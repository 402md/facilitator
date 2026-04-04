import { createPublicClient, createWalletClient, http, parseAbi, type Hex } from 'viem'
import { base, baseSepolia } from 'viem/chains'
import { privateKeyToAccount } from 'viem/accounts'
import type { ChainAdapter } from './types'
import type {
  PullFromBuyerInput,
  CctpBurnInput,
  CctpBurnResult,
  CctpMintInput,
  TransferToSellerInput,
} from '../types'
import { getChainConfig } from './config'

const USDC_ABI = parseAbi([
  'function transferWithAuthorization(address from, address to, uint256 value, uint256 validAfter, uint256 validBefore, bytes32 nonce, uint8 v, bytes32 r, bytes32 s)',
  'function transfer(address to, uint256 value) returns (bool)',
])

const TOKEN_MESSENGER_ABI = parseAbi([
  'function depositForBurn(uint256 amount, uint32 destinationDomain, bytes32 mintRecipient, address burnToken) returns (uint64 nonce)',
])

const MESSAGE_TRANSMITTER_ABI = parseAbi([
  'function receiveMessage(bytes message, bytes attestation) returns (bool success)',
])

export function createBaseAdapter(): ChainAdapter {
  const config = getChainConfig('eip155:8453')
  const chain = process.env.NODE_ENV === 'production' ? base : baseSepolia
  const account = privateKeyToAccount(process.env.FACILITATOR_PRIVATE_KEY_BASE as Hex)

  const publicClient = createPublicClient({ chain, transport: http(config.rpcUrl) })
  const walletClient = createWalletClient({ chain, transport: http(config.rpcUrl), account })

  return {
    async pullFromBuyer(input: PullFromBuyerInput): Promise<string> {
      const { v, r, s } = splitSignature(input.authorization.signature)
      const hash = await walletClient.writeContract({
        address: config.usdcAddress as Hex,
        abi: USDC_ABI,
        functionName: 'transferWithAuthorization',
        args: [
          input.buyer as Hex,
          config.facilitatorAddress as Hex,
          BigInt(input.amount),
          BigInt(input.authorization.validAfter),
          BigInt(input.authorization.validBefore),
          input.authorization.nonce as Hex,
          v,
          r,
          s,
        ],
      })
      await publicClient.waitForTransactionReceipt({ hash })
      return hash
    },

    async transferToSeller(input: TransferToSellerInput): Promise<string> {
      const hash = await walletClient.writeContract({
        address: config.usdcAddress as Hex,
        abi: USDC_ABI,
        functionName: 'transfer',
        args: [input.seller as Hex, BigInt(input.amount)],
      })
      await publicClient.waitForTransactionReceipt({ hash })
      return hash
    },

    async cctpBurn(input: CctpBurnInput): Promise<CctpBurnResult> {
      const mintRecipient = padAddress(input.recipient)
      const hash = await walletClient.writeContract({
        address: config.cctpTokenMessenger as Hex,
        abi: TOKEN_MESSENGER_ABI,
        functionName: 'depositForBurn',
        args: [
          BigInt(input.amount),
          input.destinationDomain,
          mintRecipient,
          config.usdcAddress as Hex,
        ],
      })
      const receipt = await publicClient.waitForTransactionReceipt({ hash })
      const messageHash = extractMessageHash(receipt)
      return { txHash: hash, messageHash }
    },

    async cctpMint(input: CctpMintInput): Promise<string> {
      const hash = await walletClient.writeContract({
        address: config.cctpMessageTransmitter as Hex,
        abi: MESSAGE_TRANSMITTER_ABI,
        functionName: 'receiveMessage',
        args: [input.burnResult.messageHash as Hex, input.attestation.attestation as Hex],
      })
      await publicClient.waitForTransactionReceipt({ hash })
      return hash
    },
  }
}

function splitSignature(sig: string): { v: number; r: Hex; s: Hex } {
  const raw = sig.startsWith('0x') ? sig.slice(2) : sig
  return {
    r: `0x${raw.slice(0, 64)}` as Hex,
    s: `0x${raw.slice(64, 128)}` as Hex,
    v: parseInt(raw.slice(128, 130), 16),
  }
}

function padAddress(address: string): Hex {
  const clean = address.startsWith('0x') ? address.slice(2) : address
  return `0x${clean.padStart(64, '0')}` as Hex
}

function extractMessageHash(receipt: {
  logs: readonly { data: string; topics: readonly string[] }[]
}): string {
  for (const log of receipt.logs) {
    if (log.topics[0] === '0x8c5261668696ce22758910d05bab8f186d6eb247ceac2af2e82c7dc17669b036') {
      return log.data
    }
  }
  throw new Error('MessageSent event not found in receipt')
}
