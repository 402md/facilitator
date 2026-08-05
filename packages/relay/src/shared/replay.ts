import { redis } from '@402md/shared/cache'

const REPLAY_TTL = 86400

/**
 * Claim a replay key for this settlement attempt.
 *
 * `SET NX` so two concurrent settles for the same signature cannot both win —
 * a check followed by a separate write leaves a window where both pass.
 * Returns false when the key is already held.
 */
export async function reserveReplay(key: string): Promise<boolean> {
  const result = await redis.set(`402md:replay:${key}`, '1', 'EX', REPLAY_TTL, 'NX')
  return result === 'OK'
}

/**
 * Hand the key back so a legitimate retry can settle. Only safe before the
 * workflow is durably started — once it is running, the key must stay held.
 */
export async function releaseReplay(key: string): Promise<void> {
  await redis.del(`402md:replay:${key}`)
}
