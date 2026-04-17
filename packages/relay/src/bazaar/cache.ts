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
  const sorted = Object.keys(params)
    .sort()
    .map((k) => `${k}=${params[k] ?? ''}`)
    .join('&')
  return `402md:bazaar:${endpoint}:${sorted}`
}
