import { resolveNetworkEnv } from './env'

const IRIS_URLS = {
  mainnet: 'https://iris-api.circle.com',
  testnet: 'https://iris-api-sandbox.circle.com',
} as const

export function getCircleIrisUrl(): string {
  return IRIS_URLS[resolveNetworkEnv()]
}

export function getCircleAttestationUrl(messageHash: string): string {
  return `${getCircleIrisUrl()}/attestations/${messageHash}`
}
