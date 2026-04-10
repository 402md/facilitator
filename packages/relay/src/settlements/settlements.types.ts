export interface PaymentResource {
  url: string
  description?: string
}

export interface VerifyRequest {
  x402Version: number
  paymentPayload: {
    resource?: PaymentResource
    payload: {
      signature: string
      [key: string]: unknown
    }
    [key: string]: unknown
  }
  paymentRequirements: {
    scheme: string
    network: string
    payTo: string
    amount: string
    extra?: { merchantId?: string; [key: string]: unknown }
    [key: string]: unknown
  }
}

export interface VerifyResponse {
  isValid: boolean
  invalidReason?: string
  invalidMessage?: string
  payer?: string
}

export interface PaymentAuthorization {
  from: string
  to: string
  value: string
  validAfter: string
  validBefore: string
  nonce: string
}

export interface SettleRequest {
  x402Version: number
  paymentPayload: {
    resource?: PaymentResource
    payload: {
      authorization: PaymentAuthorization
      signature: string
      [key: string]: unknown
    }
    [key: string]: unknown
  }
  paymentRequirements: {
    scheme: string
    network: string
    payTo: string
    amount: string
    extra?: { merchantId?: string; [key: string]: unknown }
    [key: string]: unknown
  }
}

export interface SettleResponse {
  success: boolean
  errorReason?: string
  errorMessage?: string
  payer?: string
  transaction: string
  network: string
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
