import type {
  PullFromBuyerInput,
  CctpBurnInput,
  CctpBurnResult,
  CctpMintInput,
  TransferToSellerInput,
} from '../types'

export interface ChainAdapter {
  pullFromBuyer(input: PullFromBuyerInput): Promise<string>
  transferToSeller(input: TransferToSellerInput): Promise<string>
  cctpBurn(input: CctpBurnInput): Promise<CctpBurnResult>
  cctpMint(input: CctpMintInput): Promise<string>
}
