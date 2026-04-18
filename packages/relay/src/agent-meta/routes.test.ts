import { describe, test, expect } from 'bun:test'
import '@/shared/test-helpers'
import { Elysia } from 'elysia'
import { agentMetaRoutes, wantsMarkdown, HOMEPAGE_LINK_HEADER } from './routes'

const app = new Elysia().use(agentMetaRoutes)

function get(path: string, headers: Record<string, string> = {}) {
  return new Request(`http://localhost${path}`, { headers })
}

describe('wantsMarkdown', () => {
  test('true when only text/markdown is requested', () => {
    expect(wantsMarkdown('text/markdown')).toBe(true)
  })

  test('true when markdown has higher q than html', () => {
    expect(wantsMarkdown('text/html;q=0.5, text/markdown;q=0.9')).toBe(true)
  })

  test('false when html is preferred', () => {
    expect(wantsMarkdown('text/html, text/markdown;q=0.5')).toBe(false)
  })

  test('false when header is missing or wildcard', () => {
    expect(wantsMarkdown(null)).toBe(false)
    expect(wantsMarkdown('*/*')).toBe(false)
  })
})

describe('HOMEPAGE_LINK_HEADER', () => {
  test('advertises the required agent-discovery relations', () => {
    expect(HOMEPAGE_LINK_HEADER).toContain('rel="api-catalog"')
    expect(HOMEPAGE_LINK_HEADER).toContain('rel="service-desc"')
    expect(HOMEPAGE_LINK_HEADER).toContain('rel="service-doc"')
    expect(HOMEPAGE_LINK_HEADER).toContain('rel="status"')
    expect(HOMEPAGE_LINK_HEADER).toContain('rel="sitemap"')
  })
})

describe('GET /robots.txt', () => {
  test('returns 200 as plain text with AI rules, content-signals, and sitemap', async () => {
    const res = await app.handle(get('/robots.txt'))
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toContain('text/plain')
    const body = await res.text()
    expect(body).toContain('User-agent: *')
    expect(body).toContain('User-agent: GPTBot')
    expect(body).toContain('User-agent: Claude-Web')
    expect(body).toContain('User-agent: Google-Extended')
    expect(body).toContain('Content-Signal:')
    expect(body).toContain('Sitemap: https://facilitator.402.md/sitemap.xml')
  })
})

describe('GET /sitemap.xml', () => {
  test('returns valid sitemap XML with canonical URLs', async () => {
    const res = await app.handle(get('/sitemap.xml'))
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toContain('application/xml')
    const body = await res.text()
    expect(body).toContain('<?xml')
    expect(body).toContain('<urlset')
    expect(body).toContain('https://facilitator.402.md/')
    expect(body).toContain('https://facilitator.402.md/dashboard')
    expect(body).toContain('https://facilitator.402.md/swagger')
  })
})

describe('GET /.well-known/api-catalog', () => {
  test('returns linkset+json with required relations', async () => {
    const res = await app.handle(get('/.well-known/api-catalog'))
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toContain('application/linkset+json')
    const body = (await res.json()) as {
      linkset: Array<{
        anchor: string
        'service-desc': Array<{ href: string }>
        'service-doc': Array<{ href: string }>
        status: Array<{ href: string }>
      }>
    }
    expect(body.linkset).toHaveLength(1)
    expect(body.linkset[0].anchor).toBe('https://facilitator.402.md/')
    expect(body.linkset[0]['service-desc'][0].href).toContain('/swagger/json')
    expect(body.linkset[0]['service-doc'][0].href).toContain('/swagger')
    expect(body.linkset[0].status[0].href).toContain('/health')
  })
})

describe('GET /.well-known/agent-skills/index.json', () => {
  test('returns a skills index with sha256 digests', async () => {
    const res = await app.handle(get('/.well-known/agent-skills/index.json'))
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toContain('application/json')
    const body = (await res.json()) as {
      $schema: string
      skills: Array<{ name: string; type: string; url: string; sha256: string }>
    }
    expect(body.$schema).toContain('agentskills.io')
    expect(body.skills.length).toBeGreaterThan(0)
    const howTo = body.skills.find((s) => s.name === 'how-to-use-facilitator')
    expect(howTo).toBeDefined()
    expect(howTo!.url).toContain('/.well-known/agent-skills/how-to-use-facilitator/SKILL.md')
    expect(howTo!.sha256).toMatch(/^[a-f0-9]{64}$/)
  })

  test('sha256 matches the actual SKILL.md body', async () => {
    const indexRes = await app.handle(get('/.well-known/agent-skills/index.json'))
    const index = (await indexRes.json()) as {
      skills: Array<{ name: string; sha256: string }>
    }
    const skillRes = await app.handle(
      get('/.well-known/agent-skills/how-to-use-facilitator/SKILL.md'),
    )
    const skillBody = await skillRes.text()
    const hasher = new Bun.CryptoHasher('sha256')
    hasher.update(skillBody)
    const actual = hasher.digest('hex')
    const howTo = index.skills.find((s) => s.name === 'how-to-use-facilitator')!
    expect(howTo.sha256).toBe(actual)
  })
})

describe('GET /.well-known/agent-skills/how-to-use-facilitator/SKILL.md', () => {
  test('returns markdown content describing how to use the facilitator', async () => {
    const res = await app.handle(get('/.well-known/agent-skills/how-to-use-facilitator/SKILL.md'))
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toContain('text/markdown')
    const body = await res.text()
    expect(body).toContain('name: how-to-use-facilitator')
    expect(body).toContain('POST https://facilitator.402.md/register')
    expect(body).toContain('CCTP V2')
  })
})
