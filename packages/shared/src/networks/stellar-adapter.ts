import { Keypair, TransactionBuilder, Operation, Asset, Horizon } from '@stellar/stellar-sdk'
import type {
  ChainAdapter,
  CctpBurnInput,
  CctpBurnResult,
  CctpMintInput,
  PullFromBuyerInput,
  ResolvedNetwork,
  TransferToSellerInput,
} from './adapter.types'

export function createStellarAdapter(resolved: ResolvedNetwork): ChainAdapter {
  if (!resolved.networkPassphrase) {
    throw new Error(
      `Stellar adapter requires networkPassphrase on resolved network ${resolved.caip2}`,
    )
  }
  const server = new Horizon.Server(resolved.rpcUrl)
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

    async cctpBurn(_input: CctpBurnInput): Promise<CctpBurnResult> {
      throw new Error('Stellar CCTP V2 not yet available — gated on Circle launch')
    },

    async cctpMint(_input: CctpMintInput): Promise<string> {
      throw new Error('Stellar CCTP V2 not yet available — gated on Circle launch')
    },
  }
}

function formatStellarAmount(microUnits: string): string {
  const value = BigInt(microUnits)
  const whole = value / 1000000n
  const frac = value % 1000000n
  return `${whole}.${frac.toString().padStart(6, '0')}`
}
