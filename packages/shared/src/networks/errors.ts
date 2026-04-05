export class UnsupportedNetworkError extends Error {
  readonly attempted: string
  readonly supported: readonly string[]

  constructor(attempted: string, supported: readonly string[]) {
    super(`Unsupported network "${attempted}". Supported: ${supported.join(', ')}`)
    this.name = 'UnsupportedNetworkError'
    this.attempted = attempted
    this.supported = supported
  }
}
