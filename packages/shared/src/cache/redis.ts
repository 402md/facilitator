import Redis from 'ioredis'

const REDIS_URL = process.env.REDIS_URL ?? 'redis://localhost:6379'

export const redis = new Redis(REDIS_URL)

// State tracking for clean single-line logging — ioredis retries automatically,
// but without an `error` listener it prints a full stack on every failed attempt.
let wasConnected = false
let failedAttempts = 0

redis.on('connect', () => {
  if (wasConnected) {
    console.log(`[redis] reconnected after ${failedAttempts} failed attempts`)
  } else {
    console.log(`[redis] connected to ${REDIS_URL}`)
  }
  wasConnected = true
  failedAttempts = 0
})

function describeError(err: unknown): string {
  // ioredis may emit a NodeAggregateError (wraps IPv4 + IPv6 attempts) whose
  // `.message` is empty — pull from `.code` or the first inner error instead.
  if (err instanceof AggregateError && err.errors[0] instanceof Error) {
    const inner = err.errors[0] as Error & { code?: string }
    return inner.code ?? inner.message ?? String(inner)
  }
  if (err instanceof Error) {
    const coded = err as Error & { code?: string }
    return coded.message || coded.code || String(err)
  }
  return String(err)
}

redis.on('error', (err: unknown) => {
  if (wasConnected) {
    console.error(`[redis] disconnected: ${describeError(err)}`)
    wasConnected = false
    failedAttempts = 0
    return
  }
  failedAttempts++
  // First failure: one diagnostic line. Subsequent retries: silent (ioredis handles them).
  if (failedAttempts === 1) {
    console.error(`[redis] unable to connect: ${describeError(err)}`)
    console.error(`[redis]   REDIS_URL=${REDIS_URL}`)
    console.error('[redis]   retrying in background — check that Redis is running and reachable')
  }
})

redis.on('end', () => {
  console.warn('[redis] connection closed')
})
