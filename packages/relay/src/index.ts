import { initTracing } from '@402md/shared/tracing'
import { validateNetworkEnv } from '@402md/shared/networks'

if (process.env.OTEL_ENABLED === 'true') initTracing({ serviceName: '402md-relay' })

const envCheck = validateNetworkEnv()
if (!envCheck.ok) {
  console.error(`Missing required environment variables: ${envCheck.missing.join(', ')}`)
  process.exit(1)
}

import { Elysia } from 'elysia'
import { cors } from '@elysiajs/cors'
import { swagger } from '@elysiajs/swagger'
import { sql } from 'drizzle-orm'
import { sellersRoutes } from '@/sellers/sellers.routes'
import { settlementsRoutes } from '@/settlements/settlements.routes'
import { onrampRoutes } from '@/onramp/onramp.routes'
import { stellarMppRoutes } from '@/mpp/stellar-mpp.routes'
import { db } from '@402md/shared/db'
import { redis } from '@402md/shared/cache'
import { getTemporalClient } from '@/shared/temporal'
import { checkRateLimit } from '@/shared/rate-limit'

export const app = new Elysia()
  .use(cors())
  .use(
    swagger({
      documentation: {
        info: { title: '402md Facilitator API', version: '0.1.0' },
      },
    }),
  )
  .onBeforeHandle(async ({ request, set }) => {
    const url = new URL(request.url)
    const ip = request.headers.get('x-forwarded-for') ?? 'unknown'
    try {
      await checkRateLimit(url.pathname, ip)
    } catch (err) {
      if (err instanceof Error && 'statusCode' in err) {
        set.status = (err as { statusCode: number }).statusCode
        return { error: (err as { code: string }).code, message: err.message }
      }
    }
  })
  .use(sellersRoutes)
  .use(settlementsRoutes)
  .use(onrampRoutes)
  .use(stellarMppRoutes)
  .get('/health', async () => {
    const checks = {
      db: 'unknown' as string,
      redis: 'unknown' as string,
      temporal: 'unknown' as string,
    }

    try {
      await db.execute(sql`SELECT 1`)
      checks.db = 'ok'
    } catch {
      checks.db = 'error'
    }

    try {
      await redis.ping()
      checks.redis = 'ok'
    } catch {
      checks.redis = 'error'
    }

    try {
      await getTemporalClient()
      checks.temporal = 'ok'
    } catch {
      checks.temporal = 'error'
    }

    const allOk = Object.values(checks).every((v) => v === 'ok')
    return {
      status: allOk ? 'ok' : 'degraded',
      services: checks,
      timestamp: new Date().toISOString(),
    }
  })
  .onError(({ error, set }) => {
    if ('statusCode' in error && typeof error.statusCode === 'number') {
      set.status = error.statusCode
      const details = (error as { details?: Record<string, unknown> }).details
      return {
        error: (error as { code?: string }).code ?? 'ERROR',
        message: error.message,
        ...(details ?? {}),
      }
    }
    set.status = 500
    return { error: 'INTERNAL_ERROR', message: 'Internal server error' }
  })

if (import.meta.main) {
  app.listen(process.env.PORT ?? 3000)
  console.log(`402md relay running on ${app.server?.url}`)
}
