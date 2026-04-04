import {
  Keypair,
  Networks,
  TransactionBuilder,
  Operation,
  Asset,
  Server,
} from '@stellar/stellar-sdk'
import type { ChainAdapter } from './types'
import type {
  PullFromBuyerInput,
  CctpBurnInput,
  CctpBurnResult,
  CctpMintInput,
  TransferToSellerInput,
} from '../types'
import { getChainConfig } from './config'

export function createStellarAdapter(): ChainAdapter {
  const config = getChainConfig('stellar:pubnet')
  const server = new Server(config.rpcUrl)
  const facilitatorKeypair = Keypair.fromSecret(process.env.FACILITATOR_PRIVATE_KEY_STELLAR!)
  const usdc = new Asset('USDC', config.usdcAddress)

  return {
    async pullFromBuyer(input: PullFromBuyerInput): Promise<string> {
      const account = await server.loadAccount(facilitatorKeypair.publicKey())
      const tx = new TransactionBuilder(account, {
        fee: '100',
        networkPassphrase: Networks.PUBLIC,
      })
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
      const tx = new TransactionBuilder(account, {
        fee: '100',
        networkPassphrase: Networks.PUBLIC,
      })
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
