import { beforeEach, describe, expect, test } from 'bun:test'
import { resetAllMocks, mockTemporal } from '@/shared/test-helpers'
import { findFailedWorkflows } from './dead-letter.service'

describe('findFailedWorkflows', () => {
  beforeEach(() => {
    resetAllMocks()
  })

  test('returns list of failed workflows', async () => {
    const startTime = new Date()
    mockTemporal.setWorkflows([
      { workflowId: 'cross-1', runId: 'run-1', status: 'FAILED', startTime },
    ])

    const result = await findFailedWorkflows()

    expect(result).toHaveLength(1)
    expect(result[0].workflowId).toBe('cross-1')
    expect(result[0].runId).toBe('run-1')
    expect(result[0].status).toBe('FAILED')
    expect(result[0].startTime).toBe(startTime)
  })

  test('returns empty array when no failed workflows exist', async () => {
    mockTemporal.setWorkflows([])

    const result = await findFailedWorkflows()

    expect(result).toEqual([])
  })
})
