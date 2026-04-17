import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts'
import { Keypair as SolanaKeypair } from '@solana/web3.js'
import { Keypair as StellarKeypair } from '@stellar/stellar-sdk'

// EVM — one private key is reused across every EIP-155 chain (same 0x address).
const evmPk = generatePrivateKey()
const evmAccount = privateKeyToAccount(evmPk)

// Solana
const solanaKeypair = SolanaKeypair.generate()
const solanaSecretBase64 = Buffer.from(solanaKeypair.secretKey).toString('base64')

// Stellar
const stellarKeypair = StellarKeypair.random()

const EVM_SLUGS = ['BASE', 'ETHEREUM', 'OPTIMISM', 'ARBITRUM', 'LINEA', 'UNICHAIN', 'WORLDCHAIN']

console.log('\n=== RELAY .env (endereços públicos) ===\n')
for (const slug of EVM_SLUGS) {
  console.log(`FACILITATOR_${slug}=${evmAccount.address}`)
}
console.log(`FACILITATOR_SOLANA=${solanaKeypair.publicKey.toBase58()}`)
console.log(`FACILITATOR_STELLAR=${stellarKeypair.publicKey()}`)

console.log('\n=== WORKER .env (endereços + private keys) ===\n')
for (const slug of EVM_SLUGS) {
  console.log(`FACILITATOR_${slug}=${evmAccount.address}`)
}
console.log(`FACILITATOR_SOLANA=${solanaKeypair.publicKey.toBase58()}`)
console.log(`FACILITATOR_STELLAR=${stellarKeypair.publicKey()}`)
console.log(`FACILITATOR_PRIVATE_KEY_EVM=${evmPk}`)
console.log(`FACILITATOR_PRIVATE_KEY_SOLANA=${solanaSecretBase64}`)
console.log(`FACILITATOR_PRIVATE_KEY_STELLAR=${stellarKeypair.secret()}`)
console.log('\n⚠️  These are DEV wallets. Never commit or reuse in production.\n')
