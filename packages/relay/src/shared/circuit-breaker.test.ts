import { beforeEach, describe, expect, test } from 'bun:test'
import { mockRedis, resetAllMocks } from '@/shared/test-helpers'
import { checkCircuitBreakers, recordVolume } from '@/shared/circuit-breaker'
import { CircuitBreakerError } from '@/shared/errors'

describe('checkCircuitBreakers', () => {
  beforeEach(() => {
    resetAllMocks()
  })

  test('passes when pause is off and volume is below limits', async () => {
    await expect(checkCircuitBreakers('1000')).resolves.toBeUndefined()
  })

  test('throws when pause flag is true', async () => {
    mockRedis._store.set('402md:pause', 'true')
    await expect(checkCircuitBreakers('1000')).rejects.toBeInstanceOf(CircuitBreakerError)
    await expect(checkCircuitBreakers('1000')).rejects.toThrow('Settlement paused')
  })

  test('throws when amount exceeds MAX_TX_AMOUNT', async () => {
    await expect(checkCircuitBreakers('2000000000')).rejects.toBeInstanceOf(CircuitBreakerError)
    await expect(checkCircuitBreakers('2000000000')).rejects.toThrow('exceeds maximum')
  })

  test('throws when daily volume would exceed limit', async () => {
    const today = new Date().toISOString().slice(0, 10)
    const dailyKey = `402md:daily-volume:${today}`
    // Set existing volume to just under the default 10B limit
    mockRedis._store.set(dailyKey, '9999999999')

    await expect(checkCircuitBreakers('2')).rejects.toBeInstanceOf(CircuitBreakerError)
    await expect(checkCircuitBreakers('2')).rejects.toThrow('Daily volume limit exceeded')
  })
})

describe('recordVolume', () => {
  beforeEach(() => {
    resetAllMocks()
  })

  test('increments daily counter and sets expiry', async () => {
    await recordVolume('5000')

    const today = new Date().toISOString().slice(0, 10)
    const dailyKey = `402md:daily-volume:${today}`

    expect(mockRedis._store.get(dailyKey)).toBe('5000')
    expect(mockRedis._expiries.get(dailyKey)).toBe(86400)
    expect(mockRedis.incrby).toHaveBeenCalledWith(dailyKey, 5000)
    expect(mockRedis.expire).toHaveBeenCalledWith(dailyKey, 86400)
  })
})
