import { eq } from 'drizzle-orm'
import { db } from '@/shared/db'
import { mppSessions, mppVouchers } from '@/shared/schema'

export async function createSession(data: {
  sellerId: string
  buyerAddress: string
  buyerNetwork: string
  budget: string
  expiresAt: Date
}) {
  const [session] = await db.insert(mppSessions).values(data).returning()
  return session
}

export async function findSession(id: string) {
  return db.query.mppSessions.findFirst({
    where: eq(mppSessions.id, id),
  })
}

export async function updateSessionSpent(id: string, spent: string, voucherCount: number) {
  await db.update(mppSessions)
    .set({ spent, voucherCount: voucherCount.toString() })
    .where(eq(mppSessions.id, id))
}

export async function closeSession(id: string) {
  await db.update(mppSessions)
    .set({ status: 'closed', closedAt: new Date() })
    .where(eq(mppSessions.id, id))
}

export async function addVoucher(data: {
  sessionId: string
  cumulativeAmount: string
  voucherHash: string
}) {
  const [voucher] = await db.insert(mppVouchers).values(data).returning()
  return voucher
}
