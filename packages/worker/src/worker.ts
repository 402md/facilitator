import { NativeConnection, Worker } from '@temporalio/worker'
import * as activities from './activities'

async function main() {
  const connection = await NativeConnection.connect({
    address: process.env.TEMPORAL_ADDRESS ?? 'localhost:7233',
  })

  const worker = await Worker.create({
    connection,
    namespace: process.env.TEMPORAL_NAMESPACE ?? '402md-settlement',
    taskQueue: 'fast-settlement',
    workflowsPath: new URL('./workflows', import.meta.url).pathname,
    activities,
  })

  console.log('402md worker started, polling fast-settlement + cross-settlement + ops')
  await worker.run()
}

main().catch((err) => {
  console.error('Worker failed:', err)
  process.exit(1)
})
