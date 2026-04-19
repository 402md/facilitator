import { Layout } from '../layout'
import { Nav } from '../nav'
import { TestnetBanner } from '../testnet-banner'
import { dashboardStyles } from './styles'
import { dashboardClientScript } from './client-script'
import { CHAINS, EXPLORERS } from './config'
import { StatCard, Section, WindowToggle, RankToggle, LoadingSlot } from './components'

const configBootstrap = `window.__DASHBOARD__ = ${JSON.stringify({ CHAINS, EXPLORERS })};`

const crossChainSub = '<span id="stat-cross-chain-routes">—</span> cross-chain'

export const DashboardPage = () => (
  <Layout
    title="402md Bazaar — Facilitator activity"
    description="Live activity for the 402md facilitator: chains, cross-chain routes, resources, sellers, transactions."
    path="/dashboard"
    extraStyles={dashboardStyles}
  >
    <TestnetBanner />
    <Nav current="dashboard" />

    <main class="dashboard container">
      <h1 class="sr-only">Facilitator activity</h1>
      <Section title="Architecture">
        <div class="snapshot">
          <StatCard
            label="Chains supported"
            value={CHAINS.length}
            valueId="stat-chains-supported"
            sub="7 EVM + Solana + Stellar"
          />
          <StatCard
            label="Routes active"
            value="—"
            valueId="stat-routes-active"
            sub={crossChainSub}
          />
          <StatCard label="Protocols" value="x402 + MPP" sub="Dual-protocol facilitator" />
        </div>
      </Section>

      <Section title="Activity window" toolbar={<WindowToggle />} />

      <Section title="Per chain">
        <div class="chain-grid" id="chain-grid" />
      </Section>

      <Section title="Route matrix">
        <div class="route-matrix" id="route-matrix">
          <p class="loading">Loading routes…</p>
        </div>
      </Section>

      <Section
        title="Top resources"
        toolbar={
          <RankToggle
            id="resource-rank"
            options={[
              { value: 'uses', label: 'By uses' },
              { value: 'volume', label: 'By volume' },
            ]}
            defaultValue="uses"
          />
        }
      >
        <LoadingSlot id="resources-container" message="Loading resources…" />
      </Section>

      <Section
        title="Top sellers"
        toolbar={
          <RankToggle
            id="seller-rank"
            options={[
              { value: 'volume', label: 'By volume' },
              { value: 'tx_count', label: 'By tx count' },
            ]}
            defaultValue="volume"
          />
        }
      >
        <LoadingSlot id="sellers-container" message="Loading sellers…" />
      </Section>

      <Section title="Recent transactions">
        <LoadingSlot id="transactions-container" message="Loading transactions…" />
      </Section>

      <Section title="Cross-chain cost comparison">
        <LoadingSlot id="cost-container" message="Loading cost comparison…" />
      </Section>

      <footer class="site">
        <div>402md facilitator</div>
        <div>Data refreshes every 30s</div>
      </footer>
    </main>

    <script>{configBootstrap}</script>
    <script>{dashboardClientScript}</script>
  </Layout>
)
