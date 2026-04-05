import { redis } from '@402md/shared/cache'
import { CircuitBreakerError } from './errors'

const MAX_TX_AMOUNT = process.env.MAX_TX_AMOUNT ?? '1000000000'
const DAILY_VOLUME_LIMIT = process.env.DAILY_VOLUME_LIMIT ?? '10000000000'

export async function checkCircuitBreakers(amount: string): Promise<void> {
  const paused = await redis.get('402md:pause')
  if (paused === 'true') {
    throw new CircuitBreakerError('Settlement paused')
  }

  if (BigInt(amount) > BigInt(MAX_TX_AMOUNT)) {
    throw new CircuitBreakerError(`Amount ${amount} exceeds maximum ${MAX_TX_AMOUNT}`)
  }

  const today = new Date().toISOString().slice(0, 10)
  const dailyKey = `402md:daily-volume:${today}`
  const currentVolume = await redis.get(dailyKey)
  if (currentVolume && BigInt(currentVolume) + BigInt(amount) > BigInt(DAILY_VOLUME_LIMIT)) {
    throw new CircuitBreakerError('Daily volume limit exceeded')
  }
}

export async function recordVolume(amount: string): Promise<void> {
  const today = new Date().toISOString().slice(0, 10)
  const dailyKey = `402md:daily-volume:${today}`
  await redis.incrby(dailyKey, parseInt(amount, 10))
  await redis.expire(dailyKey, 86400)
}
