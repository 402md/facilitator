import { Method } from 'mppx'
import { stellarCharge } from './methods/stellar'
import { solanaCharge } from './methods/solana'
import { evmCharge } from './methods/evm'

interface FourZeroTwoMdOptions {
  facilitator: string
  merchantId: string
}

export async function fourZeroTwoMd(options: FourZeroTwoMdOptions) {
  const configUrl = `${options.facilitator}/merchants/${options.merchantId}/mpp/config`
  const res = await fetch(configUrl)
  if (!res.ok) throw new Error(`Failed to fetch MPP config: ${res.status}`)
  const config = await res.json() as {
    merchantId: string
    sellerNetwork: string
    stellar: { recipient: string; currency: string; network: string }
    solana: { recipient: string; usdcMint: string; network: string }
    evm: { recipient: string; usdcAddress: string; chainId: number }
  }

  const makeVerify = (method: string) => async ({ credential }: any) => {
    const txHash = credential.payload.hash ?? credential.payload.signature
    const res = await fetch(`${options.facilitator}/merchants/${options.merchantId}/mpp/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        method,
        intent: 'charge',
        txHash,
        challengeId: credential.challenge?.id ?? '',
        amount: credential.challenge?.request?.amount ?? '0',
        buyerNetwork: method === 'stellar' ? 'stellar:pubnet'
          : method === 'solana' ? 'solana:mainnet'
          : 'eip155:8453',
      }),
    })
    const data = await res.json() as { valid: boolean; error?: string; txHash?: string }
    if (!data.valid) throw new Error(data.error ?? 'Verification failed')
    return {
      method,
      status: 'success' as const,
      timestamp: new Date().toISOString(),
      reference: data.txHash ?? txHash,
    }
  }

  const makeSettle = (method: string) => async ({ credential }: any) => {
    const txHash = credential.payload.hash ?? credential.payload.signature
    await fetch(`${options.facilitator}/merchants/${options.merchantId}/mpp/settle`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        method,
        intent: 'charge',
        txHash,
        amount: credential.challenge?.request?.amount ?? '0',
        buyerNetwork: method === 'stellar' ? 'stellar:pubnet'
          : method === 'solana' ? 'solana:mainnet'
          : 'eip155:8453',
      }),
    })
  }

  return [
    Method.toServer(stellarCharge, {
      defaults: {
        currency: config.stellar.currency,
        recipient: config.stellar.recipient,
        methodDetails: { network: config.stellar.network },
      },
      verify: makeVerify('stellar'),
      settle: makeSettle('stellar'),
    }),
    Method.toServer(solanaCharge, {
      defaults: {
        currency: config.solana.usdcMint,
        recipient: config.solana.recipient,
        methodDetails: { network: config.solana.network },
      },
      verify: makeVerify('solana'),
      settle: makeSettle('solana'),
    }),
    Method.toServer(evmCharge, {
      defaults: {
        currency: config.evm.usdcAddress,
        recipient: config.evm.recipient,
        methodDetails: { chainId: config.evm.chainId },
      },
      verify: makeVerify('evm'),
      settle: makeSettle('evm'),
    }),
  ]
}
