interface OnrampProvider {
  name: string
  method: string
  regions: string[]
  kycUrl: string
  fees: string
}

export function listProviders(
  _network: string,
  walletAddress?: string,
): { providers: OnrampProvider[]; manual: string } {
  const providers: OnrampProvider[] = [
    {
      name: 'Bridge.xyz',
      method: 'pix',
      regions: ['BR'],
      kycUrl: walletAddress
        ? `https://bridge.xyz/onramp?dest=${walletAddress}`
        : 'https://bridge.xyz/onramp',
      fees: '~1%',
    },
    {
      name: 'MoneyGram Ramps',
      method: 'cash',
      regions: ['BR', 'MX', 'CO', 'AR'],
      kycUrl: walletAddress
        ? `https://ramps.moneygram.com/deposit?dest=${walletAddress}`
        : 'https://ramps.moneygram.com/deposit',
      fees: 'varies',
    },
  ]

  return {
    providers,
    manual: walletAddress
      ? `Send USDC on Stellar to ${walletAddress}`
      : 'Send USDC on Stellar to your wallet address',
  }
}
