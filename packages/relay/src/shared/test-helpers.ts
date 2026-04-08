// Env must be set before any code that reads it (e.g. @402md/shared/networks).
process.env.NETWORK_ENV = 'mainnet'
process.env.BASE_RPC_URL = 'https://test.base'
process.env.SOLANA_RPC_URL = 'https://test.solana'
process.env.STELLAR_RPC_URL = 'https://test.stellar'
process.env.FACILITATOR_BASE = '0xFacilitatorBase'
process.env.FACILITATOR_SOLANA = 'FacilitatorSolAddr'
process.env.FACILITATOR_STELLAR = 'FacilitatorStellarAddr'

import { mock } from 'bun:test'

// --- Redis Mock ---

const store = new Map<string, string>()
const expiries = new Map<string, number>()

export const mockRedis = {
  get: mock((key: string) => store.get(key) ?? null),
  set: mock((key: string, value: string, ..._args: unknown[]) => {
    store.set(key, value)
    return 'OK'
  }),
  incr: mock((key: string) => {
    const current = parseInt(store.get(key) ?? '0', 10)
    const next = current + 1
    store.set(key, next.toString())
    return next
  }),
  incrby: mock((key: string, amount: number) => {
    const current = parseInt(store.get(key) ?? '0', 10)
    const next = current + amount
    store.set(key, next.toString())
    return next
  }),
  exists: mock((key: string) => (store.has(key) ? 1 : 0)),
  del: mock((key: string) => {
    store.delete(key)
    return 1
  }),
  expire: mock((key: string, seconds: number) => {
    expiries.set(key, seconds)
    return 1
  }),
  ping: mock(() => 'PONG'),
  reset() {
    store.clear()
    expiries.clear()
    this.get.mockClear()
    this.set.mockClear()
    this.incr.mockClear()
    this.incrby.mockClear()
    this.exists.mockClear()
    this.del.mockClear()
    this.expire.mockClear()
    this.ping.mockClear()
  },
  _store: store,
  _expiries: expiries,
}

// --- Seller Row Type ---

export type SellerRow = {
  id: string
  merchantId: string
  walletAddress: string
  network: string
  createdAt: Date | null
}

// --- DB Mock (for repository-level mocking) ---

let sellersData: SellerRow[] = []

export const mockDb = {
  execute: mock(() => Promise.resolve([{ '?column?': 1 }])),
  setSellers(data: SellerRow[]) {
    sellersData = data
  },
  getSellers() {
    return sellersData
  },
  reset() {
    sellersData = []
    this.execute.mockClear()
  },
}

// --- Temporal Mock ---

let workflowStatus: unknown = { status: 'settled' }
let workflowList: unknown[] = []
let startedWorkflows: { name: string; options: unknown }[] = []

export const mockTemporal = {
  workflow: {
    start: mock(async (name: string, options: unknown) => {
      startedWorkflows.push({ name, options })
      return { workflowId: (options as { workflowId: string }).workflowId }
    }),
    getHandle: mock((workflowId: string) => ({
      query: mock(async () => workflowStatus),
      workflowId,
    })),
    list: mock(function* () {
      for (const w of workflowList) yield w
    }),
  },
  setStatus(status: unknown) {
    workflowStatus = status
  },
  setWorkflows(workflows: unknown[]) {
    workflowList = workflows
    this.workflow.list.mockImplementation(async function* () {
      for (const w of workflows) yield w
    })
  },
  getStartedWorkflows() {
    return startedWorkflows
  },
  reset() {
    workflowStatus = { status: 'settled' }
    workflowList = []
    startedWorkflows = []
    this.workflow.start.mockClear()
    this.workflow.getHandle.mockClear()
    this.workflow.list.mockClear()
  },
}

// --- Module mocks ---
// Bun's mock.module intercepts imports by module specifier.

const SRC = import.meta.dir.replace(/\/shared$/, '')
const SHARED = `${SRC}/shared`
const SELLERS = `${SRC}/sellers`
const MPP = `${SRC}/mpp`

// Redis (shared package subpath)
const redisMock = () => ({ redis: mockRedis })
mock.module('@402md/shared/cache', redisMock)

// DB (shared package subpath) — services use mocked repositories, this just keeps
// accidental direct db imports from crashing with real postgres connections.
const dbMock = () => ({
  db: mockDb,
  sellers: {},
  transactions: {},
})
mock.module('@402md/shared/db', dbMock)

// Temporal
const temporalMock = () => ({ getTemporalClient: () => Promise.resolve(mockTemporal) })
mock.module(`${SHARED}/temporal.ts`, temporalMock)

// Sellers repository
const sellersRepoMock = () => ({
  createSeller: mock(
    async (data: { merchantId: string; walletAddress: string; network: string }) => ({
      id: crypto.randomUUID(),
      merchantId: data.merchantId,
      walletAddress: data.walletAddress,
      network: data.network,
      createdAt: new Date(),
    }),
  ),
  findByMerchantId: mock(async (merchantId: string) => {
    return sellersData.find((s) => s.merchantId === merchantId) ?? undefined
  }),
  findByWallet: mock(async (walletAddress: string, network: string) => {
    return (
      sellersData.find((s) => s.walletAddress === walletAddress && s.network === network) ??
      undefined
    )
  }),
})
mock.module(`${SELLERS}/sellers.repository.ts`, sellersRepoMock)

// MPP repository
const mppRepoMock = () => ({
  createSession: mock(async (data: Record<string, unknown>) => {
    return {
      id: crypto.randomUUID(),
      ...data,
      spent: '0',
      voucherCount: '0',
      status: 'open',
      createdAt: new Date(),
      closedAt: null,
    }
  }),
  findSession: mock(async () => null),
  updateSessionSpent: mock(async () => {}),
  closeSession: mock(async () => {}),
  addVoucher: mock(async (data: Record<string, unknown>) => ({
    id: crypto.randomUUID(),
    ...data,
    createdAt: new Date(),
  })),
})
mock.module(`${MPP}/mpp.repository.ts`, mppRepoMock)

// --- Reset all ---

export function resetAllMocks() {
  mockRedis.reset()
  mockDb.reset()
  mockTemporal.reset()
}

// --- Test fixtures ---

export const TEST_SELLER: SellerRow = {
  id: '550e8400-e29b-41d4-a716-446655440000',
  merchantId: 'ab-test01',
  walletAddress: '0xSellerWallet123456',
  network: 'eip155:8453',
  createdAt: new Date(),
}

// Matches the env vars set at the top of this file.
export const FACILITATOR_ADDRESSES: Record<string, string> = {
  'eip155:8453': '0xFacilitatorBase',
  'solana:mainnet': 'FacilitatorSolAddr',
  'stellar:pubnet': 'FacilitatorStellarAddr',
}
