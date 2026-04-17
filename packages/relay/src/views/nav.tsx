export type NavPage = 'dashboard'

interface NavProps {
  current?: NavPage
}

export const Nav = ({ current }: NavProps) => (
  <nav class="nav">
    <div class="nav-inner container">
      <a href="/" class="nav-brand">
        Facilitator
      </a>
      <div class="nav-links">
        <a href="/#how-it-works">How it works</a>
        <a href="/#pricing">Pricing</a>
        <a href="/#faq">FAQ</a>
        <a href="/dashboard" aria-current={current === 'dashboard' ? 'page' : undefined}>
          Dashboard
        </a>
      </div>
      <a href="/#register" class="nav-cta">
        Register now
      </a>
    </div>
  </nav>
)
