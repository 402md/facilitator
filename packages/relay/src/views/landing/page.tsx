import { resolveNetworkEnv } from '@402md/shared/networks'
import { Layout } from '../layout'
import { Nav } from '../nav'
import { TestnetBanner } from '../testnet-banner'
import landingContent from './content.html' with { type: 'text' }
import landingStyles from './styles.css' with { type: 'text' }
import landingScript from './script.txt' with { type: 'text' }

const lockEnvToggle = (html: string, env: 'mainnet' | 'testnet'): string => {
  const disabledId = env === 'testnet' ? 'env-mainnet' : 'env-testnet'
  const checkedId = env === 'testnet' ? 'env-testnet' : 'env-mainnet'
  return html
    .replace(new RegExp(`(id="${disabledId}"[^>]*?)\\s+checked`), '$1 disabled')
    .replace(new RegExp(`(id="${disabledId}"[^>]*?)(\\s*/>)`), (match, prefix, suffix) =>
      match.includes(' disabled') ? match : `${prefix} disabled${suffix}`,
    )
    .replace(new RegExp(`(id="${checkedId}"[^>]*?)(\\s*/>)`), (match, prefix, suffix) =>
      match.includes(' checked') ? match : `${prefix} checked${suffix}`,
    )
}

export const LandingPage = () => (
  <Layout
    title="402md Facilitator — Cross-chain USDC settlement for x402 and MPP"
    description="Accept USDC payments from any chain. Buyer pays on Solana, seller receives on Stellar. One HTTP request, zero custom code, 0% fee."
    path="/"
    extraStyles={landingStyles}
  >
    <TestnetBanner />
    <Nav />
    {lockEnvToggle(landingContent, resolveNetworkEnv())}
    <script>{landingScript}</script>
  </Layout>
)
