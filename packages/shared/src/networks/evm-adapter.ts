import { createPublicClient, createWalletClient, http, parseAbi, type Hex } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { StrKey } from '@stellar/stellar-sdk'
import type {
  ChainAdapter,
  CctpBurnInput,
  CctpBurnResult,
  CctpMintInput,
  PullFromBuyerInput,
  ResolvedNetwork,
  TransferToSellerInput,
} from './adapter.types'

const USDC_ABI = parseAbi([
  'function transferWithAuthorization(address from, address to, uint256 value, uint256 validAfter, uint256 validBefore, bytes32 nonce, uint8 v, bytes32 r, bytes32 s)',
  'function transfer(address to, uint256 value) returns (bool)',
])

const TOKEN_MESSENGER_ABI = parseAbi([
  'function depositForBurn(uint256 amount, uint32 destinationDomain, bytes32 mintRecipient, address burnToken, bytes32 destinationCaller, uint256 maxFee, uint32 minFinalityThreshold)',
  'function depositForBurnWithHook(uint256 amount, uint32 destinationDomain, bytes32 mintRecipient, address burnToken, bytes32 destinationCaller, uint256 maxFee, uint32 minFinalityThreshold, bytes hookData)',
])

const MESSAGE_TRANSMITTER_ABI = parseAbi([
  'function receiveMessage(bytes message, bytes attestation) returns (bool success)',
])

let warnedAboutLegacyKey = false
function readEvmPrivateKey(): Hex {
  const modern = process.env.FACILITATOR_PRIVATE_KEY_EVM
  if (modern) return modern as Hex
  // Migration fallback — accept the old single-chain var for one release so
  // existing deployments keep working after the rename.
  const legacy = process.env.FACILITATOR_PRIVATE_KEY_BASE
  if (legacy) {
    if (!warnedAboutLegacyKey) {
      console.warn(
        '[402md] FACILITATOR_PRIVATE_KEY_BASE is deprecated — rename to FACILITATOR_PRIVATE_KEY_EVM (one key is shared across every EVM chain).',
      )
      warnedAboutLegacyKey = true
    }
    return legacy as Hex
  }
  // Neither set — `privateKeyToAccount(undefined)` throws with a clear message.
  return modern as Hex
}

export function createEvmAdapter(resolved: ResolvedNetwork): ChainAdapter {
  if (!resolved.viemChain) {
    throw new Error(`EVM adapter requires viemChain on resolved network ${resolved.caip2}`)
  }
  const account = privateKeyToAccount(readEvmPrivateKey())
  const publicClient = createPublicClient({
    chain: resolved.viemChain,
    transport: http(resolved.rpcUrl),
  })
  const walletClient = createWalletClient({
    chain: resolved.viemChain,
    transport: http(resolved.rpcUrl),
    account,
  })

  return {
    async pullFromBuyer(input: PullFromBuyerInput): Promise<string> {
      const { v, r, s } = splitSignature(input.authorization.signature)
      const hash = await walletClient.writeContract({
        address: resolved.usdc as Hex,
        abi: USDC_ABI,
        functionName: 'transferWithAuthorization',
        args: [
          input.buyer as Hex,
          resolved.facilitatorAddress as Hex,
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
        address: resolved.usdc as Hex,
        abi: USDC_ABI,
        functionName: 'transfer',
        args: [input.seller as Hex, BigInt(input.amount)],
      })
      await publicClient.waitForTransactionReceipt({ hash })
      return hash
    },

    async cctpBurn(input: CctpBurnInput): Promise<CctpBurnResult> {
      const isStellarDestination = input.destinationDomain === 27

      let hash: Hex
      if (isStellarDestination && input.cctpForwarder) {
        const forwarderBytes32 = stellarAddressToBytes32(input.cctpForwarder)
        const hookData = buildCctpForwarderHookData(input.recipient)
        hash = await walletClient.writeContract({
          address: resolved.cctpTokenMessenger as Hex,
          abi: TOKEN_MESSENGER_ABI,
          functionName: 'depositForBurnWithHook',
          args: [
            BigInt(input.amount),
            input.destinationDomain,
            forwarderBytes32,
            resolved.usdc as Hex,
            forwarderBytes32,
            0n,
            0,
            hookData,
          ],
        })
      } else {
        const mintRecipient = padAddress(input.recipient)
        const zeroBytes32 =
          '0x0000000000000000000000000000000000000000000000000000000000000000' as Hex
        hash = await walletClient.writeContract({
          address: resolved.cctpTokenMessenger as Hex,
          abi: TOKEN_MESSENGER_ABI,
          functionName: 'depositForBurn',
          args: [
            BigInt(input.amount),
            input.destinationDomain,
            mintRecipient,
            resolved.usdc as Hex,
            zeroBytes32,
            0n,
            0,
          ],
        })
      }

      const receipt = await publicClient.waitForTransactionReceipt({ hash })
      const messageHash = extractMessageHash(receipt)
      return { txHash: hash, messageHash }
    },

    async cctpMint(input: CctpMintInput): Promise<string> {
      const hash = await walletClient.writeContract({
        address: resolved.cctpMessageTransmitter as Hex,
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

function stellarAddressToBytes32(strkey: string): Hex {
  const isContract = StrKey.isValidContract(strkey)
  const raw = isContract ? StrKey.decodeContract(strkey) : StrKey.decodeEd25519PublicKey(strkey)
  return `0x${Buffer.from(raw).toString('hex').padStart(64, '0')}` as Hex
}

function buildCctpForwarderHookData(forwardRecipientStrkey: string): Hex {
  const recipientBytes = Buffer.from(forwardRecipientStrkey, 'utf8')
  const hookData = Buffer.alloc(32 + recipientBytes.length)
  hookData.writeUInt32BE(0, 24) // hook version = 0
  hookData.writeUInt32BE(recipientBytes.length, 28) // recipient byte length
  recipientBytes.copy(hookData, 32) // recipient strkey as UTF-8
  return `0x${hookData.toString('hex')}` as Hex
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
