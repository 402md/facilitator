import { beforeEach, describe, expect, test } from 'bun:test'
import { mockRedis, resetAllMocks } from '@/shared/test-helpers'
import { checkReplay, markProcessed } from '@/shared/replay'

describe('checkReplay', () => {
  beforeEach(() => {
    resetAllMocks()
  })

  test('returns false for a new key', async () => {
    const result = await checkReplay('tx-abc-123')
    expect(result).toBe(false)
  })

  test('returns true after markProcessed', async () => {
    await markProcessed('tx-abc-123')
    const result = await checkReplay('tx-abc-123')
    expect(result).toBe(true)
  })
})

describe('markProcessed', () => {
  beforeEach(() => {
    resetAllMocks()
  })

  test('sets key with EX TTL of 86400', async () => {
    await markProcessed('tx-def-456')
    expect(mockRedis.set).toHaveBeenCalledWith('402md:replay:tx-def-456', '1', 'EX', 86400)
  })
})
