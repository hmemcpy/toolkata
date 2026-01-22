import { Context, Data, Effect, Layer, MutableHashMap, Ref } from "effect"

// Rate limit configuration (from PLAN.md specs)
const RATE_LIMITS = {
  sessionsPerHour: 10, // Max new sessions per hour per IP
  maxConcurrentSessions: 2, // Max concurrent sessions per IP
  commandsPerMinute: 60, // Max commands per minute (optional, for future use)
} as const

// Per-IP tracking data
export interface IpTracking {
  readonly sessionCount: number // Sessions created in current hour window
  readonly hourWindowStart: number // Timestamp of hour window start
  readonly activeSessions: readonly string[] // List of active session IDs
  readonly commandCount: number // Commands in current minute window
  readonly minuteWindowStart: number // Timestamp of minute window start
}

// Rate limit check result
export interface RateLimitResult {
  readonly allowed: boolean
  readonly retryAfter?: number // Seconds until retry is allowed
}

// Error types
export class RateLimitError extends Data.TaggedClass("RateLimitError")<{
  readonly cause: "TooManySessions" | "TooManyConcurrent" | "TooManyCommands"
  readonly message: string
  readonly retryAfter?: number
}> {}

// Service interface
export interface RateLimitServiceShape {
  readonly checkSessionLimit: (ipAddress: string) => Effect.Effect<RateLimitResult, RateLimitError>
  readonly recordSession: (ipAddress: string, sessionId: string) => Effect.Effect<void, never>
  readonly removeSession: (ipAddress: string, sessionId: string) => Effect.Effect<void, never>
  readonly checkCommandLimit: (ipAddress: string) => Effect.Effect<RateLimitResult, RateLimitError>
  readonly recordCommand: (ipAddress: string) => Effect.Effect<void, never>
  readonly getActiveSessionCount: (ipAddress: string) => Effect.Effect<number, never>
}

// Service tag
export class RateLimitService extends Context.Tag("RateLimitService")<
  RateLimitService,
  RateLimitServiceShape
>() {}

// IP tracking store type
interface RateLimitStore {
  readonly ipTracking: MutableHashMap.MutableHashMap<string, IpTracking>
}

