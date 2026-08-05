import { recoverTypedDataAddress, type Hex } from 'viem'
import type { ResolvedNetwork } from './adapter.types'

export interface TransferAuthorization {
  from: string
  to: string
  value: string
  validAfter: string
  validBefore: string
  nonce: string
}

const TRANSFER_WITH_AUTHORIZATION_TYPES = {
  TransferWithAuthorization: [
    { name: 'from', type: 'address' },
    { name: 'to', type: 'address' },
    { name: 'value', type: 'uint256' },
    { name: 'validAfter', type: 'uint256' },
    { name: 'validBefore', type: 'uint256' },
    { name: 'nonce', type: 'bytes32' },
  ],
} as const

/** EIP-3009 signatures are 65 bytes: r (32) + s (32) + v (1). */
const SIGNATURE_LENGTH = 2 + 65 * 2

export function supportsEip3009(network: ResolvedNetwork): boolean {
  return Boolean(network.viemChain && network.usdcEip712)
}

export function isWellFormedSignature(signature: string): boolean {
  return /^0x[0-9a-fA-F]+$/.test(signature) && signature.length === SIGNATURE_LENGTH
}

/**
 * Recover the address that signed an EIP-3009 `TransferWithAuthorization`.
 *
 * The EIP-712 domain is built from our own chain registry, never from the
 * request — otherwise a caller could name a domain it happens to hold a valid
 * signature for and pass verification for a transfer USDC would reject.
 */
export async function recoverAuthorizationSigner(
  network: ResolvedNetwork,
  authorization: TransferAuthorization,
  signature: string,
): Promise<string> {
  if (!network.viemChain || !network.usdcEip712) {
    throw new Error(`Network ${network.caip2} has no EIP-3009 domain configured`)
  }

  return recoverTypedDataAddress({
    domain: {
      name: network.usdcEip712.name,
      version: network.usdcEip712.version,
      chainId: network.viemChain.id,
      verifyingContract: network.usdc as Hex,
    },
    types: TRANSFER_WITH_AUTHORIZATION_TYPES,
    primaryType: 'TransferWithAuthorization',
    message: {
      from: authorization.from as Hex,
      to: authorization.to as Hex,
      value: BigInt(authorization.value),
      validAfter: BigInt(authorization.validAfter),
      validBefore: BigInt(authorization.validBefore),
      nonce: authorization.nonce as Hex,
    },
    signature: signature as Hex,
  })
}
