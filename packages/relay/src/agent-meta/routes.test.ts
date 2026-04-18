import { describe, test, expect } from 'bun:test'
import '@/shared/test-helpers'
import { Elysia } from 'elysia'
import { agentMetaRoutes, wantsMarkdown, AGENT_DISCOVERY_LINK_HEADER } from './routes'

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

describe('AGENT_DISCOVERY_LINK_HEADER', () => {
  test('advertises the required agent-discovery relations', () => {
    expect(AGENT_DISCOVERY_LINK_HEADER).toContain('rel="api-catalog"')
    expect(AGENT_DISCOVERY_LINK_HEADER).toContain('rel="service-desc"')
    expect(AGENT_DISCOVERY_LINK_HEADER).toContain('rel="service-doc"')
    expect(AGENT_DISCOVERY_LINK_HEADER).toContain('rel="status"')
    expect(AGENT_DISCOVERY_LINK_HEADER).toContain('rel="sitemap"')
  })
})

describe('GET /robots.txt', () => {
  test('returns 200 as plain text with AI rules, content-signal, and sitemap', async () => {
    const res = await app.handle(get('/robots.txt'))
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toContain('text/plain')
    const body = await res.text()
    expect(body).toContain('User-agent: *')
    expect(body).toContain('User-agent: GPTBot')
    expect(body).toContain('User-agent: Claude-Web')
    expect(body).toContain('User-agent: Google-Extended')
    expect(body).toContain('Sitemap: https://facilitator.402.md/sitemap.xml')
  })

  test('places Content-Signal inside the User-agent: * block', async () => {
    const res = await app.handle(get('/robots.txt'))
    const body = await res.text()
    const starIdx = body.indexOf('User-agent: *')
    const signalIdx = body.indexOf('Content-Signal:')
    const nextGroupIdx = body.indexOf('User-agent: GPTBot')
    expect(starIdx).toBeGreaterThanOrEqual(0)
    expect(signalIdx).toBeGreaterThan(starIdx)
    expect(signalIdx).toBeLessThan(nextGroupIdx)
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
    expect(body).toContain('https://facilitator.402.md/swagger')
  })

  test('does not list /dashboard (it is Disallow-ed in robots.txt)', async () => {
    const res = await app.handle(get('/sitemap.xml'))
    const body = await res.text()
    expect(body).not.toContain('/dashboard')
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
  test('conforms to the agent-skills-discovery v0.2.0 schema', async () => {
    const res = await app.handle(get('/.well-known/agent-skills/index.json'))
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toContain('application/json')
    const body = (await res.json()) as {
      $schema: string
      skills: Array<{
        name: string
        type: string
        description: string
        url: string
        digest: string
      }>
    }
    expect(body.$schema).toBe('https://schemas.agentskills.io/discovery/0.2.0/schema.json')
    expect(body.skills.length).toBeGreaterThan(0)
    const howTo = body.skills.find((s) => s.name === 'how-to-use-facilitator')
    expect(howTo).toBeDefined()
    expect(howTo!.type).toBe('skill-md')
    expect(howTo!.url).toContain('/.well-known/agent-skills/how-to-use-facilitator/SKILL.md')
    expect(howTo!.digest).toMatch(/^sha256:[a-f0-9]{64}$/)
  })

  test('digest matches the actual SKILL.md body', async () => {
    const indexRes = await app.handle(get('/.well-known/agent-skills/index.json'))
    const index = (await indexRes.json()) as {
      skills: Array<{ name: string; digest: string }>
    }
    const skillRes = await app.handle(
      get('/.well-known/agent-skills/how-to-use-facilitator/SKILL.md'),
    )
    const skillBody = await skillRes.text()
    const hasher = new Bun.CryptoHasher('sha256')
    hasher.update(skillBody)
    const expected = `sha256:${hasher.digest('hex')}`
    const howTo = index.skills.find((s) => s.name === 'how-to-use-facilitator')!
    expect(howTo.digest).toBe(expected)
  })
})

describe('GET /.well-known/agent-skills/how-to-use-facilitator/SKILL.md', () => {
  test('returns markdown content describing how to use the facilitator', async () => {
    const res = await app.handle(get('/.well-known/agent-skills/how-to-use-facilitator/SKILL.md'))
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toContain('text/markdown')
    const body = await res.text()
    expect(body).toContain('name: how-to-use-facilitator')
    expect(body).toContain('type: skill-md')
    expect(body).toContain('POST https://facilitator.402.md/register')
    expect(body).toContain('CCTP V2')
  })
})
