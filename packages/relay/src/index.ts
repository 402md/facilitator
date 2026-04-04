import { Elysia } from 'elysia'
import { cors } from '@elysiajs/cors'
import { swagger } from '@elysiajs/swagger'
import { sellersRoutes } from '@/sellers/sellers.routes'

export const app = new Elysia()
  .use(cors())
  .use(swagger({
    documentation: {
      info: { title: '402md Bridge API', version: '0.1.0' },
    },
  }))
  .use(sellersRoutes)
  .get('/health', () => ({ status: 'ok', timestamp: new Date().toISOString() }))
  .onError(({ error, set }) => {
    if ('statusCode' in error && typeof error.statusCode === 'number') {
      set.status = error.statusCode
      return {
        error: (error as { code?: string }).code ?? 'ERROR',
        message: error.message,
      }
    }
    set.status = 500
    return { error: 'INTERNAL_ERROR', message: 'Internal server error' }
  })

if (import.meta.main) {
  app.listen(process.env.PORT ?? 3000)
  console.log(`402md relay running on ${app.server?.url}`)
}
