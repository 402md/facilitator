export class AppError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public code: string,
    public details?: Record<string, unknown>,
  ) {
    super(message)
  }
}

export class SellerNotFoundError extends AppError {
  constructor(merchantId: string) {
    super(`Seller not found: ${merchantId}`, 404, 'SELLER_NOT_FOUND')
  }
}

export class InvalidPaymentError extends AppError {
  constructor(reason: string) {
    super(`Invalid payment: ${reason}`, 400, 'INVALID_PAYMENT')
  }
}

export class UnsupportedNetworkError extends AppError {
  constructor(network: string, supported: string[]) {
    super(`Unsupported network: ${network}`, 400, 'UNSUPPORTED_NETWORK', {
      supportedNetworks: supported,
      example: {
        wallet: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
        network: supported[0],
      },
    })
  }
}

export class CircuitBreakerError extends AppError {
  constructor(reason: string) {
    super(`Circuit breaker: ${reason}`, 503, 'CIRCUIT_BREAKER')
  }
}

export class RateLimitError extends AppError {
  constructor() {
    super('Rate limit exceeded', 429, 'RATE_LIMIT')
  }
}

export class ReplayError extends AppError {
  constructor() {
    super('Duplicate transaction', 409, 'REPLAY_DETECTED')
  }
}
