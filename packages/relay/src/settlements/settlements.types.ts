interface PaymentResource {
  url: string
  description?: string
}

export interface PaymentAuthorization {
  from: string
  to: string
  value: string
  validAfter: string
  validBefore: string
  nonce: string
}

/**
 * The body of both `POST /verify` and `POST /settle` — x402 defines them with
 * the same shape. Payload fields are optional at the type level because the
 * route accepts them unvalidated; `validatePayment` is what actually asserts
 * they are present and well-formed.
 */
export interface PaymentRequest {
  x402Version: number
  paymentPayload: {
    resource?: PaymentResource
    payload: {
      authorization?: PaymentAuthorization
      signature?: string
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

export type VerifyRequest = PaymentRequest
export type SettleRequest = PaymentRequest

export interface VerifyResponse {
  isValid: boolean
  invalidReason?: string
  invalidMessage?: string
  payer?: string
}

export interface SettleResponse {
  success: boolean
  errorReason?: string
  errorMessage?: string
  payer?: string
  /** Blockchain tx hash of the capture on the buyer's chain. Empty when settlement failed. */
  transaction: string
  network: string
  amount?: string
  /** 402md extension: handle for `GET /bridge/status/:workflowId`. */
  workflowId?: string
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
