import { Context, Data, Effect, Layer, MutableHashMap, Option, Ref } from "effect"

// Check if rate limiting should be disabled (development mode)
const isDevMode =
  process.env["NODE_ENV"] === "development" || process.env["DISABLE_RATE_LIMIT"] === "true"

// Defaults
const DEFAULTS = {
  sessionsPerHour: 50,
  maxConcurrentSessions: 2,
  commandsPerMinute: 60,
  maxConcurrentWebSockets: 3,
} as const

// Rate limit configuration (from env or defaults)
// In dev mode, use very high limits to effectively disable rate limiting
const RATE_LIMITS = {
  sessionsPerHour: isDevMode
    ? 999999
    : Number(process.env["MAX_SESSIONS_PER_HOUR"]) || DEFAULTS.sessionsPerHour,
  maxConcurrentSessions: isDevMode
    ? 999999
    : Number(process.env["MAX_CONCURRENT_PER_IP"]) || DEFAULTS.maxConcurrentSessions,
  commandsPerMinute: isDevMode
    ? 999999
    : Number(process.env["COMMANDS_PER_MINUTE"]) || DEFAULTS.commandsPerMinute,
  maxConcurrentWebSockets: isDevMode
    ? 999999
    : Number(process.env["MAX_WEBSOCKETS_PER_IP"]) || DEFAULTS.maxConcurrentWebSockets,
} as const

// Log rate limit configuration on startup
export const logRateLimitConfig = () => {
  if (isDevMode) {
    console.log("Rate limiting: DISABLED (dev mode)")
    return
  }

  const source = (envVar: string, actualVal: number) =>
    process.env[envVar] ? `${actualVal} (from env)` : `${actualVal} (default)`

  console.log("Rate limits:")
  console.log(
    `  Sessions/hour:       ${source("MAX_SESSIONS_PER_HOUR", RATE_LIMITS.sessionsPerHour)}`,
  )
  console.log(
    `  Concurrent sessions: ${source("MAX_CONCURRENT_PER_IP", RATE_LIMITS.maxConcurrentSessions)}`,
  )
  console.log(
    `  Commands/minute:     ${source("COMMANDS_PER_MINUTE", RATE_LIMITS.commandsPerMinute)}`,
  )
  console.log(
    `  Concurrent WS:       ${source("MAX_WEBSOCKETS_PER_IP", RATE_LIMITS.maxConcurrentWebSockets)}`,
  )
}

// Per-IP tracking data
export interface IpTracking {
  readonly sessionCount: number // Sessions created in current hour window
  readonly hourWindowStart: number // Timestamp of hour window start
  readonly activeSessions: readonly string[] // List of active session IDs
  readonly commandCount: number // Commands in current minute window
  readonly minuteWindowStart: number // Timestamp of minute window start
  readonly activeWebSocketIds: readonly string[] // List of active WebSocket connection IDs (V-007)
}

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

// Service interface
export interface RateLimitServiceShape {
  readonly checkSessionLimit: (ipAddress: string) => Effect.Effect<RateLimitResult, RateLimitError>
  readonly recordSession: (ipAddress: string, sessionId: string) => Effect.Effect<void, never>
  readonly removeSession: (ipAddress: string, sessionId: string) => Effect.Effect<void, never>
  readonly checkCommandLimit: (ipAddress: string) => Effect.Effect<RateLimitResult, RateLimitError>
  readonly recordCommand: (ipAddress: string) => Effect.Effect<void, never>
  readonly getActiveSessionCount: (ipAddress: string) => Effect.Effect<number, never>
  readonly checkWebSocketLimit: (
    ipAddress: string,
  ) => Effect.Effect<RateLimitResult, RateLimitError> // V-007
  readonly registerWebSocket: (
    ipAddress: string,
    connectionId: string,
  ) => Effect.Effect<void, never> // V-007
  readonly unregisterWebSocket: (
    ipAddress: string,
    connectionId: string,
  ) => Effect.Effect<void, never> // V-007
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
  // MutableHashMap.get is synchronous in Effect 3.x
  const existingOption = MutableHashMap.get(store.ipTracking, ipAddress)

  if (Option.isNone(existingOption)) {
    // First request from this IP
    return {
      sessionCount: 0,
      hourWindowStart: now,
      activeSessions: [],
      commandCount: 0,
      minuteWindowStart: now,
      activeWebSocketIds: [],
    } satisfies IpTracking
  }

