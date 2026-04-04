export interface MppVerifyRequest {
  method: 'stellar' | 'solana' | 'evm'
  intent: 'charge' | 'session'
  action?: 'open' | 'voucher' | 'close'
  txHash?: string
  challengeId: string
  amount: string
  buyerNetwork: string
  channelAddress?: string
  cumulativeAmount?: string
  signature?: string
}

export interface MppVerifyResponse {
  valid: boolean
  txHash?: string
  error?: string
  acceptedCumulative?: string
  spent?: string
  workflowId?: string
  type?: string
  totalAmount?: string
  voucherCount?: number
}

export interface MppSettleRequest {
  method: 'stellar' | 'solana' | 'evm'
  intent: 'charge'
  txHash: string
  amount: string
  buyerNetwork: string
}

export interface MppSettleResponse {
  accepted: boolean
  workflowId: string
  type: 'SAME_CHAIN' | 'CROSS_CHAIN'
}

export interface MppConfigResponse {
  merchantId: string
  sellerNetwork: string
  stellar: {
    recipient: string
    currency: string
    network: string
  }
  solana: {
    recipient: string
    usdcMint: string
    network: string
  }
  evm: {
    recipient: string
    usdcAddress: string
    chainId: number
  }
}
