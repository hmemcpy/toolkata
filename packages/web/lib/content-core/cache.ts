/**
 * cache.ts - In-memory caching service with TTL support.
 *
 * Provides a simple but thread-safe caching mechanism using Effect-TS Ref.
 * Cache entries expire after a configurable TTL (time-to-live) period.
 */

import { Context, Effect, Layer, Ref } from "effect"
import * as Option from "effect/Option"

/**
 * Cache entry with expiration timestamp.
 */
interface CacheEntry<T> {
  readonly value: T
  readonly expiresAt: number
}

/**
 * Internal cache store using Map for O(1) lookups.
 */
interface CacheStore {
  readonly entries: Map<string, CacheEntry<unknown>>
}

/**
 * CacheService interface.
 */
export interface CacheServiceShape {
  readonly get: <T>(key: string) => Effect.Effect<Option.Option<T>>
  readonly set: <T>(key: string, value: T, ttl: number) => Effect.Effect<void>
  readonly clear: () => Effect.Effect<void>
  readonly cleanup: () => Effect.Effect<void>
}

/**
 * Tag for the CacheService.
 */
export class CacheService extends Context.Tag("CacheService")<CacheService, CacheServiceShape>() {}

/**
 * Helper: Check if a cache entry is expired.
 */
const isExpired = (entry: CacheEntry<unknown>): boolean => {
  return Date.now() > entry.expiresAt
}

/**
 * Helper: Create a cache entry with expiration.
 */
const createEntry = <T>(value: T, ttl: number): CacheEntry<T> => {
  return {
    value,
    expiresAt: Date.now() + ttl,
  } as const
}

/**
 * Create the CacheService implementation.
 */
const makeCacheService = Effect.gen(function* () {
  const storeRef = yield* Ref.make<CacheStore>({
    entries: new Map<string, CacheEntry<unknown>>(),
  })

  const get = <T>(key: string): Effect.Effect<Option.Option<T>> =>
    Ref.get(storeRef).pipe(
      Effect.map((store) => {
        const entry = store.entries.get(key)

        if (entry === undefined) {
          return Option.none()
        }

        if (isExpired(entry)) {
          store.entries.delete(key)
          return Option.none()
        }

        return Option.some(entry.value as T)
      }),
    )

  const set = <T>(key: string, value: T, ttl: number): Effect.Effect<void> =>
    Ref.modify(storeRef, (store) => {
      const newEntries = new Map(store.entries)
      newEntries.set(key, createEntry(value, ttl))

      const newStore: CacheStore = {
        entries: newEntries,
      }

      return [void 0, newStore] as const
    })

  const clear = (): Effect.Effect<void> =>
    Ref.set(storeRef, {
      entries: new Map<string, CacheEntry<unknown>>(),
    })

  const cleanup = (): Effect.Effect<void> =>
    Ref.modify(storeRef, (store) => {
      const now = Date.now()
      const newEntries = new Map<string, CacheEntry<unknown>>()

      for (const [key, entry] of store.entries) {
        if (entry.expiresAt > now) {
          newEntries.set(key, entry)
        }
      }

      const newStore: CacheStore = {
        entries: newEntries,
      }

      return [void 0, newStore] as const
    })

  return {
    get,
    set,
    clear,
    cleanup,
  } satisfies CacheServiceShape
})

/**
 * Live layer for CacheService.
 */
export const CacheServiceLive = Layer.effect(CacheService, makeCacheService)
