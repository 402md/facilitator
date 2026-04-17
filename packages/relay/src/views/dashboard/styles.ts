export const dashboardStyles = /* css */ `
  main.dashboard {
    padding: var(--space-xl) 0;
  }

  h2 {
    font-family: 'Bricolage Grotesque', sans-serif;
    font-weight: 500;
    font-size: 1.1rem;
    letter-spacing: -0.01em;
    margin-bottom: var(--space-md);
  }

  section {
    margin-bottom: var(--space-2xl);
  }

  .snapshot {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: var(--space-md);
  }

  .stat {
    background: var(--bg-alt);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    padding: var(--space-lg);
  }
  .stat .label {
    font-size: 0.75rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--text-3);
    margin-bottom: var(--space-xs);
  }
  .stat .value {
    font-family: 'Bricolage Grotesque', sans-serif;
    font-size: 2rem;
    font-weight: 500;
    letter-spacing: -0.02em;
  }
  .stat .sub {
    font-size: 0.8rem;
    color: var(--text-2);
    margin-top: var(--space-xs);
  }

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
    color: var(--text-2);
    padding: 6px 14px;
    border-radius: 4px;
    cursor: pointer;
  }
  .window-toggle button.active {
    background: var(--text);
    color: var(--bg);
  }

  .rank-toggle {
    display: inline-flex;
    gap: var(--space-sm);
    font-size: 0.8rem;
    color: var(--text-2);
  }
  .rank-toggle button {
    background: transparent;
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 4px 10px;
    font: inherit;
    color: var(--text-2);
    cursor: pointer;
  }
  .rank-toggle button.active {
    background: var(--text);
    color: var(--bg);
    border-color: var(--text);
  }

  .section-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: var(--space-md);
  }
  .section-head h2 {
    margin-bottom: 0;
  }

  .chain-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
    gap: var(--space-sm);
  }
  .chain-card {
    background: var(--bg-alt);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: var(--space-md);
  }
  .chain-card .chain-name {
    font-weight: 500;
    font-size: 0.9rem;
    margin-bottom: var(--space-xs);
  }
  .chain-card .chain-metric {
    font-size: 0.8rem;
    color: var(--text-2);
  }
  .chain-card .chain-metric strong {
    color: var(--text);
    font-family: 'JetBrains Mono', monospace;
  }

  .route-matrix {
    overflow-x: auto;
  }
  table.matrix {
    border-collapse: collapse;
    font-size: 0.75rem;
  }
  table.matrix th,
  table.matrix td {
    border: 1px solid var(--border);
    padding: 6px 8px;
    text-align: center;
    white-space: nowrap;
  }
  table.matrix th {
    background: var(--bg-alt);
    color: var(--text-2);
    font-weight: 500;
  }
  table.matrix th.corner {
    background: transparent;
    border: none;
  }
  table.matrix td {
    font-family: 'JetBrains Mono', monospace;
  }
  table.matrix td.same-chain {
    border-style: dashed;
  }
  table.matrix td.empty {
    color: var(--text-3);
  }

  table.list {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.85rem;
  }
  table.list th,
  table.list td {
    text-align: left;
    padding: 10px 12px;
    border-bottom: 1px solid var(--border);
  }
  table.list th {
    font-weight: 500;
    color: var(--text-3);
    font-size: 0.75rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }
  table.list td.num {
    font-family: 'JetBrains Mono', monospace;
    text-align: right;
  }
  table.list td.mono {
    font-family: 'JetBrains Mono', monospace;
    font-size: 0.8rem;
  }

  .badge {
    display: inline-block;
    padding: 2px 8px;
    border-radius: 999px;
    font-size: 0.7rem;
    font-weight: 500;
    letter-spacing: 0.02em;
  }
  .badge.same { background: var(--green-soft); color: var(--green); }
  .badge.cross { background: var(--accent-soft); color: var(--accent); }
  .badge.x402 { background: var(--purple-soft); color: var(--purple); }
  .badge.mpp { background: var(--accent-soft); color: var(--accent); }
  .badge.status-settled { background: var(--green-soft); color: var(--green); }
  .badge.status-pending { background: var(--bg-alt); color: var(--text-2); }
  .badge.status-failed {
    background: oklch(0.96 0.03 20);
    color: oklch(0.5 0.17 20);
  }

  .panel {
    background: var(--bg-alt);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    padding: var(--space-lg);
  }
  .cost-note {
    font-size: 0.75rem;
    color: var(--text-3);
    margin-top: var(--space-md);
    font-style: italic;
  }

  .empty,
  .error {
    padding: var(--space-lg);
    text-align: center;
    color: var(--text-3);
    font-size: 0.85rem;
    background: var(--bg-alt);
    border: 1px dashed var(--border-mid);
    border-radius: var(--radius);
  }
  .error {
    color: var(--warn);
    border-color: var(--warn);
  }

  footer.site {
    margin-top: var(--space-2xl);
    padding-top: var(--space-lg);
    border-top: 1px solid var(--border);
    font-size: 0.75rem;
    color: var(--text-3);
    display: flex;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: var(--space-sm);
  }

  .loading {
    color: var(--text-3);
    font-size: 0.8rem;
    font-style: italic;
  }
`
