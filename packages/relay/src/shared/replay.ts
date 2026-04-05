import { redis } from '@402md/shared/cache'

const REPLAY_TTL = 86400

export async function checkReplay(key: string): Promise<boolean> {
  const exists = await redis.exists(`402md:replay:${key}`)
  return exists === 1
}

export async function markProcessed(key: string): Promise<void> {
  await redis.set(`402md:replay:${key}`, '1', 'EX', REPLAY_TTL)
}
