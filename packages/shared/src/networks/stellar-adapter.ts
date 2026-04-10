import {
  Keypair,
  TransactionBuilder,
  Operation,
  Asset,
  Horizon,
  SorobanRpc,
  Contract,
  Address,
  nativeToScVal,
} from '@stellar/stellar-sdk'
import type {
  ChainAdapter,
  CctpBurnInput,
  CctpBurnResult,
  CctpMintInput,
  PullFromBuyerInput,
  ResolvedNetwork,
  TransferToSellerInput,
} from './adapter.types'

/** Stellar uses 7 decimals for USDC, CCTP uses 6 */
export function stellarToCctpAmount(stellarMicroUnits: string): string {
  return (BigInt(stellarMicroUnits) / 10n).toString()
}

export function cctpToStellarAmount(cctpUnits: string): string {
  return (BigInt(cctpUnits) * 10n).toString()
}

export function createStellarAdapter(resolved: ResolvedNetwork): ChainAdapter {
  if (!resolved.networkPassphrase) {
    throw new Error(
      `Stellar adapter requires networkPassphrase on resolved network ${resolved.caip2}`,
    )
  }
  const server = new Horizon.Server(resolved.rpcUrl)
  const soroban = new SorobanRpc.Server(resolved.rpcUrl)
  const facilitatorKeypair = Keypair.fromSecret(process.env.FACILITATOR_PRIVATE_KEY_STELLAR!)
  const usdc = new Asset('USDC', resolved.usdc)
  const networkPassphrase = resolved.networkPassphrase

  return {
    async pullFromBuyer(input: PullFromBuyerInput): Promise<string> {
      const account = await server.loadAccount(facilitatorKeypair.publicKey())
      const tx = new TransactionBuilder(account, { fee: '100', networkPassphrase })
        .addOperation(
          Operation.payment({
            destination: facilitatorKeypair.publicKey(),
            asset: usdc,
            amount: formatStellarAmount(input.amount),
            source: input.buyer,
          }),
        )
        .setTimeout(30)
        .build()

      tx.sign(facilitatorKeypair)
      const result = await server.submitTransaction(tx)
      return result.hash
    },

    async transferToSeller(input: TransferToSellerInput): Promise<string> {
      const account = await server.loadAccount(facilitatorKeypair.publicKey())
      const tx = new TransactionBuilder(account, { fee: '100', networkPassphrase })
        .addOperation(
          Operation.payment({
            destination: input.seller,
            asset: usdc,
            amount: formatStellarAmount(input.amount),
          }),
        )
        .setTimeout(30)
        .build()

      tx.sign(facilitatorKeypair)
      const result = await server.submitTransaction(tx)
      return result.hash
    },

    async cctpBurn(input: CctpBurnInput): Promise<CctpBurnResult> {
      const tokenMessenger = new Contract(resolved.cctpTokenMessenger)
      const cctpAmount = stellarToCctpAmount(input.amount)

      const account = await soroban.getAccount(facilitatorKeypair.publicKey())
      const tx = new TransactionBuilder(account, {
        fee: '100',
        networkPassphrase,
      })
        .addOperation(
          tokenMessenger.call(
            'deposit_for_burn',
            nativeToScVal(BigInt(cctpAmount), { type: 'i128' }),
            nativeToScVal(input.destinationDomain, { type: 'u32' }),
            nativeToScVal(Buffer.from(padAddressTo32(input.recipient)), { type: 'bytes' }),
            new Address(resolved.usdc).toScVal(),
          ),
        )
        .setTimeout(30)
        .build()

      const simulated = await soroban.simulateTransaction(tx)
      if (SorobanRpc.Api.isSimulationError(simulated)) {
        throw new Error(`Soroban simulation failed: ${simulated.error}`)
      }

      const prepared = SorobanRpc.assembleTransaction(tx, simulated).build()
      prepared.sign(facilitatorKeypair)

      const sendResult = await soroban.sendTransaction(prepared)
      const txHash = sendResult.hash
      const confirmed = await pollTransaction(soroban, txHash)
      const messageHash = extractSorobanMessageHash(confirmed)

      return { txHash, messageHash }
    },

    async cctpMint(input: CctpMintInput): Promise<string> {
      if (!resolved.cctpForwarder) {
        throw new Error(
          `Stellar cctpMint requires cctpForwarder on resolved network ${resolved.caip2}`,
        )
      }
      const cctpForwarder = new Contract(resolved.cctpForwarder)

      const account = await soroban.getAccount(facilitatorKeypair.publicKey())
      const tx = new TransactionBuilder(account, {
        fee: '100',
        networkPassphrase,
      })
        .addOperation(
          cctpForwarder.call(
            'mint_and_forward',
            nativeToScVal(Buffer.from(hexToBytes(input.attestation.messageBytes)), {
              type: 'bytes',
            }),
            nativeToScVal(Buffer.from(hexToBytes(input.attestation.attestation)), {
              type: 'bytes',
            }),
          ),
        )
        .setTimeout(30)
        .build()

      const simulated = await soroban.simulateTransaction(tx)
      if (SorobanRpc.Api.isSimulationError(simulated)) {
        if (simulated.error.includes('#6908')) {
          console.log('CCTP message already received (nonce used) — treating as success')
          return 'already-minted'
        }
        throw new Error(`Soroban simulation failed: ${simulated.error}`)
      }

      const prepared = SorobanRpc.assembleTransaction(tx, simulated).build()
      prepared.sign(facilitatorKeypair)

      const sendResult = await soroban.sendTransaction(prepared)
      await pollTransaction(soroban, sendResult.hash)
      return sendResult.hash
    },
  }
}

