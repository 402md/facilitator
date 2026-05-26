import { describe, expect, test } from 'bun:test'
import { Keypair, StrKey } from '@stellar/stellar-sdk'
import {
  splitSignature,
  padAddress,
  stellarAddressToBytes32,
  buildCctpForwarderHookData,
  extractMessageHash,
} from './evm-adapter'

// EIP-3009 reuses ECDSA signatures: 32 bytes r + 32 bytes s + 1 byte v.
// A bug here is silent — the wrong v recovers a different signer, so the
// USDC contract either reverts ("invalid signature") OR (worse) pulls from
// an attacker-controlled address. Coverage here is load-bearing.
describe('splitSignature — EIP-3009 authorization decomposition', () => {
  const r = '11'.repeat(32)
  const s = '22'.repeat(32)

  test('decomposes a canonical 65-byte hex signature (v = 27)', () => {
    const sig = `0x${r}${s}1b`
    expect(splitSignature(sig)).toEqual({
      r: `0x${r}`,
      s: `0x${s}`,
      v: 27,
    })
  })

  test('decomposes when v = 28 (the other parity)', () => {
    const sig = `0x${r}${s}1c`
    expect(splitSignature(sig).v).toBe(28)
  })

  test('accepts an unprefixed hex signature', () => {
    const sig = `${r}${s}1b`
    expect(splitSignature(sig)).toEqual({
      r: `0x${r}`,
      s: `0x${s}`,
      v: 27,
    })
  })

  test('two different signatures decompose to two different r/s pairs', () => {
    const a = splitSignature(`0x${'11'.repeat(32)}${'22'.repeat(32)}1b`)
    const b = splitSignature(`0x${'33'.repeat(32)}${'44'.repeat(32)}1b`)
    expect(a.r).not.toBe(b.r)
    expect(a.s).not.toBe(b.s)
  })
})

describe('padAddress — bytes32 recipient encoding for CCTP burn', () => {
  test('left-pads a 20-byte EVM address to 32 bytes', () => {
    const addr = '0x' + 'ab'.repeat(20)
    const padded = padAddress(addr)
    expect(padded.length).toBe(2 + 64)
    expect(padded.startsWith('0x000000000000000000000000ab')).toBe(true)
    expect(padded.endsWith('ab'.repeat(20))).toBe(true)
  })

  test('accepts an unprefixed address', () => {
    const padded = padAddress('ab'.repeat(20))
    expect(padded).toBe('0x' + '0'.repeat(24) + 'ab'.repeat(20))
  })
})

describe('stellarAddressToBytes32 — destination encoding for Stellar mint targeting', () => {
  test('encodes a valid G... Ed25519 public key (32 raw bytes, no padding)', () => {
    const account = Keypair.random().publicKey()
    const encoded = stellarAddressToBytes32(account)
    expect(encoded.length).toBe(2 + 64)
    // Reverse: hex back to 32 bytes equals StrKey decode.
    const raw = Buffer.from(encoded.slice(2), 'hex')
    expect(raw.equals(Buffer.from(StrKey.decodeEd25519PublicKey(account)))).toBe(true)
  })

  test('encodes a C... contract address via the contract decode branch', () => {
    // A valid Soroban contract strkey is 32 zero bytes encoded with the contract prefix.
    const contractRaw = Buffer.alloc(32, 0)
    const contractStrkey = StrKey.encodeContract(contractRaw)
    const encoded = stellarAddressToBytes32(contractStrkey)
    expect(encoded).toBe('0x' + '00'.repeat(32))
  })

  test('two different accounts encode to two different bytes32', () => {
    const a = stellarAddressToBytes32(Keypair.random().publicKey())
    const b = stellarAddressToBytes32(Keypair.random().publicKey())
    expect(a).not.toBe(b)
  })
})

describe('buildCctpForwarderHookData — Stellar forwarder hook payload', () => {
  test('encodes [16 zero bytes | u32(version=0) | u32(length) | utf8(recipient)]', () => {
    const recipient = 'G' + 'A'.repeat(55)
    const hex = buildCctpForwarderHookData(recipient)
    const buf = Buffer.from(hex.slice(2), 'hex')

    // First 24 bytes are reserved zeros (alloc'd, never written by the builder).
    expect(buf.subarray(0, 24).every((b) => b === 0)).toBe(true)
    // u32 BE at offset 24 = hook version = 0.
    expect(buf.readUInt32BE(24)).toBe(0)
    // u32 BE at offset 28 = recipient byte length.
    expect(buf.readUInt32BE(28)).toBe(recipient.length)
    // Bytes 32+ = UTF-8 of the recipient strkey.
    expect(buf.subarray(32).toString('utf8')).toBe(recipient)
  })

  test('total length = 32 + recipient.length', () => {
    const recipient = 'G' + 'A'.repeat(55)
    const hex = buildCctpForwarderHookData(recipient)
    const buf = Buffer.from(hex.slice(2), 'hex')
    expect(buf.length).toBe(32 + recipient.length)
  })
})

// extractMessageHash defines the CCTP message identity used downstream
// for attestation polling AND on-chain mint. Returning the wrong log here
// means cctpMint targets the wrong message — either it reverts, or worse
// (with a colliding hash on a different attestation) duplicates a settlement.
describe('extractMessageHash — CCTP MessageSent identity', () => {
  const MESSAGE_SENT_TOPIC = '0x8c5261668696ce22758910d05bab8f186d6eb247ceac2af2e82c7dc17669b036'

  test('returns the data field of the matching log', () => {
    const receipt = {
      logs: [{ topics: [MESSAGE_SENT_TOPIC, '0xother'], data: '0xMESSAGE_BYTES' }],
    }
    expect(extractMessageHash(receipt)).toBe('0xMESSAGE_BYTES')
  })

  test('skips unrelated logs and picks the matching one', () => {
    const receipt = {
      logs: [
        { topics: ['0xUNRELATED_TOPIC'], data: '0xnoise' },
        { topics: [MESSAGE_SENT_TOPIC], data: '0xMESSAGE_BYTES' },
      ],
    }
    expect(extractMessageHash(receipt)).toBe('0xMESSAGE_BYTES')
  })

  test('throws when no MessageSent log is present', () => {
    const receipt = { logs: [{ topics: ['0xUNRELATED'], data: '0xnoise' }] }
    expect(() => extractMessageHash(receipt)).toThrow(/MessageSent event not found/)
  })

  test('throws on empty logs', () => {
    expect(() => extractMessageHash({ logs: [] })).toThrow(/MessageSent event not found/)
  })

  test('returns the FIRST matching log when multiple are present', () => {
    const receipt = {
      logs: [
        { topics: [MESSAGE_SENT_TOPIC], data: '0xFIRST' },
        { topics: [MESSAGE_SENT_TOPIC], data: '0xSECOND' },
      ],
    }
    expect(extractMessageHash(receipt)).toBe('0xFIRST')
  })
})
