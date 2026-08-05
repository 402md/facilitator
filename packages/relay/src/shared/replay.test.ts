import { beforeEach, describe, expect, test } from 'bun:test'
import { mockRedis, resetAllMocks } from '@/shared/test-helpers'
import { releaseReplay, reserveReplay } from '@/shared/replay'

describe('reserveReplay', () => {
  beforeEach(() => {
    resetAllMocks()
  })

  test('claims a new key with an EX TTL of 86400 and NX', async () => {
    const claimed = await reserveReplay('tx-abc-123')

    expect(claimed).toBe(true)
    expect(mockRedis.set).toHaveBeenCalledWith('402md:replay:tx-abc-123', '1', 'EX', 86400, 'NX')
  })

  test('refuses a key that is already held', async () => {
    await reserveReplay('tx-abc-123')

    expect(await reserveReplay('tx-abc-123')).toBe(false)
  })

  test('only one of two concurrent claims wins', async () => {
    const results = await Promise.all([reserveReplay('tx-race'), reserveReplay('tx-race')])

    expect(results.filter(Boolean)).toHaveLength(1)
  })
})

describe('releaseReplay', () => {
  beforeEach(() => {
    resetAllMocks()
  })

  test('lets the key be claimed again', async () => {
    await reserveReplay('tx-def-456')
    await releaseReplay('tx-def-456')

    expect(await reserveReplay('tx-def-456')).toBe(true)
  })
})
