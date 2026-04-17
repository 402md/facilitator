import { describe, expect, test } from 'bun:test'
import '@/shared/test-helpers'
import { DashboardPage } from './page'

describe('DashboardPage', () => {
  const html = DashboardPage()

  test('renders as a non-empty HTML string', () => {
    expect(typeof html).toBe('string')
    expect(html.length).toBeGreaterThan(1000)
  })

  test('starts with the HTML5 doctype', () => {
    expect(html.startsWith('<!doctype html>')).toBe(true)
  })

  test('includes the shared Nav with Dashboard marked current', () => {
    expect(html).toContain('<nav class="nav">')
    expect(html).toContain('aria-current="page"')
    expect(html).toContain('>Dashboard</a>')
  })

  test('exposes config via window.__DASHBOARD__', () => {
    expect(html).toContain('window.__DASHBOARD__')
    expect(html).toContain('"Base"')
    expect(html).toContain('"Stellar"')
  })

  test('renders the six polling containers', () => {
    expect(html).toContain('id="chain-grid"')
    expect(html).toContain('id="route-matrix"')
    expect(html).toContain('id="resources-container"')
    expect(html).toContain('id="sellers-container"')
    expect(html).toContain('id="transactions-container"')
    expect(html).toContain('id="cost-container"')
  })

  test('renders the window + rank toggles', () => {
    expect(html).toContain('id="window-toggle"')
    expect(html).toContain('id="resource-rank"')
    expect(html).toContain('id="seller-rank"')
  })

  test('closes with the footer and polling script', () => {
    expect(html).toContain('Data refreshes every 30s')
    expect(html).toContain('setInterval(refreshAll, 30_000)')
  })
})
