export class UnsupportedNetworkError extends Error {
  readonly attempted: string
  readonly supported: readonly string[]
  readonly statusCode = 400
  readonly code = 'UNSUPPORTED_NETWORK'
  readonly details: {
    supportedNetworks: readonly string[]
    example: { wallet: string; network: string }
  }

  constructor(attempted: string, supported: readonly string[]) {
    super(`Unsupported network: ${attempted}`)
    this.name = 'UnsupportedNetworkError'
    this.attempted = attempted
    this.supported = supported
    this.details = {
      supportedNetworks: supported,
      example: {
        wallet: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
        network: supported[0] ?? '',
      },
    }
  }
}