function formatStellarAmount(microUnits: string): string {
  const value = BigInt(microUnits)
  const whole = value / 1000000n
  const frac = value % 1000000n
  return `${whole}.${frac.toString().padStart(6, '0')}`
}

function padAddressTo32(address: string): Uint8Array {
  const clean = address.startsWith('0x') ? address.slice(2) : address
  const bytes = new Uint8Array(32)
  const hex = clean.padStart(64, '0')
  for (let i = 0; i < 32; i++) {
    bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16)
  }
  return bytes
}

function hexToBytes(hex: string): Uint8Array {
  const clean = hex.startsWith('0x') ? hex.slice(2) : hex
  const bytes = new Uint8Array(clean.length / 2)
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16)
  }
  return bytes
}

async function pollTransaction(
  soroban: SorobanRpc.Server,
  hash: string,
  maxAttempts = 30,
  interval = 2000,
): Promise<SorobanRpc.Api.GetSuccessfulTransactionResponse> {
  for (let i = 0; i < maxAttempts; i++) {
    const result = await soroban.getTransaction(hash)
    if (result.status === 'SUCCESS') {
      return result as SorobanRpc.Api.GetSuccessfulTransactionResponse
    }
    if (result.status === 'FAILED') {
      throw new Error(`Soroban transaction ${hash} failed`)
    }
    await new Promise((r) => setTimeout(r, interval))
  }
  throw new Error(`Soroban transaction ${hash} not confirmed after ${maxAttempts} attempts`)
}

function extractSorobanMessageHash(
  result: SorobanRpc.Api.GetSuccessfulTransactionResponse,
): string {
  const meta = result.resultMetaXdr
  const events = meta.v3().sorobanMeta()?.events() ?? []

  for (const event of events) {
    const topics = event.body().v0().topics()
    if (topics.length > 0) {
      const topicStr = topics[0].sym?.().toString()
      if (topicStr === 'MessageSent') {
        const data = event.body().v0().data()
        return data.bytes?.().toString('hex') ?? ''
      }
    }
  }
  throw new Error('MessageSent event not found in Soroban transaction result')
}
