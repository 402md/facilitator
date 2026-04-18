import { redis } from '@402md/shared/cache'

export interface CachedResult<T> {
  value: T
  hit: boolean
}

export async function cached<T>(
  key: string,
  ttlSeconds: number,
  compute: () => Promise<T>,
): Promise<CachedResult<T>> {
  const raw = await redis.get(key)
  if (raw) return { value: JSON.parse(raw) as T, hit: true }
  const value = await compute()
  await redis.set(key, JSON.stringify(value), 'EX', ttlSeconds)
  return { value, hit: false }
}

export function bazaarCacheKey(endpoint: string, params: Record<string, unknown>): string {
  const sortedKeys = Object.keys(params).sort()
  const canonical: Record<string, unknown> = {}
  for (const k of sortedKeys) canonical[k] = params[k] ?? null
  return `402md:bazaar:${endpoint}:${JSON.stringify(canonical)}`
}
