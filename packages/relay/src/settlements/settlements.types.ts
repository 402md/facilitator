export interface VerifyRequest {
  paymentPayload: {
    signature: string
    [key: string]: unknown
  }
  paymentRequirements: {
    scheme: string
    network: string
    payTo: string
    maxAmountRequired: string
    extra?: { merchantId?: string; [key: string]: unknown }
    [key: string]: unknown
  }
}

export interface VerifyResponse {
  isValid: boolean
  reason?: string
}

export interface SettleRequest {
  paymentPayload: {
    signature: string
    [key: string]: unknown
  }
  paymentRequirements: {
    scheme: string
    network: string
    payTo: string
    maxAmountRequired: string
    extra?: { merchantId?: string; [key: string]: unknown }
    [key: string]: unknown
  }
}

export interface SettleResponse {
  accepted: boolean
  workflowId: string
  type: 'SAME_CHAIN' | 'CROSS_CHAIN'
}

export interface FeeQuote {
  platformFee: string
  gasAllowance: string
  totalDeduction: string
  sellerReceives: string
  currency: string
  decimals: number
  note: string
}
