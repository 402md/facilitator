import { Elysia } from 'elysia'

const app = new Elysia()
  .get('/health', () => ({ status: 'ok' }))
  .listen(process.env.PORT ?? 3000)

console.log(`402md relay running on ${app.server?.url}`)
