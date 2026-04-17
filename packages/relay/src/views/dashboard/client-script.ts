// Dashboard polling + render script. Rendered as a raw <script> body by the
// dashboard page. It reads CHAINS / EXPLORERS from window.__DASHBOARD__ (injected
// server-side from views/dashboard/config.ts) so the config is single-sourced.
export const dashboardClientScript = /* js */ `
  ;(function () {
    const cfg = window.__DASHBOARD__ || { CHAINS: [], EXPLORERS: {} }
    const CHAINS = cfg.CHAINS
    const EXPLORERS = cfg.EXPLORERS

    const state = { window: '7d', resourceRank: 'uses', sellerRank: 'volume' }

    // ---- formatters ----
    function formatUsdc(microStr) {
      if (microStr == null) return '—'
      const micros = BigInt(microStr)
      const usdc = Number(micros) / 1_000_000
      if (usdc >= 1000) return '$' + usdc.toLocaleString('en-US', { maximumFractionDigits: 0 })
      if (usdc >= 1) return '$' + usdc.toFixed(2)
      if (usdc >= 0.01) return '$' + usdc.toFixed(4)
      return '$' + usdc.toFixed(6)
    }
    function formatCount(n) {
      if (n == null) return '—'
      return Number(n).toLocaleString('en-US')
    }
    function relativeTime(iso) {
      if (!iso) return '—'
      const diff = (Date.now() - new Date(iso).getTime()) / 1000
      if (diff < 60) return Math.floor(diff) + 's ago'
      if (diff < 3600) return Math.floor(diff / 60) + 'm ago'
      if (diff < 86400) return Math.floor(diff / 3600) + 'h ago'
      return Math.floor(diff / 86400) + 'd ago'
    }
    function truncateMerchant(m) {
      if (!m) return '—'
      if (m.length <= 12) return m
      return m.slice(0, 5) + '…' + m.slice(-3)
    }
    function chainLabel(caip2) {
      const c = CHAINS.find((c) => c.caip2 === caip2)
      return c ? c.label : caip2
    }
    function explorerLink(caip2, hash) {
      if (!hash) return null
      const base = EXPLORERS[caip2]
      if (!base) return null
      return base + hash
    }
    function heatColor(volume, max) {
      if (!max || max === 0n) return 'transparent'
      const ratio = Math.min(1, Number((volume * 10000n) / max) / 10000)
      const lerp = Math.log10(1 + ratio * 9)
      const lightness = 0.96 - lerp * 0.2
      return 'oklch(' + lightness.toFixed(3) + ' 0.08 250)'
    }
    function escapeHtml(s) {
      if (s == null) return ''
      return String(s)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
    }

    // ---- fetch ----
    async function getJson(url) {
      const res = await fetch(url, { headers: { accept: 'application/json' } })
      if (!res.ok) throw new Error('HTTP ' + res.status + ' on ' + url)
      return res.json()
    }

    // ---- renderers ----
    function renderStats(stats) {
      if (!stats) return
      document.getElementById('stat-chains-supported').textContent = stats.chainsSupported
      document.getElementById('stat-routes-active').textContent = stats.uniqueRoutes
      document.getElementById('stat-cross-chain-routes').textContent = stats.crossChainRoutes
    }

    function renderChainGrid(routes) {
      const byChain = new Map()
      for (const c of CHAINS) byChain.set(c.caip2, { txCount: 0, volume: 0n })

      for (const r of routes || []) {
        const b = byChain.get(r.buyerNetwork)
        const s = byChain.get(r.sellerNetwork)
        if (b) {
          b.txCount += r.txCount
          b.volume += BigInt(r.volume)
        }
        if (s && r.sellerNetwork !== r.buyerNetwork) {
          s.txCount += r.txCount
          s.volume += BigInt(r.volume)
        }
      }

      const grid = document.getElementById('chain-grid')
      grid.innerHTML = ''
      for (const c of CHAINS) {
        const data = byChain.get(c.caip2)
        const card = document.createElement('div')
        card.className = 'chain-card'
        card.innerHTML =
          '<div class="chain-name">' + c.label + '</div>' +
          '<div class="chain-metric"><strong>' + formatCount(data.txCount) + '</strong> tx</div>' +
          '<div class="chain-metric"><strong>' + formatUsdc(data.volume.toString()) + '</strong> vol</div>'
        grid.appendChild(card)
      }
    }

    function renderRouteMatrix(routes) {
      const container = document.getElementById('route-matrix')
      if (!routes || routes.length === 0) {
        container.innerHTML = '<div class="empty">No routes in this window yet.</div>'
        return
      }

      const lookup = new Map()
      let max = 0n
      for (const r of routes) {
        lookup.set(r.buyerNetwork + '|' + r.sellerNetwork, r)
        const v = BigInt(r.volume)
        if (v > max) max = v
      }

      let html = '<table class="matrix"><thead><tr><th class="corner"></th>'
      for (const c of CHAINS) html += '<th>' + c.label + '</th>'
      html += '</tr></thead><tbody>'

      for (const row of CHAINS) {
        html += '<tr><th>' + row.label + '</th>'
        for (const col of CHAINS) {
          const r = lookup.get(row.caip2 + '|' + col.caip2)
          const sameChain = row.caip2 === col.caip2
          if (r) {
            const color = heatColor(BigInt(r.volume), max)
            html +=
              '<td class="' + (sameChain ? 'same-chain' : '') + '" style="background:' + color + '" ' +
              'title="' + row.label + '→' + col.label + ' • ' + r.txCount + ' tx • ' + formatUsdc(r.volume) + '">' +
              r.txCount + '</td>'
          } else {
            html += '<td class="' + (sameChain ? 'same-chain' : '') + ' empty">·</td>'
          }
        }
        html += '</tr>'
      }
      html += '</tbody></table>'
      container.innerHTML = html
    }

    function renderResources(data) {
      const el = document.getElementById('resources-container')
      if (!data || !data.items || data.items.length === 0) {
        el.innerHTML = '<div class="empty">No resource activity in this window yet.</div>'
        return
      }
      let html =
        '<table class="list"><thead><tr>' +
        '<th>Resource</th><th>Merchant</th>' +
        '<th style="text-align:right">Uses (' + data.window + ')</th>' +
        '<th style="text-align:right">Volume (' + data.window + ')</th>' +
        '<th>Last used</th></tr></thead><tbody>'
      for (const it of data.items.slice(0, 10)) {
        html +=
          '<tr>' +
          '<td class="mono">' + escapeHtml(it.resource) + '</td>' +
          '<td class="mono">' + truncateMerchant(it.merchantId) + '</td>' +
          '<td class="num">' + formatCount(it.windowedUseCount) + '</td>' +
          '<td class="num">' + formatUsdc(it.windowedVolume) + '</td>' +
          '<td>' + relativeTime(it.lastUsedAt) + '</td>' +
          '</tr>'
      }
      html += '</tbody></table>'
      el.innerHTML = html
    }

    function renderSellers(data) {
      const el = document.getElementById('sellers-container')
      if (!data || !data.items || data.items.length === 0) {
        el.innerHTML = '<div class="empty">No seller activity in this window yet.</div>'
        return
      }
      let html =
        '<table class="list"><thead><tr>' +
        '<th>Merchant</th><th>Primary network</th>' +
        '<th style="text-align:right">Tx (' + data.window + ')</th>' +
        '<th style="text-align:right">Volume (' + data.window + ')</th>' +
        '<th style="text-align:right">Resources</th></tr></thead><tbody>'
      for (const it of data.items.slice(0, 10)) {
        html +=
          '<tr>' +
          '<td class="mono">' + truncateMerchant(it.merchantId) + '</td>' +
          '<td>' + chainLabel(it.primaryNetwork) + '</td>' +
          '<td class="num">' + formatCount(it.txCount) + '</td>' +
          '<td class="num">' + formatUsdc(it.volume) + '</td>' +
          '<td class="num">' + formatCount(it.resourceCount) + '</td>' +
          '</tr>'
      }
      html += '</tbody></table>'
      el.innerHTML = html
    }

    function renderTransactions(data) {
      const el = document.getElementById('transactions-container')
      if (!data || !data.items || data.items.length === 0) {
        el.innerHTML = '<div class="empty">No transactions yet.</div>'
        return
      }
      let html =
        '<table class="list"><thead><tr>' +
        '<th>When</th><th>Type</th><th>Protocol</th><th>Route</th>' +
        '<th style="text-align:right">Amount</th>' +
        '<th>Status</th><th>Hash</th></tr></thead><tbody>'
      for (const tx of data.items) {
        const settleLink =
          explorerLink(tx.sellerNetwork, tx.mintTxHash) ||
          explorerLink(tx.buyerNetwork, tx.pullTxHash)
        const hashCell = settleLink
          ? '<a href="' + settleLink + '" target="_blank" rel="noreferrer">view</a>'
          : '—'
        html +=
          '<tr>' +
          '<td>' + relativeTime(tx.createdAt) + '</td>' +
          '<td><span class="badge ' + (tx.type === 'cross_chain' ? 'cross' : 'same') + '">' + tx.type + '</span></td>' +
          '<td><span class="badge ' + (tx.protocol === 'mpp' ? 'mpp' : 'x402') + '">' + (tx.protocol || '—') + '</span></td>' +
          '<td class="mono">' + chainLabel(tx.buyerNetwork) + ' → ' + chainLabel(tx.sellerNetwork) + '</td>' +
          '<td class="num">' + formatUsdc(tx.grossAmount) + '</td>' +
          '<td><span class="badge status-' + tx.status + '">' + tx.status + '</span></td>' +
          '<td>' + hashCell + '</td>' +
          '</tr>'
      }
      html += '</tbody></table>'
      el.innerHTML = html
    }

    function renderCostComparison(cost, routePair) {
      const el = document.getElementById('cost-container')
      if (!cost || !cost.tiers) {
        el.innerHTML =
          '<div class="empty">No cross-chain route active yet — cost comparison hidden.</div>'
        return
      }
      const routeLabel = chainLabel(cost.buyerNetwork) + ' → ' + chainLabel(cost.sellerNetwork)
      let html =
        '<div class="panel">' +
        '<div class="section-head" style="margin-bottom:var(--space-md)">' +
        '<strong>' + routeLabel + '</strong>' +
        '<span class="loading">' + (routePair ? 'top active route in window' : '') + '</span>' +
        '</div>' +
        '<table class="list"><thead><tr>' +
        '<th>Payment amount</th>' +
        '<th style="text-align:right">CCTP allowance</th>' +
        '<th style="text-align:right">% bridge baseline</th>' +
        '<th style="text-align:right">Savings</th>' +
        '</tr></thead><tbody>'
      for (const t of cost.tiers) {
        html +=
          '<tr>' +
          '<td class="num">' + formatUsdc(t.amount) + '</td>' +
          '<td class="num">' + formatUsdc(t.cctpAllowance) + '</td>' +
          '<td class="num">' + formatUsdc(t.percentAlternative) + '</td>' +
          '<td class="num">' + formatUsdc(t.savingsVsPercent) + '</td>' +
          '</tr>'
      }
      html +=
        '</tbody></table>' +
        '<div class="cost-note">Baseline: ' + cost.notes.percentAssumption + '. Source: ' + cost.notes.cctpSource + '.</div>' +
        '</div>'
      el.innerHTML = html
    }

    function renderError(id, msg) {
      document.getElementById(id).innerHTML =
        '<div class="error">Failed: ' + escapeHtml(msg) + '</div>'
    }

    // ---- refresh ----
    async function refreshAll() {
      const w = state.window
      const results = await Promise.allSettled([
        getJson('/bazaar/stats?window=' + w),
        getJson('/bazaar/routes?window=' + w),
        getJson('/bazaar/resources?window=' + w + '&rank=' + state.resourceRank + '&limit=10'),
        getJson('/bazaar/sellers?window=' + w + '&rank=' + state.sellerRank + '&limit=10'),
        getJson('/bazaar/transactions?window=' + w + '&limit=20'),
      ])

      if (results[0].status === 'fulfilled') renderStats(results[0].value)

      let routes = null
      if (results[1].status === 'fulfilled') {
        routes = results[1].value.routes
        renderChainGrid(routes)
        renderRouteMatrix(routes)
      } else {
        renderError('route-matrix', (results[1].reason && results[1].reason.message) || 'routes failed')
      }

      if (results[2].status === 'fulfilled') renderResources(results[2].value)
      else renderError('resources-container', (results[2].reason && results[2].reason.message) || 'resources failed')

      if (results[3].status === 'fulfilled') renderSellers(results[3].value)
      else renderError('sellers-container', (results[3].reason && results[3].reason.message) || 'sellers failed')

      if (results[4].status === 'fulfilled') renderTransactions(results[4].value)
      else renderError('transactions-container', (results[4].reason && results[4].reason.message) || 'transactions failed')

      if (routes) {
        const topCross = routes.find((r) => r.isCrossChain)
        if (topCross) {
          try {
            const cost = await getJson(
              '/bazaar/cost-comparison?buyerNetwork=' +
                encodeURIComponent(topCross.buyerNetwork) +
                '&sellerNetwork=' +
                encodeURIComponent(topCross.sellerNetwork),
            )
            renderCostComparison(cost, topCross)
          } catch (err) {
            renderError('cost-container', err.message)
          }
        } else {
          renderCostComparison(null)
        }
      }
    }

    async function refreshResources() {
      try {
        const data = await getJson(
          '/bazaar/resources?window=' + state.window + '&rank=' + state.resourceRank + '&limit=10',
        )
        renderResources(data)
      } catch (err) {
        renderError('resources-container', err.message)
      }
    }

    async function refreshSellers() {
      try {
        const data = await getJson(
          '/bazaar/sellers?window=' + state.window + '&rank=' + state.sellerRank + '&limit=10',
        )
        renderSellers(data)
      } catch (err) {
        renderError('sellers-container', err.message)
      }
    }

    // ---- toggles ----
    document.getElementById('window-toggle').addEventListener('click', (e) => {
      const btn = e.target.closest('button[data-window]')
      if (!btn) return
      state.window = btn.dataset.window
      for (const b of document.querySelectorAll('#window-toggle button')) {
        b.classList.toggle('active', b === btn)
      }
      refreshAll()
    })

    document.getElementById('resource-rank').addEventListener('click', (e) => {
      const btn = e.target.closest('button[data-rank]')
      if (!btn) return
      state.resourceRank = btn.dataset.rank
      for (const b of document.querySelectorAll('#resource-rank button')) {
        b.classList.toggle('active', b === btn)
      }
      refreshResources()
    })

    document.getElementById('seller-rank').addEventListener('click', (e) => {
      const btn = e.target.closest('button[data-rank]')
      if (!btn) return
      state.sellerRank = btn.dataset.rank
      for (const b of document.querySelectorAll('#seller-rank button')) {
        b.classList.toggle('active', b === btn)
      }
      refreshSellers()
    })

    refreshAll()
    setInterval(refreshAll, 30_000)
  })()
`
