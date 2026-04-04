import { heartbeat } from '@temporalio/activity'
import type { WaitAttestationInput, AttestationResult } from '@/shared/types'

const CIRCLE_API = 'https://iris-api.circle.com/attestations'

export async function waitAttestation(input: WaitAttestationInput): Promise<AttestationResult> {
  const pollInterval = 5000
  const maxAttempts = 360

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    heartbeat(`Polling attestation, attempt ${attempt + 1}`)

    const response = await fetch(`${CIRCLE_API}/${input.messageHash}`)
    if (!response.ok) {
      await sleep(pollInterval)
      continue
    }

    const data = (await response.json()) as {
      status: string
      attestation?: string
      message?: string
    }

    if (data.status === 'complete' && data.attestation && data.message) {
      return {
        attestation: data.attestation,
        messageBytes: data.message,
      }
    }

    await sleep(pollInterval)
  }

  throw new Error(`Attestation not received after ${maxAttempts} attempts for ${input.messageHash}`)
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
