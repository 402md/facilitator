export type Network = string // CAIP-2: "eip155:8453", "solana:mainnet", "stellar:pubnet"

export interface CrossChainSettleParams {
  sellerId: string
  sellerAddress: string
  sellerNetwork: Network
  buyerAddress: string
  buyerNetwork: Network
  amount: string
  authorization: {
    validAfter: string
    validBefore: string
    nonce: string
    signature: string
  }
  destinationDomain: number
  gasAllowance: string
  platformFee: string
}

export interface CrossChainSettleResult {
  success: boolean
  pullTxHash: string
  burnTxHash: string
  mintTxHash: string
  sellerAmount: string
  platformFee: string
  gasAllowance: string
  settledAt: string
}

export interface SameChainSettleParams {
  sellerId: string
  sellerAddress: string
  buyerAddress: string
  network: Network
  amount: string
  authorization: {
    validAfter: string
    validBefore: string
    nonce: string
    signature: string
  }
  gasAllowance: string
  platformFee: string
}

export interface SameChainSettleResult {
  success: boolean
  pullTxHash: string
  transferTxHash: string
  sellerAmount: string
  platformFee: string
  gasAllowance: string
  settledAt: string
}

export interface BatchSessionSettleParams {
  sessionId: string
  sellerId: string
  sellerAddress: string
  sellerNetwork: Network
  buyerAddress: string
  buyerNetwork: Network
  totalAmount: string
  voucherCount: number
  destinationDomain: number
}

export interface BatchSessionSettleResult {
  success: boolean
  pullTxHash: string
  burnTxHash: string
  mintTxHash: string
  sellerAmount: string
  feeAmount: string
  gasAllowance: string
  voucherCount: number
  settledAt: string
}

export interface PullFromBuyerInput {
  network: Network
  buyer: string
  amount: string
  authorization: {
    validAfter: string
    validBefore: string
    nonce: string
    signature: string
  }
}

export interface CctpBurnInput {
  fromNetwork: Network
  toNetwork: Network
  amount: string
  recipient: string
  destinationDomain: number
}

export interface CctpBurnResult {
  txHash: string
  messageHash: string
}

export interface WaitAttestationInput {
  messageHash: string
}

export interface AttestationResult {
  attestation: string
  messageBytes: string
}

export interface CctpMintInput {
  network: Network
  attestation: AttestationResult
  burnResult: CctpBurnResult
}

export interface TransferToSellerInput {
  network: Network
  seller: string
  amount: string
}

export interface RecordPaymentInput {
  type: 'SAME_CHAIN' | 'BRIDGE_SETTLEMENT' | 'MPP_CHARGE' | 'MPP_SESSION_BATCH' | 'REBALANCE'
  protocol: 'x402' | 'mpp' | null
  sellerId: string
  buyerAddress: string
  buyerNetwork: Network
  sellerAddress: string
  sellerNetwork: Network
  amount: string
  sellerAmount: string
  platformFee: string
  gasAllowance: string
  pullTx: string
  burnTx: string | null
  mintTx: string | null
  transferTx: string | null
  bridgeProvider: 'cctp' | null
}
