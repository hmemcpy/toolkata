import { Context, Data, Effect, Layer, MutableHashMap, Option, Ref } from "effect"
import { TIER_LIMITS, type TierLimits, type TierName, isUnlimitedTier } from "../config/tiers.js"

// Check if rate limiting should be disabled (development mode)
const isDevMode =
  process.env["NODE_ENV"] === "development" || process.env["DISABLE_RATE_LIMIT"] === "true"

// Log rate limit configuration on startup
export const logRateLimitConfig = () => {
  if (isDevMode) {
    console.log("Rate limiting: DISABLED (dev mode)")
    return
  }

  console.log("Rate limits (tiered):")
  for (const tier of ["anonymous", "logged-in", "premium", "admin"] as const) {
    const limits = TIER_LIMITS[tier]
    const sessionsDisplay = Number.isFinite(limits.sessionsPerHour)
      ? limits.sessionsPerHour
      : "unlimited"
    const concurrentDisplay = Number.isFinite(limits.maxConcurrentSessions)
      ? limits.maxConcurrentSessions
      : "unlimited"
    console.log(`  ${tier}: ${sessionsDisplay} sessions/hr, ${concurrentDisplay} concurrent`)
  }
}

/**
 * Get rate limits for a tier, accounting for dev mode.
 */
const getLimitsForTier = (tier: TierName): TierLimits => {
  if (isDevMode) {
    // In dev mode, use very high limits to effectively disable rate limiting
    return {
      sessionsPerHour: 999999,
      maxConcurrentSessions: 999999,
      commandsPerMinute: 999999,
      maxConcurrentWebSockets: 999999,
    }
  }
  return TIER_LIMITS[tier]
}

// Per-key tracking data (key is userId for auth users, IP for anonymous)
export interface RateLimitTracking {
  readonly trackingKey: string // userId or IP address
  readonly tier: TierName // User tier for rate limit lookup
  readonly sessionCount: number // Sessions created in current hour window
  readonly hourWindowStart: number // Timestamp of hour window start
  readonly activeSessions: readonly string[] // List of active session IDs
  readonly commandCount: number // Commands in current minute window
  readonly minuteWindowStart: number // Timestamp of minute window start
  readonly activeWebSocketIds: readonly string[] // List of active WebSocket connection IDs (V-007)
}

// Legacy alias for backwards compatibility
export type IpTracking = RateLimitTracking

// Rate limit check result
export interface RateLimitResult {
  readonly allowed: boolean
  readonly retryAfter?: number // Seconds until retry is allowed
}

// Error types
export class RateLimitError extends Data.TaggedClass("RateLimitError")<{
  readonly cause: "TooManySessions" | "TooManyConcurrent" | "TooManyCommands" | "TooManyWebSockets"
  readonly message: string
  readonly retryAfter?: number
}> {}

// Admin interface for rate limit management (internal use)
export interface RateLimitAdminShape {
  readonly getAllTracking: () => Effect.Effect<ReadonlyMap<string, RateLimitTracking>, never>
  readonly getTracking: (
    trackingKey: string,
  ) => Effect.Effect<Option.Option<RateLimitTracking>, never>
  readonly removeTracking: (trackingKey: string) => Effect.Effect<void, never>
}

// Service interface
export interface RateLimitServiceShape {
  /**
   * Check if a user can create a new session.
   *
   * @param trackingKey - User ID (for auth users) or IP address (for anonymous)
   * @param tier - User tier for rate limit lookup
   */
  readonly checkSessionLimit: (
    trackingKey: string,
    tier: TierName,
  ) => Effect.Effect<RateLimitResult, RateLimitError>

  /**
   * Record a new session creation.
   *
   * @param trackingKey - User ID (for auth users) or IP address (for anonymous)
   * @param sessionId - The session ID
   * @param tier - User tier for tracking
   */
  readonly recordSession: (
    trackingKey: string,
    sessionId: string,
    tier: TierName,
  ) => Effect.Effect<void, never>

  /**
   * Remove a session from tracking (on destroy or expiry).
   *
   * @param trackingKey - User ID (for auth users) or IP address (for anonymous)
   * @param sessionId - The session ID
   */
  readonly removeSession: (trackingKey: string, sessionId: string) => Effect.Effect<void, never>

