import { getTemporalClient } from '@/shared/temporal'

export async function findFailedWorkflows() {
  const temporal = await getTemporalClient()
  const workflows = temporal.workflow.list({
    query: `ExecutionStatus = "Failed" AND settlementStatus = "mint_pending"`,
  })

  const failed = []
  for await (const workflow of workflows) {
    failed.push({
      workflowId: workflow.workflowId,
      runId: workflow.runId,
      status: workflow.status,
      startTime: workflow.startTime,
    })
  }
  return failed
}
