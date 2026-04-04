export class AppError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public code: string,
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
