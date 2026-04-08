#!/usr/bin/env bash
set -euo pipefail

# ============================================================
# 402md — End-to-End Demo
#
# Prerequisites:
#   - docker compose up (PG + Redis + Temporal)
#   - .env files configured in packages/relay and packages/worker
#   - Testnet USDC funded on seller and agent wallets
#
# Usage:
#   ./scripts/demo.sh
# ============================================================

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
RELAY_PORT="${RELAY_PORT:-3000}"
SELLER_PORT="${DEMO_SELLER_PORT:-4000}"
FACILITATOR_URL="http://localhost:${RELAY_PORT}"

cleanup() {
  echo ""
  echo "Shutting down..."
  kill "$RELAY_PID" "$WORKER_PID" "$SELLER_PID" 2>/dev/null || true
  wait "$RELAY_PID" "$WORKER_PID" "$SELLER_PID" 2>/dev/null || true
  echo "Done."
}
trap cleanup EXIT

echo "=== 402md Demo ==="
echo ""

# 1. Build
echo "--- Building packages ---"
cd "$ROOT"
bun run build
echo ""

# 2. Start relay
echo "--- Starting relay (port $RELAY_PORT) ---"
cd "$ROOT/packages/relay"
PORT=$RELAY_PORT bun run src/index.ts &
RELAY_PID=$!
sleep 2

# 3. Start worker
echo "--- Starting worker ---"
cd "$ROOT/packages/worker"
bun run src/worker.ts &
WORKER_PID=$!
sleep 2

# 4. Start demo seller (auto-registers with facilitator)
echo "--- Starting demo seller (port $SELLER_PORT) ---"
cd "$ROOT/packages/demo-seller"
FACILITATOR_URL=$FACILITATOR_URL DEMO_SELLER_PORT=$SELLER_PORT bun run src/index.ts &
SELLER_PID=$!
sleep 3

# 5. Run demo agent
echo ""
echo "--- Running demo agent ---"
cd "$ROOT/packages/demo-agent"
FACILITATOR_URL=$FACILITATOR_URL DEMO_SELLER_URL="http://localhost:${SELLER_PORT}" bun run src/index.ts

echo ""
echo "=== Demo Complete ==="
echo ""
echo "Narrative: Agent on Stellar discovered a paywalled search API via the bazaar,"
echo "paid per-query using MPP Charge Mode, and seller received USDC on Stellar."
echo ""
echo "For cross-chain (Base → Stellar), configure AGENT_SECRET_KEY with a Base wallet"
echo "and the facilitator will bridge via CCTP V2."
