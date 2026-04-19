export const dashboardStyles = /* css */ `
  main.dashboard {
    padding-top: var(--space-xl);
    padding-bottom: var(--space-2xl);
    min-width: 0;
  }

  /* Reserved slots hydrated by the client script. Wrap their content so tables
     or panels that exceed the viewport scroll inside the slot instead of pushing
     the whole page. */
  .slot {
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
    max-width: 100%;
  }

  /* ── Section rhythm ──
     Hairline top + generous padding on each section creates editorial rhythm
     without per-section decoration. Matches the landing's section pattern
     but calibrated for data density. */
  main.dashboard section {
    margin-bottom: 0;
    padding-top: var(--space-xl);
    padding-bottom: var(--space-xl);
    border-top: 1px solid var(--border);
  }
  main.dashboard section:first-of-type {
    padding-top: var(--space-md);
    border-top: 0;
  }

  main.dashboard h2 {
    font-family: 'JetBrains Mono', monospace;
    font-size: 0.6875rem;
    font-weight: 500;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--signal-deep);
    margin-bottom: var(--space-md);
  }

  .section-head {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: var(--space-md);
    margin-bottom: var(--space-md);
    flex-wrap: wrap;
  }
  .section-head h2 {
    margin-bottom: 0;
  }

  /* ── Snapshot readouts ──
     Flat editorial row, no cards. Vertical hairlines separate columns;
     the section's own rhythm handles top/bottom boundaries, so no extra
     horizontals here — otherwise they stack with the next section's border. */
  .snapshot {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  }
  .stat {
    padding: 0 var(--space-lg) 0 0;
    border-right: 1px solid var(--border);
  }
  .stat + .stat {
    padding-left: var(--space-lg);
  }
  .stat:last-child {
    border-right: 0;
    padding-right: 0;
  }
  .stat .label {
    font-family: 'JetBrains Mono', monospace;
    font-size: 0.6875rem;
    font-weight: 500;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--text-2);
    margin-bottom: var(--space-xs);
  }
  .stat .value {
    font-family: 'Bricolage Grotesque', sans-serif;
    font-size: 1.75rem;
    font-weight: 500;
    letter-spacing: -0.02em;
    font-variant-numeric: tabular-nums;
    line-height: 1.1;
  }
  .stat .sub {
    font-size: 0.8125rem;
    color: var(--text-2);
    margin-top: var(--space-xs);
  }

  /* ── Segmented window toggle ── */
  .window-toggle {
    display: inline-flex;
    gap: 2px;
    background: var(--bg-alt);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 2px;
  }
  .window-toggle button {
    background: transparent;
    border: none;
    font: inherit;
    font-size: 0.8125rem;
    color: var(--text-2);
    padding: 4px 12px;
    border-radius: 4px;
    cursor: pointer;
    transition:
      color 150ms var(--ease-out-quart),
      background-color 150ms var(--ease-out-quart);
  }
  .window-toggle button:hover:not(.active) {
    color: var(--text);
  }
  .window-toggle button:focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: 2px;
  }
  .window-toggle button.active {
    background: var(--accent-soft);
    color: var(--accent);
  }

  /* ── Rank toggle (inline text-like) ── */
  .rank-toggle {
    display: inline-flex;
    gap: var(--space-xs);
    font-size: 0.8125rem;
  }
  .rank-toggle button {
    background: transparent;
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 4px 10px;
    font: inherit;
    font-size: 0.8125rem;
    color: var(--text-2);
    cursor: pointer;
    transition:
      color 150ms var(--ease-out-quart),
      border-color 150ms var(--ease-out-quart),
      background-color 150ms var(--ease-out-quart);
  }
  .rank-toggle button:hover:not(.active) {
    color: var(--text);
    border-color: var(--border-mid);
  }
  .rank-toggle button:focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: 2px;
  }
  .rank-toggle button.active {
    background: var(--accent-soft);
    color: var(--accent);
    border-color: var(--accent-soft);
  }

  /* ── Per-chain grid ── */
  .chain-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
    gap: var(--space-sm);
  }
  .chain-card {
    background: var(--bg-alt);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: var(--space-md);
    transition: border-color 150ms var(--ease-out-quart);
  }
  .chain-card:hover {
    border-color: var(--border-mid);
  }
  .chain-card .chain-name {
    font-weight: 500;
    font-size: 0.875rem;
    margin-bottom: var(--space-sm);
    letter-spacing: -0.005em;
  }
  .chain-card .chain-metric {
    font-size: 0.8125rem;
    color: var(--text-2);
    font-variant-numeric: tabular-nums;
  }
  .chain-card .chain-metric + .chain-metric {
    margin-top: 2px;
  }
  .chain-card .chain-metric strong {
    color: var(--text);
    font-family: 'JetBrains Mono', monospace;
    font-weight: 500;
  }

  /* ── Route matrix ── */
  .route-matrix {
    overflow-x: auto;
    border: 1px solid var(--border);
    border-radius: var(--radius);
  }
  table.matrix {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.75rem;
    font-variant-numeric: tabular-nums;
    table-layout: fixed;
  }
  table.matrix th,
  table.matrix td {
    border: 1px solid var(--border);
    padding: 8px 10px;
    text-align: center;
    white-space: nowrap;
  }
  table.matrix th {
    background: var(--bg-alt);
    color: var(--text-2);
    font-weight: 500;
    font-family: 'JetBrains Mono', monospace;
    font-size: 0.6875rem;
    letter-spacing: 0.02em;
  }
  table.matrix thead th {
    border-top: 0;
  }
  table.matrix tr > th:first-child,
  table.matrix tr > td:first-child {
    border-left: 0;
  }
  table.matrix tr > th:last-child,
  table.matrix tr > td:last-child {
    border-right: 0;
  }
  table.matrix tbody tr:last-child th,
  table.matrix tbody tr:last-child td {
    border-bottom: 0;
  }
  table.matrix th.corner {
    background: transparent;
    border: none;
  }
  table.matrix td {
    font-family: 'JetBrains Mono', monospace;
    transition: filter 150ms var(--ease-out-quart);
  }
  table.matrix td:not(.empty):hover {
    filter: brightness(0.96);
  }
  table.matrix td.same-chain {
    border-style: dashed;
  }
  table.matrix td.empty {
    color: var(--text-3);
  }

  /* ── Data tables ── */
  table.list {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.875rem;
    font-variant-numeric: tabular-nums;
  }
  table.list th,
  table.list td {
    text-align: left;
    padding: 10px 12px;
    border-bottom: 1px solid var(--border);
  }
  table.list th {
    font-family: 'JetBrains Mono', monospace;
    font-weight: 500;
    color: var(--text-3);
    font-size: 0.6875rem;
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }
  table.list tbody tr {
    transition: background-color 120ms var(--ease-out-quart);
  }
  table.list tbody tr:hover {
    background: var(--bg-alt);
  }
  table.list tbody tr:last-child td {
    border-bottom: 0;
  }
  table.list td.num {
    font-family: 'JetBrains Mono', monospace;
    text-align: right;
  }
  table.list td.mono {
    font-family: 'JetBrains Mono', monospace;
    font-size: 0.8125rem;
    color: var(--text);
  }
  table.list a {
    color: var(--accent);
    transition: opacity 150ms;
  }
  table.list a:hover {
    opacity: 0.7;
    text-decoration: none;
  }

  /* ── Badges ── */
  .badge {
    display: inline-block;
    padding: 2px 8px;
    border-radius: 999px;
    font-size: 0.6875rem;
    font-family: 'JetBrains Mono', monospace;
    font-weight: 500;
    letter-spacing: 0.02em;
    white-space: nowrap;
  }
  .badge.same { background: var(--green-soft); color: var(--green); }
  .badge.cross { background: var(--accent-soft); color: var(--accent); }
  .badge.x402 { background: var(--purple-soft); color: var(--purple); }
  .badge.mpp { background: var(--warn-soft); color: var(--warn-deep); }
  .badge.status-settled { background: var(--green-soft); color: var(--green); }
  .badge.status-pending { background: var(--bg-alt); color: var(--text-2); }
  .badge.status-failed {
    background: var(--error-soft);
    color: var(--error);
  }

  /* ── Cost comparison panel ── */
  .panel {
    background: var(--bg-alt);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    padding: var(--space-lg);
  }
  .panel-head {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: var(--space-md);
    flex-wrap: wrap;
    margin-bottom: var(--space-md);
  }
  .panel-head strong {
    font-family: 'Bricolage Grotesque', sans-serif;
    font-weight: 500;
    font-size: 1rem;
    letter-spacing: -0.01em;
    color: var(--text);
  }
  .panel-caption {
    font-family: 'JetBrains Mono', monospace;
    font-size: 0.6875rem;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--text-3);
  }
  .panel table.list tbody tr:hover {
    background: transparent;
  }
  .panel table.list th,
  .panel table.list td {
    border-bottom-color: var(--border-mid);
  }
  .cost-note {
    font-size: 0.75rem;
    color: var(--text-3);
    margin-top: var(--space-md);
    line-height: 1.55;
  }

  /* ── Loading / empty / error ── */
  .loading {
    padding: var(--space-lg);
    color: var(--text-3);
    font-size: 0.8125rem;
    font-family: 'JetBrains Mono', monospace;
    letter-spacing: 0.02em;
    animation: dashboard-pulse 1.4s var(--ease-out-quart) infinite;
  }
  .empty,
  .error {
    padding: var(--space-lg);
    text-align: center;
    color: var(--text-3);
    font-size: 0.8125rem;
    background: var(--bg-alt);
    border: 1px dashed var(--border-mid);
    border-radius: var(--radius);
  }
  .error {
    color: var(--warn-deep);
    border-color: var(--warn-deep);
    background: var(--warn-soft);
  }

  @keyframes dashboard-pulse {
    0%, 100% { opacity: 0.55; }
    50% { opacity: 1; }
  }

  /* ── Footer ── */
  footer.site {
    margin-top: var(--space-xl);
    padding-top: var(--space-lg);
    border-top: 1px solid var(--border);
    font-family: 'JetBrains Mono', monospace;
    font-size: 0.75rem;
    color: var(--text-3);
    display: flex;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: var(--space-sm);
    letter-spacing: 0.01em;
  }

  @media (prefers-reduced-motion: reduce) {
    .loading {
      animation: none;
      opacity: 0.7;
    }
    table.matrix td,
    table.list tbody tr,
    .chain-card,
    .window-toggle button,
    .rank-toggle button {
      transition: none;
    }
  }

  @media (max-width: 480px) {
    main.dashboard section {
      padding-top: var(--space-lg);
      padding-bottom: var(--space-lg);
    }
    .snapshot {
      grid-template-columns: 1fr;
    }
    .stat,
    .stat + .stat {
      padding: var(--space-md) 0;
      border-right: 0;
      border-bottom: 1px solid var(--border);
    }
    .stat:last-child {
      border-bottom: 0;
    }
    .stat .value {
      font-size: 1.5rem;
    }
  }
`
