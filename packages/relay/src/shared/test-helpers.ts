// Env must be set before any code that reads it (e.g. @402md/shared/networks).
process.env.NETWORK_ENV = 'mainnet'
process.env.BASE_RPC_URL = 'https://test.base'
process.env.SOLANA_RPC_URL = 'https://test.solana'
process.env.STELLAR_RPC_URL = 'https://test.stellar'
// Must be a real checksummed address: EIP-712 recovery hashes it as an `address`.
process.env.FACILITATOR_BASE = '0x1F98431c8aD98523631AE4a59f267346ea31F984'
process.env.FACILITATOR_SOLANA = 'FacilitatorSolAddr'
process.env.FACILITATOR_STELLAR = 'FacilitatorStellarAddr'

import { mock } from 'bun:test'

// --- Redis Mock ---

const store = new Map<string, string>()
const expiries = new Map<string, number>()

export const mockRedis = {
  get: mock((key: string) => store.get(key) ?? null),
  set: mock((key: string, value: string, ...args: unknown[]) => {
    // `SET NX` is how replay keys are claimed — the mock has to refuse an
    // existing key, otherwise the atomicity it buys is untestable.
    if (args.includes('NX') && store.has(key)) return null
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

export const TEST_PULL_TX = '0xpull0000000000000000000000000000000000000000000000000000000000'

type ResultMode =
  | { kind: 'resolve'; value: unknown }
  | { kind: 'reject'; error: Error }
  | { kind: 'never' }

const DEFAULT_STATUS = { step: 'settled', pullTxHash: TEST_PULL_TX }
const DEFAULT_RESULT: ResultMode = {
  kind: 'resolve',
  value: { success: true, pullTxHash: TEST_PULL_TX },
}

let workflowStatus: unknown = DEFAULT_STATUS
let workflowList: unknown[] = []
let startedWorkflows: { name: string; options: unknown }[] = []
let resultMode: ResultMode = DEFAULT_RESULT
let startError: Error | null = null

// Built on demand so a `reject` mode never produces an unhandled rejection in
// tests that only query the status and never await the result.
function makeHandle(workflowId: string) {
  return {
    workflowId,
    query: mock(async () => workflowStatus),
    result: mock(() => {
      if (resultMode.kind === 'reject') return Promise.reject(resultMode.error)
      if (resultMode.kind === 'never') return new Promise(() => {})
      return Promise.resolve(resultMode.value)
    }),
  }
}

export const mockTemporal = {
  workflow: {
    start: mock(async (name: string, options: unknown) => {
      startedWorkflows.push({ name, options })
      if (startError) throw startError
      return makeHandle((options as { workflowId: string }).workflowId)
    }),
    getHandle: mock((workflowId: string) => makeHandle(workflowId)),
    list: mock(function* () {
      for (const w of workflowList) yield w
    }),
  },
  setStatus(status: unknown) {
    workflowStatus = status
  },
  /** Workflow finishes successfully with this result. */
  setResult(value: unknown) {
    resultMode = { kind: 'resolve', value }
  },
  /** Workflow terminates as failed. */
  setFailure(error: Error) {
    resultMode = { kind: 'reject', error }
  },
  /** Workflow never reaches a terminal state — used to exercise the wait timeout. */
  setNeverSettles() {
    resultMode = { kind: 'never' }
  },
  /** `workflow.start` itself blows up (Temporal unreachable). */
  setStartError(error: Error | null) {
    startError = error
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
    workflowStatus = DEFAULT_STATUS
    workflowList = []
    startedWorkflows = []
    resultMode = DEFAULT_RESULT
    startError = null
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
  bazaarResources: {},
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
  'eip155:8453': '0x1F98431c8aD98523631AE4a59f267346ea31F984',
  'solana:mainnet': 'FacilitatorSolAddr',
  'stellar:pubnet': 'FacilitatorStellarAddr',
}

// --- x402 payment fixtures ---

/** Anvil account #0 — a throwaway key, only ever used to sign test payloads. */
export const TEST_BUYER_PRIVATE_KEY =
  '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80'
export const TEST_BUYER_ADDRESS = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266'

export const TEST_NONCE = '0x0000000000000000000000000000000000000000000000000000000000000001'

/**
 * Sign a real EIP-3009 `TransferWithAuthorization` for Base mainnet USDC, so
 * tests exercise the same recovery path production does instead of a stub.
 */
export async function signTestAuthorization(
  overrides: Partial<{
    from: string
    to: string
    value: string
    validAfter: string
    validBefore: string
    nonce: string
    privateKey: string
  }> = {},
) {
  const { privateKeyToAccount } = await import('viem/accounts')

  const authorization = {
    from: overrides.from ?? TEST_BUYER_ADDRESS,
    to: overrides.to ?? FACILITATOR_ADDRESSES['eip155:8453'],
    value: overrides.value ?? '1000000',
    validAfter: overrides.validAfter ?? '0',
    validBefore: overrides.validBefore ?? '99999999999',
    nonce: overrides.nonce ?? TEST_NONCE,
  }

  const account = privateKeyToAccount(
    (overrides.privateKey ?? TEST_BUYER_PRIVATE_KEY) as `0x${string}`,
  )

  const signature = await account.signTypedData({
    domain: {
      name: 'USD Coin',
      version: '2',
      chainId: 8453,
      verifyingContract: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
    },
    types: {
      TransferWithAuthorization: [
        { name: 'from', type: 'address' },
        { name: 'to', type: 'address' },
        { name: 'value', type: 'uint256' },
        { name: 'validAfter', type: 'uint256' },
        { name: 'validBefore', type: 'uint256' },
        { name: 'nonce', type: 'bytes32' },
      ],
    },
    primaryType: 'TransferWithAuthorization',
    message: {
      from: authorization.from as `0x${string}`,
      to: authorization.to as `0x${string}`,
      value: BigInt(authorization.value),
      validAfter: BigInt(authorization.validAfter),
      validBefore: BigInt(authorization.validBefore),
      nonce: authorization.nonce as `0x${string}`,
    },
  })

  return { authorization, signature }
}

/** A complete, valid x402 settle/verify request for Base mainnet. */
export async function buildPaymentRequest(
  overrides: Parameters<typeof signTestAuthorization>[0] = {},
) {
  const { authorization, signature } = await signTestAuthorization(overrides)
  return {
    x402Version: 2,
    paymentPayload: { payload: { authorization, signature } },
    paymentRequirements: {
      scheme: 'exact',
      network: 'eip155:8453',
      payTo: FACILITATOR_ADDRESSES['eip155:8453'],
      amount: authorization.value,
      extra: { merchantId: 'ab-test01' },
    },
  }
}
