import { describe, expect, test } from 'bun:test'
import { isAddress } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { base } from './chains/base'
import { ethereum } from './chains/ethereum'
import { optimism } from './chains/optimism'
import { arbitrum } from './chains/arbitrum'
import { linea } from './chains/linea'
import { unichain } from './chains/unichain'
import { worldchain } from './chains/worldchain'
import { solana } from './chains/solana'
import { stellar } from './chains/stellar'
import type { ChainDefinition, EnvConfig, ResolvedNetwork } from './adapter.types'
import { isWellFormedSignature, recoverAuthorizationSigner, supportsEip3009 } from './eip3009'

const EVM_CHAINS: ChainDefinition[] = [
  base,
  ethereum,
  optimism,
  arbitrum,
  linea,
  unichain,
  worldchain,
]

const BUYER_KEY = '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80'
const BUYER = privateKeyToAccount(BUYER_KEY)
const FACILITATOR = '0x1F98431c8aD98523631AE4a59f267346ea31F984'

function resolve(cfg: EnvConfig, slug: ChainDefinition['slug']): ResolvedNetwork {
  return {
    slug,
    caip2: cfg.caip2,
    usdc: cfg.usdc,
    usdcEip712: cfg.usdcEip712,
    cctpDomain: cfg.cctpDomain,
    cctpTokenMessenger: cfg.cctpTokenMessenger,
    cctpMessageTransmitter: cfg.cctpMessageTransmitter,
    rpcUrl: 'https://test.invalid',
    facilitatorAddress: FACILITATOR,
    viemChain: cfg.viemChain,
    networkPassphrase: cfg.networkPassphrase,
  }
}

const authorization = {
  from: BUYER.address,
  to: FACILITATOR,
  value: '1000000',
  validAfter: '0',
  validBefore: '99999999999',
  nonce: '0x0000000000000000000000000000000000000000000000000000000000000001',
}

async function sign(network: ResolvedNetwork) {
  return BUYER.signTypedData({
    domain: {
      name: network.usdcEip712!.name,
      version: network.usdcEip712!.version,
      chainId: network.viemChain!.id,
      verifyingContract: network.usdc as `0x${string}`,
    },
    types: {
      TransferWithAuthorization: [
        { name: 'from', type: 'address' },
        { name: 'to', type: 'address' },
        { name: 'value', type: 'uint256' },
        { name: 'validAfter', type: 'uint256' },
        { name: 'validBefore', type: 'uint256' },
        { name: 'nonce', type: 'bytes32' },
      ],
    },
    primaryType: 'TransferWithAuthorization',
    message: {
      from: authorization.from as `0x${string}`,
      to: authorization.to as `0x${string}`,
      value: BigInt(authorization.value),
      validAfter: BigInt(authorization.validAfter),
      validBefore: BigInt(authorization.validBefore),
      nonce: authorization.nonce as `0x${string}`,
    },
  })
}

describe('usdcEip712 configuration', () => {
  // The domain name differs per deployment (`USD Coin`, `USDC`, `USD//C`); a
  // missing or guessed one silently rejects every legitimate payment.
  test.each(EVM_CHAINS.map((c) => [c.slug, c] as const))(
    '%s declares an EIP-712 domain on both mainnet and testnet',
    (_slug, chain) => {
      expect(chain.mainnet.usdcEip712?.name).toBeString()
      expect(chain.mainnet.usdcEip712?.version).toBe('2')
      expect(chain.testnet.usdcEip712?.name).toBeString()
      expect(chain.testnet.usdcEip712?.version).toBe('2')
    },
  )

  test('non-EVM chains declare none', () => {
    expect(solana.mainnet.usdcEip712).toBeUndefined()
    expect(stellar.mainnet.usdcEip712).toBeUndefined()
  })
})

describe('EVM contract addresses', () => {
  // viem rejects a mis-checksummed address, so a typo here does not misbehave
  // subtly — it throws on every signature check and every writeContract call.
  test.each(EVM_CHAINS.map((c) => [c.slug, c] as const))(
    '%s addresses pass EIP-55 on both mainnet and testnet',
    (_slug, chain) => {
      for (const cfg of [chain.mainnet, chain.testnet]) {
        for (const address of [cfg.usdc, cfg.cctpTokenMessenger, cfg.cctpMessageTransmitter]) {
          expect(isAddress(address, { strict: true })).toBe(true)
        }
      }
    },
  )
})

describe('supportsEip3009', () => {
  test('is true for EVM chains and false for Solana and Stellar', () => {
    expect(supportsEip3009(resolve(base.mainnet, 'base'))).toBe(true)
    expect(supportsEip3009(resolve(solana.mainnet, 'solana'))).toBe(false)
    expect(supportsEip3009(resolve(stellar.mainnet, 'stellar'))).toBe(false)
  })
})

describe('isWellFormedSignature', () => {
  test('accepts a 65-byte hex signature', () => {
    expect(isWellFormedSignature(`0x${'a'.repeat(130)}`)).toBe(true)
  })

  test('rejects the wrong length or non-hex input', () => {
    expect(isWellFormedSignature(`0x${'a'.repeat(128)}`)).toBe(false)
    expect(isWellFormedSignature('0xValidSignature1234567890abcdef')).toBe(false)
    expect(isWellFormedSignature('')).toBe(false)
  })
})

describe('recoverAuthorizationSigner', () => {
  test.each(EVM_CHAINS.map((c) => [c.slug, c] as const))(
    'recovers the buyer on %s',
    async (slug, chain) => {
      const network = resolve(chain.mainnet, slug)
      const signature = await sign(network)

      const signer = await recoverAuthorizationSigner(network, authorization, signature)

      expect(signer.toLowerCase()).toBe(BUYER.address.toLowerCase())
    },
  )

  test('does not recover the buyer when the amount was tampered with', async () => {
    const network = resolve(base.mainnet, 'base')
    const signature = await sign(network)

    const signer = await recoverAuthorizationSigner(
      network,
      { ...authorization, value: '999999999' },
      signature,
    )

    expect(signer.toLowerCase()).not.toBe(BUYER.address.toLowerCase())
  })

  test('does not recover the buyer when the signature came from another chain', async () => {
    // A signature valid on Base must not pass on Optimism: chainId and the
    // verifying contract are both part of the domain.
    const signature = await sign(resolve(base.mainnet, 'base'))

    const signer = await recoverAuthorizationSigner(
      resolve(optimism.mainnet, 'optimism'),
      authorization,
      signature,
    )

    expect(signer.toLowerCase()).not.toBe(BUYER.address.toLowerCase())
  })

  test('throws for a chain with no EIP-3009 domain', async () => {
    await expect(
      recoverAuthorizationSigner(resolve(solana.mainnet, 'solana'), authorization, '0x00'),
    ).rejects.toThrow('no EIP-3009 domain')
  })
})