  /**
   * Check if a user can execute a command.
   *
   * @param trackingKey - User ID (for auth users) or IP address (for anonymous)
   * @param tier - User tier for rate limit lookup
   */
  readonly checkCommandLimit: (
    trackingKey: string,
    tier: TierName,
  ) => Effect.Effect<RateLimitResult, RateLimitError>

  /**
   * Record a command execution.
   *
   * @param trackingKey - User ID (for auth users) or IP address (for anonymous)
   * @param tier - User tier for tracking
   */
  readonly recordCommand: (trackingKey: string, tier: TierName) => Effect.Effect<void, never>

  /**
   * Get the count of active sessions for a tracking key.
   *
   * @param trackingKey - User ID (for auth users) or IP address (for anonymous)
   */
  readonly getActiveSessionCount: (trackingKey: string) => Effect.Effect<number, never>

  /**
   * Check if a user can open a new WebSocket connection.
   *
   * @param trackingKey - User ID (for auth users) or IP address (for anonymous)
   * @param tier - User tier for rate limit lookup
   */
  readonly checkWebSocketLimit: (
    trackingKey: string,
    tier: TierName,
  ) => Effect.Effect<RateLimitResult, RateLimitError>

  /**
   * Register a new WebSocket connection.
   *
   * @param trackingKey - User ID (for auth users) or IP address (for anonymous)
   * @param connectionId - Unique connection identifier
   * @param tier - User tier for tracking
   */
  readonly registerWebSocket: (
    trackingKey: string,
    connectionId: string,
    tier: TierName,
  ) => Effect.Effect<void, never>

  /**
   * Unregister a WebSocket connection.
   *
   * @param trackingKey - User ID (for auth users) or IP address (for anonymous)
   * @param connectionId - Unique connection identifier
   */
  readonly unregisterWebSocket: (
    trackingKey: string,
    connectionId: string,
  ) => Effect.Effect<void, never>

  readonly admin: RateLimitAdminShape
}

// Service tag
export class RateLimitService extends Context.Tag("RateLimitService")<
  RateLimitService,
  RateLimitServiceShape
>() {}

// Rate limit tracking store type
interface RateLimitStore {
  readonly tracking: MutableHashMap.MutableHashMap<string, RateLimitTracking>
}

// Helper: Get current tracking state for a key, creating if needed
const getOrCreateTracking = (
  store: RateLimitStore,
  trackingKey: string,
  tier: TierName,
  now: number,
): RateLimitTracking => {
  // MutableHashMap.get is synchronous in Effect 3.x
  const existingOption = MutableHashMap.get(store.tracking, trackingKey)

  if (Option.isNone(existingOption)) {
    // First request from this key
    return {
      trackingKey,
      tier,
      sessionCount: 0,
      hourWindowStart: now,
      activeSessions: [],
      commandCount: 0,
      minuteWindowStart: now,
      activeWebSocketIds: [],
    } satisfies RateLimitTracking
  }

  const tracking = existingOption.value
  // Ensure activeWebSocketIds exists (for backwards compatibility with old tracking data)
  const activeWebSocketIds = tracking.activeWebSocketIds ?? []
  const hourElapsed = now - tracking.hourWindowStart >= 60 * 60 * 1000
  const minuteElapsed = now - tracking.minuteWindowStart >= 60 * 1000

  // Update tier if it changed (e.g., user logged in)
  const updatedTier = tier

  // Reset counters if windows have expired
  if (hourElapsed && minuteElapsed) {
    return {
      trackingKey,
      tier: updatedTier,
      sessionCount: 0,
      hourWindowStart: now,
      activeSessions: tracking.activeSessions,
      commandCount: 0,
      minuteWindowStart: now,
      activeWebSocketIds,
    }
  }

  if (hourElapsed) {
    return {
      ...tracking,
      tier: updatedTier,
      sessionCount: 0,
      hourWindowStart: now,
      activeWebSocketIds,
    }
  }

  if (minuteElapsed) {
    return {
      ...tracking,
      tier: updatedTier,
      commandCount: 0,
      minuteWindowStart: now,
      activeWebSocketIds,
    }
  }

  return { ...tracking, tier: updatedTier, activeWebSocketIds }
}

// Helper: Calculate retry-after seconds
const calculateRetryAfter = (windowStart: number, windowDuration: number, now: number): number => {
  const windowEnd = windowStart + windowDuration
  const remainingMs = Math.max(0, windowEnd - now)
  return Math.ceil(remainingMs / 1000)
}

