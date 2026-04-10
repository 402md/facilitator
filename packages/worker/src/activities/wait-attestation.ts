import { heartbeat } from '@temporalio/activity'
import { getCircleIrisUrl } from '@402md/shared/networks'
import type { WaitAttestationInput } from '@/shared/types'
import type { AttestationResult } from '@402md/shared/networks'

export async function waitAttestation(input: WaitAttestationInput): Promise<AttestationResult> {
  const pollInterval = 5000
  const maxAttempts = 360
  const url = `${getCircleIrisUrl()}/v2/messages/${input.sourceDomain}?transactionHash=${input.txHash}`

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    heartbeat(`Polling attestation, attempt ${attempt + 1}`)

    const response = await fetch(url)
    if (!response.ok) {
      await sleep(pollInterval)
      continue
    }

    const data = (await response.json()) as {
      messages?: Array<{
        status: string
        attestation?: string
        message?: string
      }>
    }

    const msg = data.messages?.[0]
    if (msg?.status === 'complete' && msg.attestation && msg.message) {
      return {
        attestation: msg.attestation,
        messageBytes: msg.message,
      }
    }

    await sleep(pollInterval)
  }

  throw new Error(`Attestation not received after ${maxAttempts} attempts for tx ${input.txHash}`)
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
