import { redis } from '@402md/shared/cache'
import { RateLimitError } from './errors'

interface RateLimitConfig {
  maxRequests: number
  windowSeconds: number
}

const RATE_LIMITS: Record<string, RateLimitConfig> = {
  '/register': { maxRequests: 3, windowSeconds: 3600 },
  '/verify': { maxRequests: 1000, windowSeconds: 60 },
  '/settle': { maxRequests: 500, windowSeconds: 60 },
  '/discover': { maxRequests: 100, windowSeconds: 60 },
  '/onramp': { maxRequests: 30, windowSeconds: 60 },
  '/mpp/config': { maxRequests: 100, windowSeconds: 60 },
  '/mpp/charge': { maxRequests: 500, windowSeconds: 60 },
}

export async function checkRateLimit(path: string, ip: string): Promise<void> {
  const config = RATE_LIMITS[path]
  if (!config) return

  const key = `402md:rate:${path}:${ip}`
  const current = await redis.incr(key)

  if (current === 1) {
    await redis.expire(key, config.windowSeconds)
  }

  if (current > config.maxRequests) {
    throw new RateLimitError()
  }
}