// Service implementation
const make = Effect.gen(function* () {
  // Create rate limit store
  const storeRef = yield* Ref.make<RateLimitStore>({
    tracking: MutableHashMap.empty<string, RateLimitTracking>(),
  })

  // Check if user can create a new session
  const checkSessionLimit = (trackingKey: string, tier: TierName) =>
    Effect.gen(function* () {
      // Admin tier bypasses all checks
      if (isUnlimitedTier(tier)) {
        return { allowed: true } satisfies RateLimitResult
      }

      const now = Date.now()
      const store = yield* Ref.get(storeRef)
      const tracking = getOrCreateTracking(store, trackingKey, tier, now)
      const limits = getLimitsForTier(tier)

      // Check hourly limit
      if (tracking.sessionCount >= limits.sessionsPerHour) {
        const retryAfter = calculateRetryAfter(tracking.hourWindowStart, 60 * 60 * 1000, now)
        return {
          allowed: false,
          retryAfter,
        } satisfies RateLimitResult
      }

      // Check concurrent limit
      if (tracking.activeSessions.length >= limits.maxConcurrentSessions) {
        return {
          allowed: false,
          // No retry time for concurrent - user must destroy a session
        } satisfies RateLimitResult
      }

      return { allowed: true } satisfies RateLimitResult
    })

  // Record a new session creation
  const recordSession = (trackingKey: string, sessionId: string, tier: TierName) =>
    Effect.gen(function* () {
      const now = Date.now()
      const store = yield* Ref.get(storeRef)

      // Get or create tracking, then increment counters
      const tracking = getOrCreateTracking(store, trackingKey, tier, now)

      const updatedTracking: RateLimitTracking = {
        trackingKey: tracking.trackingKey,
        tier: tracking.tier,
        sessionCount: tracking.sessionCount + 1,
        hourWindowStart: tracking.hourWindowStart,
        activeSessions: [...tracking.activeSessions, sessionId],
        commandCount: tracking.commandCount,
        minuteWindowStart: tracking.minuteWindowStart,
        activeWebSocketIds: tracking.activeWebSocketIds,
      }

      // MutableHashMap.set is synchronous and mutates in place
      MutableHashMap.set(store.tracking, trackingKey, updatedTracking)
    })

  // Remove a session from active tracking
  const removeSession = (trackingKey: string, sessionId: string) =>
    Effect.gen(function* () {
      const store = yield* Ref.get(storeRef)
      const trackingOption = MutableHashMap.get(store.tracking, trackingKey)

      if (Option.isNone(trackingOption)) {
        // Key not tracked, nothing to do
        return
      }

      const tracking = trackingOption.value
      const updatedActiveSessions = tracking.activeSessions.filter((id: string) => id !== sessionId)

      // If no active sessions and no recent activity, we could clean up
      // But keep the tracking entry for rate limit state

      const updatedTracking: RateLimitTracking = {
        ...tracking,
        activeSessions: updatedActiveSessions,
      }

      // MutableHashMap.set is synchronous and mutates in place
      MutableHashMap.set(store.tracking, trackingKey, updatedTracking)
    })

  // Check if user can execute a command
  const checkCommandLimit = (trackingKey: string, tier: TierName) =>
    Effect.gen(function* () {
      // Admin tier bypasses all checks
      if (isUnlimitedTier(tier)) {
        return { allowed: true } satisfies RateLimitResult
      }

      const now = Date.now()
      const store = yield* Ref.get(storeRef)
      const tracking = getOrCreateTracking(store, trackingKey, tier, now)
      const limits = getLimitsForTier(tier)

      if (tracking.commandCount >= limits.commandsPerMinute) {
        const retryAfter = calculateRetryAfter(tracking.minuteWindowStart, 60 * 1000, now)
        return {
          allowed: false,
          retryAfter,
        } satisfies RateLimitResult
      }

      return { allowed: true } satisfies RateLimitResult
    })

  // Record a command execution
  const recordCommand = (trackingKey: string, tier: TierName) =>
    Effect.gen(function* () {
      const now = Date.now()
      const store = yield* Ref.get(storeRef)
      const tracking = getOrCreateTracking(store, trackingKey, tier, now)

      const updatedTracking: RateLimitTracking = {
        ...tracking,
        commandCount: tracking.commandCount + 1,
        minuteWindowStart: tracking.minuteWindowStart,
      }

      // MutableHashMap.set is synchronous and mutates in place
      MutableHashMap.set(store.tracking, trackingKey, updatedTracking)
    })

  // Get active session count for a tracking key
  const getActiveSessionCount = (trackingKey: string) =>
    Ref.get(storeRef).pipe(
      Effect.map((store) => {
        const trackingOption = MutableHashMap.get(store.tracking, trackingKey)
        if (Option.isNone(trackingOption)) {
          return 0
        }
        return trackingOption.value.activeSessions.length
      }),
    )

  // Check if user can open a new WebSocket connection
  const checkWebSocketLimit = (trackingKey: string, tier: TierName) =>
    Effect.gen(function* () {
      // Admin tier bypasses all checks
      if (isUnlimitedTier(tier)) {
        return { allowed: true } satisfies RateLimitResult
      }

      const now = Date.now()
      const store = yield* Ref.get(storeRef)
      const tracking = getOrCreateTracking(store, trackingKey, tier, now)
      const limits = getLimitsForTier(tier)

      // Check concurrent WebSocket limit
      if (tracking.activeWebSocketIds.length >= limits.maxConcurrentWebSockets) {
        return {
          allowed: false,
          // No retry time for concurrent - user must close a connection
        } satisfies RateLimitResult
      }

      return { allowed: true } satisfies RateLimitResult
    })

  // Register a new WebSocket connection
  const registerWebSocket = (trackingKey: string, connectionId: string, tier: TierName) =>
    Effect.gen(function* () {
      const now = Date.now()
      const store = yield* Ref.get(storeRef)
      const tracking = getOrCreateTracking(store, trackingKey, tier, now)

      const updatedTracking: RateLimitTracking = {
        ...tracking,
        activeWebSocketIds: [...tracking.activeWebSocketIds, connectionId],
      }

      // MutableHashMap.set is synchronous and mutates in place
      MutableHashMap.set(store.tracking, trackingKey, updatedTracking)
    })

  // Unregister a WebSocket connection
  const unregisterWebSocket = (trackingKey: string, connectionId: string) =>
    Effect.gen(function* () {
      const store = yield* Ref.get(storeRef)
      const trackingOption = MutableHashMap.get(store.tracking, trackingKey)

      if (Option.isNone(trackingOption)) {
        // Key not tracked, nothing to do
        return
      }

      const tracking = trackingOption.value
      const updatedWebSocketIds = tracking.activeWebSocketIds.filter(
        (id: string) => id !== connectionId,
      )

      const updatedTracking: RateLimitTracking = {
        ...tracking,
        activeWebSocketIds: updatedWebSocketIds,
      }

      // MutableHashMap.set is synchronous and mutates in place
      MutableHashMap.set(store.tracking, trackingKey, updatedTracking)
    })

  // Admin interface for rate limit management
  const admin = {
    // Get all tracking data as a ReadonlyMap
    getAllTracking: () =>
      Ref.get(storeRef).pipe(
        Effect.map((store) => {
          // Convert MutableHashMap to ReadonlyMap
          const map = new Map<string, RateLimitTracking>()
          MutableHashMap.forEach(store.tracking, (value, key) => {
            map.set(key, value)
          })
          return map as ReadonlyMap<string, RateLimitTracking>
        }),
      ),

    // Get tracking data for a specific key
    getTracking: (trackingKey: string) =>
      Ref.get(storeRef).pipe(
        Effect.map((store) => MutableHashMap.get(store.tracking, trackingKey)),
      ),

    // Remove all tracking data for a key
    removeTracking: (trackingKey: string) =>
      Ref.get(storeRef).pipe(
        Effect.map((store) => {
          MutableHashMap.remove(store.tracking, trackingKey)
        }),
      ),
  }

  return {
    checkSessionLimit,
    recordSession,
    removeSession,
    checkCommandLimit,
    recordCommand,
    getActiveSessionCount,
    checkWebSocketLimit,
    registerWebSocket,
    unregisterWebSocket,
    admin,
  }
})

// Live layer
export const RateLimitServiceLive = Layer.effect(RateLimitService, make)

// Re-export tier configuration for use in other services
export { TIER_LIMITS, type TierName, type TierLimits } from "../config/tiers.js"
