import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts'
import { Keypair as SolanaKeypair } from '@solana/web3.js'
import { Keypair as StellarKeypair } from '@stellar/stellar-sdk'

// Base (EVM)
const basePk = generatePrivateKey()
const baseAccount = privateKeyToAccount(basePk)

// Solana
const solanaKeypair = SolanaKeypair.generate()
const solanaSecretBase64 = Buffer.from(solanaKeypair.secretKey).toString('base64')

// Stellar
const stellarKeypair = StellarKeypair.random()

console.log('\n=== RELAY .env (endereços públicos) ===\n')
console.log(`FACILITATOR_BASE=${baseAccount.address}`)
console.log(`FACILITATOR_SOLANA=${solanaKeypair.publicKey.toBase58()}`)
console.log(`FACILITATOR_STELLAR=${stellarKeypair.publicKey()}`)

console.log('\n=== WORKER .env (endereços + private keys) ===\n')
console.log(`FACILITATOR_BASE=${baseAccount.address}`)
console.log(`FACILITATOR_SOLANA=${solanaKeypair.publicKey.toBase58()}`)
console.log(`FACILITATOR_STELLAR=${stellarKeypair.publicKey()}`)
console.log(`FACILITATOR_PRIVATE_KEY_BASE=${basePk}`)
console.log(`FACILITATOR_PRIVATE_KEY_SOLANA=${solanaSecretBase64}`)
console.log(`FACILITATOR_PRIVATE_KEY_STELLAR=${stellarKeypair.secret()}`)
console.log('\n⚠️  These are DEV wallets. Never commit or reuse in production.\n')
