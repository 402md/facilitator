import { pgTable, uuid, varchar, numeric, timestamp, index } from 'drizzle-orm/pg-core'

export const sellers = pgTable(
  'sellers',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    merchantId: varchar('merchant_id', { length: 50 }).unique().notNull(),
    walletAddress: varchar('wallet_address', { length: 255 }).notNull(),
    network: varchar('network', { length: 50 }).notNull(),
    createdAt: timestamp('created_at').defaultNow(),
  },
  (table) => [index('idx_sellers_merchant').on(table.merchantId)],
)

export const transactions = pgTable(
  'transactions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    type: varchar('type', { length: 30 }).notNull(),
    protocol: varchar('protocol', { length: 10 }).notNull(),
    status: varchar('status', { length: 20 }).notNull().default('pending'),
    buyerAddress: varchar('buyer_address', { length: 255 }).notNull(),
    buyerNetwork: varchar('buyer_network', { length: 50 }).notNull(),
    sellerAddress: varchar('seller_address', { length: 255 }).notNull(),
    sellerNetwork: varchar('seller_network', { length: 50 }).notNull(),
    sellerId: uuid('seller_id').references(() => sellers.id),
    grossAmount: numeric('gross_amount', { precision: 30, scale: 0 }).notNull(),
    netAmount: numeric('net_amount', { precision: 30, scale: 0 }),
    platformFee: numeric('platform_fee', { precision: 30, scale: 0 }),
    gasAllowance: numeric('gas_allowance', { precision: 30, scale: 0 }).default('0'),
    stripeFee: numeric('stripe_fee', { precision: 30, scale: 0 }),
    pullTxHash: varchar('pull_tx_hash', { length: 255 }),
    burnTxHash: varchar('burn_tx_hash', { length: 255 }),
    mintTxHash: varchar('mint_tx_hash', { length: 255 }),
    workflowId: varchar('workflow_id', { length: 255 }),
    bridgeProvider: varchar('bridge_provider', { length: 20 }),
    createdAt: timestamp('created_at').defaultNow(),
    settledAt: timestamp('settled_at'),
  },
  (table) => [
    index('idx_transactions_seller').on(table.sellerId),
    index('idx_transactions_status').on(table.status),
    index('idx_transactions_created').on(table.createdAt),
    index('idx_transactions_seller_date').on(table.sellerId, table.createdAt),
    index('idx_transactions_workflow').on(table.workflowId),
    index('idx_transactions_buyer').on(table.buyerAddress),
  ],
)

export const mppSessions = pgTable(
  'mpp_sessions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    sellerId: uuid('seller_id').references(() => sellers.id),
    buyerAddress: varchar('buyer_address', { length: 255 }).notNull(),
    buyerNetwork: varchar('buyer_network', { length: 50 }).notNull(),
    budget: numeric('budget', { precision: 30, scale: 0 }).notNull(),
    spent: numeric('spent', { precision: 30, scale: 0 }).default('0'),
    voucherCount: numeric('voucher_count').default('0'),
    status: varchar('status', { length: 20 }).default('open'),
    expiresAt: timestamp('expires_at').notNull(),
    createdAt: timestamp('created_at').defaultNow(),
    closedAt: timestamp('closed_at'),
  },
  (table) => [
    index('idx_mpp_sessions_seller').on(table.sellerId),
    index('idx_mpp_sessions_status').on(table.status),
  ],
)

export const mppVouchers = pgTable(
  'mpp_vouchers',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    sessionId: uuid('session_id').references(() => mppSessions.id, { onDelete: 'cascade' }),
    cumulativeAmount: numeric('cumulative_amount', { precision: 30, scale: 0 }).notNull(),
    voucherHash: varchar('voucher_hash', { length: 255 }).unique().notNull(),
    createdAt: timestamp('created_at').defaultNow(),
  },
  (table) => [index('idx_mpp_vouchers_session').on(table.sessionId)],
)
