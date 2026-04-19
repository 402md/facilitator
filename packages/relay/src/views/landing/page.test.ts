import { afterAll, describe, expect, test } from 'bun:test'
import '@/shared/test-helpers'
import { LandingPage } from './page'

describe('LandingPage', () => {
  const html = LandingPage()

  test('renders as a large HTML string with doctype', () => {
    expect(typeof html).toBe('string')
    expect(html.startsWith('<!doctype html>')).toBe(true)
    expect(html.length).toBeGreaterThan(50_000)
  })

  test('includes the shared Nav (same component as the dashboard)', () => {
    expect(html).toContain('<nav class="nav">')
    expect(html).toContain('href="/dashboard"')
    expect(html).not.toContain('aria-current="page"') // not active on landing
  })

  test('renders the hero section and register anchor', () => {
    expect(html).toContain('class="hero"')
    expect(html).toContain('id="register"')
    expect(html).toContain('#how-it-works')
  })

  test('includes landing-specific styles and scripts', () => {
    expect(html).toContain('Scroll reveals')
    expect(html).toContain('register-form')
  })
})

describe('LandingPage env toggle', () => {
  const originalEnv = process.env.NETWORK_ENV

  afterAll(() => {
    if (originalEnv === undefined) delete process.env.NETWORK_ENV
    else process.env.NETWORK_ENV = originalEnv
  })

  test('on testnet: Mainnet radio is disabled, Testnet is checked', () => {
    process.env.NETWORK_ENV = 'testnet'
    const html = LandingPage()
    expect(html).toMatch(/id="env-mainnet"[^>]*?disabled[^>]*?\/>/)
    expect(html).toMatch(/id="env-testnet"[^>]*?checked[^>]*?\/>/)
    expect(html).not.toMatch(/id="env-mainnet"[^>]*?checked[^>]*?\/>/)
  })

  test('on mainnet: Testnet radio is disabled, Mainnet is checked', () => {
    process.env.NETWORK_ENV = 'mainnet'
    const html = LandingPage()
    expect(html).toMatch(/id="env-testnet"[^>]*?disabled[^>]*?\/>/)
    expect(html).toMatch(/id="env-mainnet"[^>]*?checked[^>]*?\/>/)
    expect(html).not.toMatch(/id="env-testnet"[^>]*?checked[^>]*?\/>/)
  })
})
