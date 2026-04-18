import { Layout } from '../layout'
import { Nav } from '../nav'
import landingContent from './content.html' with { type: 'text' }
import landingStyles from './styles.css' with { type: 'text' }
import landingScript from './script.txt' with { type: 'text' }

export const LandingPage = () => (
  <Layout
    title="402md Facilitator — Cross-chain USDC settlement for x402 and MPP"
    description="Accept USDC payments from any chain. Buyer pays on Solana, seller receives on Stellar. One HTTP request, zero custom code, 0% fee."
    extraStyles={landingStyles}
  >
    <Nav />
    {landingContent}
    <script>{landingScript}</script>
  </Layout>
)
