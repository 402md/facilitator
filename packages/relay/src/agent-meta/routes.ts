import { Elysia } from 'elysia'
import robotsTxt from './robots.txt' with { type: 'text' }
import sitemapXml from './sitemap.xml' with { type: 'text' }
import apiCatalogJson from './api-catalog.json' with { type: 'text' }
import howToUseSkillMd from './skills/how-to-use-facilitator.md' with { type: 'text' }
import landingMd from './landing.md' with { type: 'text' }
import dashboardMd from './dashboard.md' with { type: 'text' }

export const PUBLIC_BASE_URL = 'https://facilitator.402.md'

export const landingMarkdown = landingMd
export const dashboardMarkdown = dashboardMd

export function wantsMarkdown(acceptHeader: string | null | undefined): boolean {
  if (!acceptHeader) return false
  const entries = acceptHeader.split(',').map((part) => {
    const [media, ...params] = part.trim().split(';')
    const qParam = params.find((p) => p.trim().startsWith('q='))
    const q = qParam ? Number(qParam.split('=')[1]) : 1
    return { media: media.toLowerCase(), q: Number.isFinite(q) ? q : 1 }
  })
  const md = entries.find((e) => e.media === 'text/markdown')
  const html = entries.find((e) => e.media === 'text/html')
  if (!md || md.q === 0) return false
  if (!html) return true
  return md.q > html.q
}

export const HOMEPAGE_LINK_HEADER = [
  `</.well-known/api-catalog>; rel="api-catalog"; type="application/linkset+json"`,
  `</swagger/json>; rel="service-desc"; type="application/json"`,
  `</swagger>; rel="service-doc"; type="text/html"`,
  `</health>; rel="status"; type="application/json"`,
  `</sitemap.xml>; rel="sitemap"; type="application/xml"`,
  `</.well-known/agent-skills/index.json>; rel="https://agentskills.io/rel/index"; type="application/json"`,
].join(', ')

function sha256Hex(input: string): string {
  const hasher = new Bun.CryptoHasher('sha256')
  hasher.update(input)
  return hasher.digest('hex')
}

const SKILL_HOW_TO_USE_URL = `${PUBLIC_BASE_URL}/.well-known/agent-skills/how-to-use-facilitator/SKILL.md`

const agentSkillsIndex = {
  $schema: 'https://agentskills.io/schemas/index/v0.2.0.json',
  skills: [
    {
      name: 'how-to-use-facilitator',
      type: 'reference',
      description:
        'How an AI agent or an x402 seller integrates with the 402md Facilitator to send or receive cross-chain USDC payments.',
      url: SKILL_HOW_TO_USE_URL,
      sha256: sha256Hex(howToUseSkillMd),
    },
  ],
}

const agentSkillsIndexJson = JSON.stringify(agentSkillsIndex, null, 2)

export const agentMetaRoutes = new Elysia()
  .get(
    '/robots.txt',
    ({ set }) => {
      set.headers['content-type'] = 'text/plain; charset=utf-8'
      set.headers['cache-control'] = 'public, max-age=3600'
      return robotsTxt
    },
    { detail: { hide: true } },
  )
  .get(
    '/sitemap.xml',
    ({ set }) => {
      set.headers['content-type'] = 'application/xml; charset=utf-8'
      set.headers['cache-control'] = 'public, max-age=3600'
      return sitemapXml
    },
    { detail: { hide: true } },
  )
  .get(
    '/.well-known/api-catalog',
    ({ set }) => {
      set.headers['content-type'] = 'application/linkset+json'
      set.headers['cache-control'] = 'public, max-age=3600'
      return apiCatalogJson
    },
    { detail: { hide: true } },
  )
  .get(
    '/.well-known/agent-skills/index.json',
    ({ set }) => {
      set.headers['content-type'] = 'application/json; charset=utf-8'
      set.headers['cache-control'] = 'public, max-age=3600'
      return agentSkillsIndexJson
    },
    { detail: { hide: true } },
  )
  .get(
    '/.well-known/agent-skills/how-to-use-facilitator/SKILL.md',
    ({ set }) => {
      set.headers['content-type'] = 'text/markdown; charset=utf-8'
      set.headers['cache-control'] = 'public, max-age=3600'
      return howToUseSkillMd
    },
    { detail: { hide: true } },
  )
