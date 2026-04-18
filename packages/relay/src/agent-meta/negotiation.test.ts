import { describe, test, expect } from 'bun:test'
import '@/shared/test-helpers'
import { Elysia } from 'elysia'
import { html } from '@elysiajs/html'
import { LandingPage } from '@/views/landing/page'
import { DashboardPage } from '@/views/dashboard/page'
import {
  AGENT_DISCOVERY_LINK_HEADER,
  landingMarkdown,
  dashboardMarkdown,
  wantsMarkdown,
} from './routes'

// Mirrors the `/` and `/dashboard` handlers in src/index.ts. Kept in sync
// so agent-facing behavior (Accept negotiation + Link header) has a test
// without spinning up the full relay (DB/Redis/Temporal) in unit tests.
const app = new Elysia()
  .use(html())
  .get('/', ({ request, set }) => {
    set.headers['link'] = AGENT_DISCOVERY_LINK_HEADER
    set.headers['vary'] = 'Accept'
    if (wantsMarkdown(request.headers.get('accept'))) {
      set.headers['content-type'] = 'text/markdown; charset=utf-8'
      return landingMarkdown
    }
    return LandingPage()
  })
  .get('/dashboard', ({ request, set }) => {
    set.headers['link'] = AGENT_DISCOVERY_LINK_HEADER
    set.headers['vary'] = 'Accept'
    if (wantsMarkdown(request.headers.get('accept'))) {
      set.headers['content-type'] = 'text/markdown; charset=utf-8'
      return dashboardMarkdown
    }
    return DashboardPage()
  })

function get(path: string, headers: Record<string, string> = {}) {
  return new Request(`http://localhost${path}`, { headers })
}

describe('GET / — content negotiation', () => {
  test('returns HTML by default with Link and Vary headers', async () => {
    const res = await app.handle(get('/'))
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toContain('text/html')
    expect(res.headers.get('vary')).toBe('Accept')
    const link = res.headers.get('link')
    expect(link).toContain('rel="api-catalog"')
    expect(link).toContain('rel="service-desc"')
    const body = await res.text()
    expect(body.startsWith('<!doctype html>')).toBe(true)
  })

  test('returns markdown when Accept: text/markdown is preferred', async () => {
    const res = await app.handle(get('/', { accept: 'text/markdown' }))
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toContain('text/markdown')
    expect(res.headers.get('vary')).toBe('Accept')
    expect(res.headers.get('link')).toContain('rel="api-catalog"')
    const body = await res.text()
    expect(body).toContain('# 402md Facilitator')
    expect(body).toContain('POST https://facilitator.402.md/register')
  })
})

describe('GET /dashboard — content negotiation', () => {
  test('returns HTML by default with Link and Vary headers', async () => {
    const res = await app.handle(get('/dashboard'))
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toContain('text/html')
    expect(res.headers.get('vary')).toBe('Accept')
    expect(res.headers.get('link')).toContain('rel="service-desc"')
  })

  test('returns markdown when Accept: text/markdown is preferred', async () => {
    const res = await app.handle(get('/dashboard', { accept: 'text/markdown' }))
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toContain('text/markdown')
    const body = await res.text()
    expect(body).toContain('# 402md Facilitator — Activity dashboard')
    expect(body).toContain('/discovery/')
  })
})
