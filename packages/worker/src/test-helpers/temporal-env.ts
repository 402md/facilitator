import { TestWorkflowEnvironment } from '@temporalio/testing'
import { bundleWorkflowCode, type WorkflowBundleWithSourceMap } from '@temporalio/worker'

/**
 * Custom search attributes the production workflows upsert.
 * Dev-server requires every key to be pre-registered; default cap is 3
 * KEYWORD_LIST per namespace, so we register one as KEYWORD instead.
 */
const searchAttributeKeys = [
  { name: 'sellerNetwork', type: 'KEYWORD_LIST' as const },
  { name: 'buyerNetwork', type: 'KEYWORD_LIST' as const },
  { name: 'settlementStatus', type: 'KEYWORD_LIST' as const },
  { name: 'protocol', type: 'KEYWORD' as const },
]

let cachedBundle: WorkflowBundleWithSourceMap | undefined

export async function getWorkflowBundle(): Promise<WorkflowBundleWithSourceMap> {
  if (!cachedBundle) {
    cachedBundle = await bundleWorkflowCode({
      workflowsPath: new URL('../workflows/index.ts', import.meta.url).pathname,
    })
  }
  return cachedBundle
}

export async function createTestEnv(): Promise<TestWorkflowEnvironment> {
  return TestWorkflowEnvironment.createLocal({
    server: { searchAttributes: searchAttributeKeys },
  })
}
