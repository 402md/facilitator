import { beforeEach, describe, expect, test } from 'bun:test'
import { resetAllMocks } from '@/shared/test-helpers'
import { checkRateLimit } from '@/shared/rate-limit'
import { RateLimitError } from '@/shared/errors'

describe('checkRateLimit', () => {
  beforeEach(() => {
    resetAllMocks()
  })

  test('allows request within limit', async () => {
    await expect(checkRateLimit('/register', '127.0.0.1')).resolves.toBeUndefined()
  })

  test('throws RateLimitError when limit exceeded', async () => {
    const ip = '192.168.1.1'
    // /register limit is 3 requests per hour
    await checkRateLimit('/register', ip)
    await checkRateLimit('/register', ip)
    await checkRateLimit('/register', ip)
    // 4th call should throw
    await expect(checkRateLimit('/register', ip)).rejects.toBeInstanceOf(RateLimitError)
  })

  test('returns without error for unknown path', async () => {
    await expect(checkRateLimit('/unknown-path', '127.0.0.1')).resolves.toBeUndefined()
  })
})
