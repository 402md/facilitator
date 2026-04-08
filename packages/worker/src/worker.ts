import { initTracing } from '@402md/shared/tracing'
import { validateNetworkEnv } from '@402md/shared/networks'

if (process.env.OTEL_ENABLED === 'true') {
  initTracing({ serviceName: '402md-worker', autoInstrument: true })
}

const envCheck = validateNetworkEnv({ requirePrivateKeys: true })
if (!envCheck.ok) {
  console.error(`Missing required environment variables: ${envCheck.missing.join(', ')}`)
  process.exit(1)
}

import { NativeConnection, Worker } from '@temporalio/worker'
import * as activities from './activities'

async function main() {
  const connection = await NativeConnection.connect({
    address: process.env.TEMPORAL_ADDRESS ?? 'localhost:7233',
  })

  const taskQueues = ['fast-settlement', 'cross-settlement']
  const workers = await Promise.all(
    taskQueues.map((taskQueue) =>
      Worker.create({
        connection,
        namespace: process.env.TEMPORAL_NAMESPACE ?? '402md-settlement',
        taskQueue,
        workflowsPath: new URL('./workflows', import.meta.url).pathname,
        activities,
      }),
    ),
  )

  console.log(`402md worker started, polling ${taskQueues.join(', ')}`)
  await Promise.all(workers.map((w) => w.run()))
}

main().catch((err) => {
  console.error('Worker failed:', err)
  process.exit(1)
})
