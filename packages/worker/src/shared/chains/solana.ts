import { Connection, Keypair, PublicKey, Transaction } from '@solana/web3.js'
import { getAssociatedTokenAddress, createTransferCheckedInstruction } from '@solana/spl-token'
import type { ChainAdapter } from './types'
import type {
  PullFromBuyerInput,
  CctpBurnInput,
  CctpBurnResult,
  CctpMintInput,
  TransferToSellerInput,
} from '../types'
import { getChainConfig } from './config'

export function createSolanaAdapter(): ChainAdapter {
  const config = getChainConfig('solana:mainnet')
  const connection = new Connection(config.rpcUrl)
  const facilitatorKeypair = Keypair.fromSecretKey(
    Buffer.from(process.env.FACILITATOR_PRIVATE_KEY_SOLANA!, 'base64'),
  )
  const usdcMint = new PublicKey(config.usdcAddress)

  return {
    async pullFromBuyer(input: PullFromBuyerInput): Promise<string> {
      const buyerPubkey = new PublicKey(input.buyer)
      const facilitatorPubkey = facilitatorKeypair.publicKey

      const buyerAta = await getAssociatedTokenAddress(usdcMint, buyerPubkey)
      const facilitatorAta = await getAssociatedTokenAddress(usdcMint, facilitatorPubkey)

      const tx = new Transaction().add(
        createTransferCheckedInstruction(
          buyerAta,
          usdcMint,
          facilitatorAta,
          buyerPubkey,
          BigInt(input.amount),
          6,
        ),
      )

      tx.feePayer = facilitatorPubkey
      tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash
      tx.partialSign(facilitatorKeypair)

      const sig = await connection.sendRawTransaction(tx.serialize())
      await connection.confirmTransaction(sig)
      return sig
    },

    async transferToSeller(input: TransferToSellerInput): Promise<string> {
      const sellerPubkey = new PublicKey(input.seller)
      const facilitatorPubkey = facilitatorKeypair.publicKey

      const facilitatorAta = await getAssociatedTokenAddress(usdcMint, facilitatorPubkey)
      const sellerAta = await getAssociatedTokenAddress(usdcMint, sellerPubkey)

      const tx = new Transaction().add(
        createTransferCheckedInstruction(
          facilitatorAta,
          usdcMint,
          sellerAta,
          facilitatorPubkey,
          BigInt(input.amount),
          6,
        ),
      )

      tx.feePayer = facilitatorPubkey
      tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash
      tx.sign(facilitatorKeypair)

      const sig = await connection.sendRawTransaction(tx.serialize())
      await connection.confirmTransaction(sig)
      return sig
    },

    async cctpBurn(_input: CctpBurnInput): Promise<CctpBurnResult> {
      throw new Error('Solana CCTP burn: implement with Circle CCTP Solana program')
    },

    async cctpMint(_input: CctpMintInput): Promise<string> {
      throw new Error('Solana CCTP mint: implement with Circle CCTP Solana program')
    },
  }
}
