export interface RegisterRequest {
  wallet: string
  network: string
}

export interface RegisterResponse {
  merchantId: string
  wallet: string
  network: string
  facilitatorAddresses: Record<string, string>
}

export interface DiscoveryNetworkEntry {
  network: string
  payTo: string
  asset: string
  maxTimeoutSeconds: number
  extra: Record<string, unknown>
  bridge: boolean
}

export interface DiscoveryResponse {
  merchantId: string
  acceptedNetworks: DiscoveryNetworkEntry[]
  sellerNetwork: string
  fees: {
    platform: string
    gasAllowance: string
    sameChain: string
  }
  estimatedSettlement: {
    standard: string
    note: string
  }
  gasFree: boolean
}
