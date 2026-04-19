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
    /* Warm cream surface + cobalt accent + amber signal.
       Ported from agentcard.402.md; hues shifted from cool 250 to warm 55-75
       with a saturated cobalt at 265 for accents. */
    --bg: oklch(0.98 0.008 75);
    --bg-alt: oklch(0.96 0.012 70);
    --text: oklch(0.17 0.015 55);
    --text-2: oklch(0.48 0.008 65);
    --text-3: oklch(0.55 0.006 65);
    --border: oklch(0.91 0.008 70);
    --border-mid: oklch(0.83 0.01 65);
    --accent: lab(36.3711% 32.2143 -77.8757);
    --accent-deep: lab(23.9314% 41.9718 -78.2984);
    --accent-soft: lab(91.5557% 0.535876 -20.4306);
    --green: oklch(0.42 0.16 145);
    --green-soft: oklch(0.96 0.025 145);
    --purple: oklch(0.42 0.18 300);
    --purple-soft: oklch(0.96 0.025 300);
    --warn: oklch(0.72 0.14 65);
    --warn-soft: oklch(0.95 0.05 80);
    --warn-deep: oklch(0.42 0.16 65);
    --error: oklch(0.42 0.2 25);
    --error-soft: oklch(0.96 0.03 20);
    --signal-deep: lab(44% 22 74);
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

  body::before {
    content: '';
    display: block;
    height: 2px;
    background: var(--accent);
  }

  a {
    color: var(--accent);
    text-decoration: none;
  }
  a:hover {
    text-decoration: underline;
  }

  :focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: 2px;
  }

  .sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
  }

  .container {
    max-width: 960px;
    margin: 0 auto;
    padding: 0 clamp(1rem, 5vw, 2.5rem);
  }

  /* ══════════════════════════════════════════
     TESTNET BANNER — solid amber strip pinned above the nav
     ══════════════════════════════════════════ */
  .testnet-banner {
    background: var(--warn);
    color: var(--text);
    font-size: 0.75rem;
    font-weight: 500;
    text-align: center;
    padding: var(--space-sm) var(--space-md);
  }
  .testnet-banner-cta {
    color: inherit;
    font-weight: 600;
    text-decoration: underline;
    text-underline-offset: 3px;
    white-space: nowrap;
  }
  .testnet-banner-cta:hover {
    text-decoration: none;
  }
  @media (min-width: 640px) {
    .testnet-banner {
      font-size: 0.875rem;
    }
  }

  /* ══════════════════════════════════════════
     NAV — canonical source, used by every page
     ══════════════════════════════════════════ */
  .nav {
    position: sticky;
    top: 0;
    z-index: 100;
    background: oklch(0.98 0.008 75 / 0.88);
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);
    border-bottom: 1px solid var(--border);
    height: 56px;
    transition: box-shadow 200ms var(--ease-out-quart);
  }
  .nav.scrolled {
    box-shadow: 0 1px 12px oklch(0.17 0.015 55 / 0.06);
  }

  .nav-inner {
    max-width: 960px;
    margin: 0 auto;
    padding: 0 clamp(1rem, 5vw, 2.5rem);
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
    color: var(--text);
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
    color: inherit;
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

  @media (min-width: 768px) {
    .nav-links {
      gap: var(--space-lg);
      font-size: 0.875rem;
    }
  }

  @media (max-width: 767px) {
    .nav-inner {
      gap: var(--space-md);
    }
    .nav-links {
      gap: var(--space-md);
      font-size: 0.75rem;
      min-width: 0;
      overflow-x: auto;
      scrollbar-width: none;
      -webkit-overflow-scrolling: touch;
      scroll-snap-type: x proximity;
    }
    .nav-links::-webkit-scrollbar {
      display: none;
    }
    .nav-links a {
      white-space: nowrap;
      scroll-snap-align: start;
      padding: 6px 0;
    }
  }

  /* ══════════════════════════════════════════
     TOUCH TARGETS — enforce 44px on coarse pointers
     Matches Apple HIG / Material. Desktop mouse users
     keep the denser default.
     ══════════════════════════════════════════ */
  @media (pointer: coarse) {
    .nav-links a,
    .btn-primary,
    .btn-outline,
    .register-btn,
    .network-label,
    .eco-link,
    .copy-btn,
    .window-toggle button,
    .rank-toggle button {
      min-height: 44px;
    }
    .nav-links a {
      display: inline-flex;
      align-items: center;
    }
    .copy-btn {
      display: inline-flex;
      align-items: center;
      padding-left: var(--space-md);
      padding-right: var(--space-md);
    }
  }
`
