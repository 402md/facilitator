// Base CSS tokens + global reset + container + nav styles.
// Shared across every page served by the relay. The nav CSS here is the canonical
// copy — landing and dashboard both inherit it, so the navbar is visually identical.
// Kept as a string so it can be inlined once into <Layout> — no external file
// fetch, no FOUC, no drift.
export const sharedStyles = /* css */ `
  *,
  *::before,
  *::after {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }

  :root {
    --bg: oklch(0.98 0.003 250);
    --bg-alt: oklch(0.96 0.006 250);
    --text: oklch(0.15 0.02 250);
    --text-2: oklch(0.45 0.02 250);
    --text-3: oklch(0.55 0.015 250);
    --border: oklch(0.91 0.008 250);
    --border-mid: oklch(0.85 0.012 250);
    --accent: oklch(0.48 0.2 250);
    --accent-soft: oklch(0.93 0.04 250);
    --green: oklch(0.55 0.16 145);
    --green-soft: oklch(0.96 0.025 145);
    --purple: oklch(0.55 0.18 300);
    --purple-soft: oklch(0.96 0.025 300);
    --warn: oklch(0.62 0.18 60);
    --space-xs: 4px;
    --space-sm: 8px;
    --space-md: 16px;
    --space-lg: 24px;
    --space-xl: 32px;
    --space-2xl: 48px;
    --radius: 6px;
    --radius-lg: 10px;
    --ease-out-quart: cubic-bezier(0.25, 1, 0.5, 1);
  }

  html {
    scroll-behavior: smooth;
  }

  body {
    font-family: 'Red Hat Text', system-ui, sans-serif;
    color: var(--text);
    background: var(--bg);
    font-size: 0.95rem;
    line-height: 1.5;
    -webkit-font-smoothing: antialiased;
  }

  a {
    color: var(--accent);
    text-decoration: none;
  }
  a:hover {
    text-decoration: underline;
  }

  .container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 0 var(--space-lg);
  }

  /* ══════════════════════════════════════════
     NAV — canonical source, used by every page
     ══════════════════════════════════════════ */
  .nav {
    position: sticky;
    top: 0;
    z-index: 100;
    background: oklch(0.98 0.003 250 / 0.88);
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);
    border-bottom: 1px solid var(--border);
    height: 56px;
    transition: box-shadow 200ms var(--ease-out-quart);
  }
  .nav.scrolled {
    box-shadow: 0 1px 12px oklch(0.15 0.02 250 / 0.06);
  }

  .nav-inner {
    display: flex;
    align-items: center;
    height: 100%;
    gap: var(--space-lg);
  }

  .nav-brand {
    display: flex;
    align-items: center;
    gap: var(--space-sm);
    font-family: 'JetBrains Mono', monospace;
    font-weight: 500;
    font-size: 0.875rem;
    letter-spacing: -0.02em;
  }
  .nav-brand:hover {
    text-decoration: none;
  }

  .nav-links {
    display: flex;
    align-items: center;
    gap: var(--space-md);
    margin-left: auto;
    font-size: 0.75rem;
    color: var(--text-2);
  }
  .nav-links a {
    transition: color 150ms;
  }
  .nav-links a:hover {
    color: var(--text);
    text-decoration: none;
  }
  .nav-links a[aria-current='page'] {
    color: var(--text);
    font-weight: 500;
  }

  .nav-cta {
    display: inline-flex;
    align-items: center;
    margin-left: auto;
    padding: var(--space-sm) var(--space-md);
    background: var(--text);
    color: var(--bg);
    border-radius: var(--radius);
    font-size: 0.875rem;
    font-weight: 500;
    transition:
      background-color 150ms,
      transform 80ms;
  }
  .nav-cta:hover {
    background: oklch(0.25 0.02 250);
    text-decoration: none;
  }
  .nav-cta:active {
    transform: scale(0.97);
  }

  @media (min-width: 768px) {
    .nav-links {
      gap: var(--space-lg);
      font-size: 0.875rem;
    }
    .nav-cta {
      margin-left: 0;
    }
  }

  @media (max-width: 480px) {
    .nav-links {
      display: none;
    }
    .nav-cta {
      margin-left: auto;
    }
  }
`
