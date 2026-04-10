import {
  pgTable,
  uuid,
  varchar,
  numeric,
  integer,
  timestamp,
  index,
  uniqueIndex,
  text,
} from 'drizzle-orm/pg-core'

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

export const bazaarResources = pgTable(
  'bazaar_resources',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    resourceUrl: varchar('resource_url', { length: 2048 }).notNull(),
    baseUrl: varchar('base_url', { length: 512 }).notNull(),
    description: text('description'),
    sellerId: uuid('seller_id')
      .references(() => sellers.id)
      .notNull(),
    merchantId: varchar('merchant_id', { length: 50 }).notNull(),
    network: varchar('network', { length: 50 }).notNull(),
    payTo: varchar('pay_to', { length: 255 }).notNull(),
    amount: varchar('amount', { length: 50 }).notNull(),
    scheme: varchar('scheme', { length: 20 }).notNull().default('exact'),
    useCount: integer('use_count').notNull().default(1),
    totalVolume: numeric('total_volume', { precision: 30, scale: 0 }).notNull().default('0'),
    firstSeenAt: timestamp('first_seen_at').defaultNow().notNull(),
    lastUsedAt: timestamp('last_used_at').defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('uniq_bazaar_resource_network').on(table.resourceUrl, table.network),
    index('idx_bazaar_resources_seller').on(table.sellerId),
    index('idx_bazaar_resources_base_url').on(table.baseUrl),
    index('idx_bazaar_resources_use_count').on(table.useCount),
  ],
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