// Helper: Get current tracking state for IP, creating if needed
const getOrCreateTracking = (store: RateLimitStore, ipAddress: string, now: number): IpTracking => {
  const existing = MutableHashMap.get(store.ipTracking, ipAddress)

  if (existing === undefined) {
    // First request from this IP
    return {
      sessionCount: 0,
      hourWindowStart: now,
      activeSessions: [],
      commandCount: 0,
      minuteWindowStart: now,
    } satisfies IpTracking
  }

  const tracking = existing
  const hourElapsed = now - tracking.hourWindowStart >= 60 * 60 * 1000
  const minuteElapsed = now - tracking.minuteWindowStart >= 60 * 1000

  // Reset counters if windows have expired
  if (hourElapsed && minuteElapsed) {
    return {
      sessionCount: 0,
      hourWindowStart: now,
      activeSessions: tracking.activeSessions,
      commandCount: 0,
      minuteWindowStart: now,
    }
  }

  if (hourElapsed) {
    return {
      ...tracking,
      sessionCount: 0,
      hourWindowStart: now,
    }
  }

  if (minuteElapsed) {
    return {
      ...tracking,
      commandCount: 0,
      minuteWindowStart: now,
    }
  }

  return tracking
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
    ipTracking: MutableHashMap.empty<string, IpTracking>(),
  })

  // Check if IP can create a new session
  const checkSessionLimit = (ipAddress: string) =>
    Effect.gen(function* () {
      const now = Date.now()
      const store = yield* Ref.get(storeRef)
      const tracking = getOrCreateTracking(store, ipAddress, now)

      // Check hourly limit
      if (tracking.sessionCount >= RATE_LIMITS.sessionsPerHour) {
        const retryAfter = calculateRetryAfter(tracking.hourWindowStart, 60 * 60 * 1000, now)
        return {
          allowed: false,
          retryAfter,
        } satisfies RateLimitResult
      }

      // Check concurrent limit
      if (tracking.activeSessions.length >= RATE_LIMITS.maxConcurrentSessions) {
        return {
          allowed: false,
          // No retry time for concurrent - user must destroy a session
        } satisfies RateLimitResult
      }

      return { allowed: true } satisfies RateLimitResult
    })

  // Record a new session creation
  const recordSession = (ipAddress: string, sessionId: string) =>
    Effect.gen(function* () {
      const now = Date.now()
      const store = yield* Ref.get(storeRef)

      // Get or create tracking, then increment counters
      const tracking = getOrCreateTracking(store, ipAddress, now)

      const updatedTracking: IpTracking = {
        sessionCount: tracking.sessionCount + 1,
        hourWindowStart: tracking.hourWindowStart,
        activeSessions: [...tracking.activeSessions, sessionId],
        commandCount: tracking.commandCount,
        minuteWindowStart: tracking.minuteWindowStart,
      }

      const updatedIpTracking = yield* MutableHashMap.set(
        store.ipTracking,
        ipAddress,
        updatedTracking,
      )

      yield* Ref.set(storeRef, { ipTracking: updatedIpTracking })
    })

  // Remove a session from active tracking
  const removeSession = (ipAddress: string, sessionId: string) =>
    Effect.gen(function* () {
      const store = yield* Ref.get(storeRef)
      const trackingOption = yield* MutableHashMap.get(store.ipTracking, ipAddress)

      if (trackingOption === undefined) {
        // IP not tracked, nothing to do
        return
      }

      const tracking = trackingOption
      const updatedActiveSessions = tracking.activeSessions.filter((id) => id !== sessionId)

      // If no active sessions and no recent activity, we could clean up
      // But keep the tracking entry for rate limit state

      const updatedTracking: IpTracking = {
        ...tracking,
        activeSessions: updatedActiveSessions,
      }

      const updatedIpTracking = yield* MutableHashMap.set(
        store.ipTracking,
        ipAddress,
        updatedTracking,
      )

      yield* Ref.set(storeRef, { ipTracking: updatedIpTracking })
    })

  // Check if IP can execute a command
  const checkCommandLimit = (ipAddress: string) =>
    Effect.gen(function* () {
      const now = Date.now()
      const store = yield* Ref.get(storeRef)
      const tracking = getOrCreateTracking(store, ipAddress, now)

      if (tracking.commandCount >= RATE_LIMITS.commandsPerMinute) {
        const retryAfter = calculateRetryAfter(tracking.minuteWindowStart, 60 * 1000, now)
        return {
          allowed: false,
          retryAfter,
        } satisfies RateLimitResult
      }

      return { allowed: true } satisfies RateLimitResult
    })

  // Record a command execution
  const recordCommand = (ipAddress: string) =>
    Effect.gen(function* () {
      const now = Date.now()
      const store = yield* Ref.get(storeRef)
      const tracking = getOrCreateTracking(store, ipAddress, now)

      const updatedTracking: IpTracking = {
        ...tracking,
        commandCount: tracking.commandCount + 1,
        minuteWindowStart: tracking.minuteWindowStart,
      }

      const updatedIpTracking = yield* MutableHashMap.set(
        store.ipTracking,
        ipAddress,
        updatedTracking,
      )

      yield* Ref.set(storeRef, { ipTracking: updatedIpTracking })
    })

  // Get active session count for an IP
  const getActiveSessionCount = (ipAddress: string) =>
    Ref.get(storeRef).pipe(
      Effect.flatMap((store) =>
        Effect.gen(function* () {
          const trackingOption = yield* MutableHashMap.get(store.ipTracking, ipAddress)
          if (trackingOption === undefined) {
            return 0
          }
          return trackingOption.activeSessions.length
        }),
      ),
    )

  return {
    checkSessionLimit,
    recordSession,
    removeSession,
    checkCommandLimit,
    recordCommand,
    getActiveSessionCount,
  }
})

// Live layer
export const RateLimitServiceLive = Layer.effect(RateLimitService, make)

// Export rate limit constants for use in other services
export const RATE_LIMITS_CONFIG = RATE_LIMITS