  const tracking = existingOption.value
  // Ensure activeWebSocketIds exists (for backwards compatibility with old tracking data)
  const activeWebSocketIds = tracking.activeWebSocketIds ?? []
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
      activeWebSocketIds,
    }
  }

  if (hourElapsed) {
    return {
      ...tracking,
      sessionCount: 0,
      hourWindowStart: now,
      activeWebSocketIds,
    }
  }

  if (minuteElapsed) {
    return {
      ...tracking,
      commandCount: 0,
      minuteWindowStart: now,
      activeWebSocketIds,
    }
  }

  return { ...tracking, activeWebSocketIds }
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

      // MutableHashMap.set is synchronous and mutates in place
      MutableHashMap.set(store.ipTracking, ipAddress, updatedTracking)
    })

  // Remove a session from active tracking
  const removeSession = (ipAddress: string, sessionId: string) =>
    Effect.gen(function* () {
      const store = yield* Ref.get(storeRef)
      const trackingOption = MutableHashMap.get(store.ipTracking, ipAddress)

      if (Option.isNone(trackingOption)) {
        // IP not tracked, nothing to do
        return
      }

      const tracking = trackingOption.value
      const updatedActiveSessions = tracking.activeSessions.filter((id: string) => id !== sessionId)

      // If no active sessions and no recent activity, we could clean up
      // But keep the tracking entry for rate limit state

      const updatedTracking: IpTracking = {
        ...tracking,
        activeSessions: updatedActiveSessions,
      }

      // MutableHashMap.set is synchronous and mutates in place
      MutableHashMap.set(store.ipTracking, ipAddress, updatedTracking)
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

      // MutableHashMap.set is synchronous and mutates in place
      MutableHashMap.set(store.ipTracking, ipAddress, updatedTracking)
    })

  // Get active session count for an IP
  const getActiveSessionCount = (ipAddress: string) =>
    Ref.get(storeRef).pipe(
      Effect.map((store) => {
        const trackingOption = MutableHashMap.get(store.ipTracking, ipAddress)
        if (Option.isNone(trackingOption)) {
          return 0
        }
        return trackingOption.value.activeSessions.length
      }),
    )

  // V-007: Check if IP can open a new WebSocket connection
  const checkWebSocketLimit = (ipAddress: string) =>
    Effect.gen(function* () {
      const now = Date.now()
      const store = yield* Ref.get(storeRef)
      const tracking = getOrCreateTracking(store, ipAddress, now)

      // Check concurrent WebSocket limit
      if (tracking.activeWebSocketIds.length >= RATE_LIMITS.maxConcurrentWebSockets) {
        return {
          allowed: false,
          // No retry time for concurrent - user must close a connection
        } satisfies RateLimitResult
      }

      return { allowed: true } satisfies RateLimitResult
    })

  // V-007: Register a new WebSocket connection for an IP
  const registerWebSocket = (ipAddress: string, connectionId: string) =>
    Effect.gen(function* () {
      const now = Date.now()
      const store = yield* Ref.get(storeRef)
      const tracking = getOrCreateTracking(store, ipAddress, now)

      const updatedTracking: IpTracking = {
        ...tracking,
        activeWebSocketIds: [...tracking.activeWebSocketIds, connectionId],
      }

      // MutableHashMap.set is synchronous and mutates in place
      MutableHashMap.set(store.ipTracking, ipAddress, updatedTracking)
    })

  // V-007: Unregister a WebSocket connection for an IP
  const unregisterWebSocket = (ipAddress: string, connectionId: string) =>
    Effect.gen(function* () {
      const store = yield* Ref.get(storeRef)
      const trackingOption = MutableHashMap.get(store.ipTracking, ipAddress)

      if (Option.isNone(trackingOption)) {
        // IP not tracked, nothing to do
        return
      }

      const tracking = trackingOption.value
      const updatedWebSocketIds = tracking.activeWebSocketIds.filter(
        (id: string) => id !== connectionId,
      )

      const updatedTracking: IpTracking = {
        ...tracking,
        activeWebSocketIds: updatedWebSocketIds,
      }

      // MutableHashMap.set is synchronous and mutates in place
      MutableHashMap.set(store.ipTracking, ipAddress, updatedTracking)
    })

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
  }
})

// Live layer
export const RateLimitServiceLive = Layer.effect(RateLimitService, make)

// Export rate limit constants for use in other services
export const RATE_LIMITS_CONFIG = RATE_LIMITS
