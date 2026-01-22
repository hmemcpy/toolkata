import { Context, Data, Effect, Layer, MutableHashMap, Option, Ref } from "effect"
import { ContainerError, ContainerService } from "./container.js"

// Session states
export type SessionState = "IDLE" | "STARTING" | "RUNNING" | "DESTROYING"

// Session info
export interface Session {
  readonly id: string
  readonly containerId: string
  readonly toolPair: string
  readonly state: SessionState
  readonly createdAt: Date
  readonly expiresAt: Date
  readonly lastActivityAt: Date
}

// Timeout configuration (from PLAN.md)
const TIMEOUTS = {
  idle: 5 * 60 * 1000, // 5 minutes
  maxLifetime: 30 * 60 * 1000, // 30 minutes
} as const

// Error types
export class SessionError extends Data.TaggedClass("SessionError")<{
  readonly cause:
    | "NotFound"
    | "AlreadyExists"
    | "Expired"
    | "CreateFailed"
    | "DestroyFailed"
    | "InvalidState"
  readonly message: string
  readonly originalError?: unknown
}> {}

// Service interface
export interface SessionServiceShape {
  readonly create: (toolPair: string) => Effect.Effect<Session, SessionError>
  readonly get: (sessionId: string) => Effect.Effect<Session, SessionError>
  readonly destroy: (sessionId: string) => Effect.Effect<void, SessionError>
  readonly updateActivity: (sessionId: string) => Effect.Effect<void, SessionError>
  readonly checkExpired: (sessionId: string) => Effect.Effect<boolean, SessionError>
  readonly startCleanupScheduler: Effect.Effect<void, never>
  readonly getStats: Effect.Effect<SessionStats, never>
}

// Service tag
export class SessionService extends Context.Tag("SessionService")<
  SessionService,
  SessionServiceShape
>() {}

// Session statistics
export interface SessionStats {
  readonly total: number
  readonly running: number
  readonly starting: number
  readonly idle: number
  readonly destroying: number
}

// Session store type (using Ref for thread-safe mutable state)
interface SessionStore {
  readonly sessions: MutableHashMap.MutableHashMap<string, Session>
}

// Helper: Generate unique session ID
const generateSessionId = (): string => {
  const timestamp = Date.now().toString(36)
  const random = Math.random().toString(36).substring(2, 10)
  return `sess_${timestamp}_${random}`
}

// Helper: Check if session is expired
const isSessionExpired = (session: Session): boolean => {
  const now = Date.now()
  const idleTime = now - session.lastActivityAt.getTime()
  const lifetime = now - session.createdAt.getTime()

  return idleTime >= TIMEOUTS.idle || lifetime >= TIMEOUTS.maxLifetime
}

// Helper: Format duration for display (for future use in responses)
const _formatDuration = (ms: number): string => {
  const seconds = Math.floor(ms / 1000)
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`
}

// Service implementation
const make = Effect.gen(function* () {
  const containerService = yield* ContainerService

  // Create session store
  const storeRef = yield* Ref.make<SessionStore>({
    sessions: MutableHashMap.empty<string, Session>(),
  })

  // Cleanup scheduler reference (to cancel if needed)
  const schedulerRef = yield* Ref.make<ReturnType<typeof setInterval> | null>(null)

  // Create a new session
  const create = (toolPair: string) =>
    Effect.gen(function* () {
      return yield* Effect.all([containerService.create(toolPair), Ref.get(storeRef)]).pipe(
        Effect.flatMap(([container, store]) =>
          Effect.gen(function* () {
            const sessionId = generateSessionId()
            const now = new Date()

            const session: Session = {
              id: sessionId,
              containerId: container.id,
              toolPair: container.toolPair,
              state: "RUNNING",
              createdAt: now,
              expiresAt: new Date(now.getTime() + TIMEOUTS.maxLifetime),
              lastActivityAt: now,
            }

            // Check for ID collisions (extremely unlikely)
            const existingOption = MutableHashMap.get(store.sessions, sessionId)
            if (Option.isSome(existingOption)) {
              yield* containerService.destroy(container.id)
              return yield* Effect.fail(
                new SessionError({
                  cause: "AlreadyExists",
                  message: `Session ID collision: ${sessionId}`,
                }),
              )
            }

            // Store session (MutableHashMap.set mutates in place)
            MutableHashMap.set(store.sessions, sessionId, session)

            return session
          }),
        ),
      )
    }).pipe(
      Effect.catchTag("ContainerError", (error) =>
        Effect.fail(
          new SessionError({
            cause: "CreateFailed",
            message: `Failed to create container for session: ${error.message}`,
            originalError: error,
          }),
        ),
      ),
    )

  // Get session by ID
  const get = (sessionId: string): Effect.Effect<Session, SessionError> =>
    Ref.get(storeRef).pipe(
      Effect.flatMap((store) => {
        const sessionOption = MutableHashMap.get(store.sessions, sessionId)

        if (Option.isNone(sessionOption)) {
          return Effect.fail(
            new SessionError({
              cause: "NotFound",
              message: `Session not found: ${sessionId}`,
            }),
          )
        }

        const session = sessionOption.value

        // Check if expired
        if (isSessionExpired(session)) {
          // Auto-destroy expired sessions
          return destroy(sessionId).pipe(
            Effect.flatMap(() =>
              Effect.fail(
                new SessionError({
                  cause: "Expired",
                  message: `Session expired: ${sessionId}`,
                }),
              ),
            ),
          )
        }

        return Effect.succeed(session)
      }),
    )

  // Destroy a session
  const destroy = (sessionId: string): Effect.Effect<void, SessionError> =>
    Effect.gen(function* () {
      const store = yield* Ref.get(storeRef)
      const sessionOption = MutableHashMap.get(store.sessions, sessionId)

      if (Option.isNone(sessionOption)) {
        // Session doesn't exist, already destroyed
        return
      }

      const session = sessionOption.value

      // Update state to DESTROYING
      const updatedSession: Session = {
        ...session,
        state: "DESTROYING",
      }
      MutableHashMap.set(store.sessions, sessionId, updatedSession)

      // Destroy the container
      const destroyResult = yield* Effect.either(containerService.destroy(session.containerId))

      // Remove from store regardless of destroy result
      const currentStore = yield* Ref.get(storeRef)
      MutableHashMap.remove(currentStore.sessions, sessionId)

      // Handle container destroy errors
      if (destroyResult._tag === "Left") {
        return yield* Effect.fail(
          new SessionError({
            cause: "DestroyFailed",
            message: `Failed to destroy container for session ${sessionId}: ${destroyResult.left.message}`,
            originalError: destroyResult.left,
          }),
        )
      }
    })

  // Update last activity time (keep session alive)
  const updateActivity = (sessionId: string): Effect.Effect<void, SessionError> =>
    Effect.gen(function* () {
      const store = yield* Ref.get(storeRef)
      const sessionOption = MutableHashMap.get(store.sessions, sessionId)

      if (Option.isNone(sessionOption)) {
        return yield* Effect.fail(
          new SessionError({
            cause: "NotFound",
            message: `Session not found: ${sessionId}`,
          }),
        )
      }

      const now = new Date()
      const updatedSession: Session = {
        ...sessionOption.value,
        lastActivityAt: now,
      }

      MutableHashMap.set(store.sessions, sessionId, updatedSession)
    })

  // Check if session is expired without destroying
  const checkExpired = (sessionId: string): Effect.Effect<boolean, SessionError> =>
    Ref.get(storeRef).pipe(
      Effect.flatMap((store) => {
        const sessionOption = MutableHashMap.get(store.sessions, sessionId)

        if (Option.isNone(sessionOption)) {
          return Effect.fail(
            new SessionError({
              cause: "NotFound",
              message: `Session not found: ${sessionId}`,
            }),
          )
        }

        return Effect.succeed(isSessionExpired(sessionOption.value))
      }),
    )

  // Background cleanup scheduler - runs every 30 seconds
  const startCleanupScheduler: Effect.Effect<void, never> = Effect.sync(() => {
    const interval = setInterval(() => {
      Effect.runPromise(
        Effect.gen(function* () {
          const store = yield* Ref.get(storeRef)
          const sessions = Array.from(MutableHashMap.values(store.sessions))

          // Find expired sessions
          const expiredSessions = sessions.filter((s: Session) => isSessionExpired(s))

          if (expiredSessions.length > 0) {
            console.log(`[SessionService] Cleaning up ${expiredSessions.length} expired session(s)`)

            // Destroy each expired session
            for (const session of expiredSessions) {
              const destroyResult = yield* Effect.either(destroy(session.id))
              if (destroyResult._tag === "Left") {
                console.error(
                  `[SessionService] Failed to cleanup session ${session.id}:`,
                  destroyResult.left.message,
                )
              }
            }
          }
        }).pipe(
          Effect.catchAll((error) =>
            Effect.sync(() => {
              console.error("[SessionService] Cleanup error:", error)
            }),
          ),
        ),
      )
    }, 30_000) // Every 30 seconds

    // Store the interval so it can be cancelled if needed
    Effect.runSync(Ref.set(schedulerRef, interval))
  })

  // Get session statistics
  const getStats: Effect.Effect<SessionStats, never> = Ref.get(storeRef).pipe(
    Effect.map((store) => {
      const sessions = Array.from(MutableHashMap.values(store.sessions))

      const stats: SessionStats = {
        total: sessions.length,
        running: sessions.filter((s: Session) => s.state === "RUNNING").length,
        starting: sessions.filter((s: Session) => s.state === "STARTING").length,
        idle: sessions.filter((s: Session) => s.state === "IDLE").length,
        destroying: sessions.filter((s: Session) => s.state === "DESTROYING").length,
      }

      return stats
    }),
  )

  return {
    create: (toolPair: string) => create(toolPair),
    get: (sessionId: string) => get(sessionId),
    destroy: (sessionId: string) => destroy(sessionId),
    updateActivity: (sessionId: string) => updateActivity(sessionId),
    checkExpired: (sessionId: string) => checkExpired(sessionId),
    startCleanupScheduler,
    getStats,
  } satisfies SessionServiceShape
})

// Live layer
export const SessionServiceLive = Layer.effect(SessionService, make)

// Export timeout constants for use in other services
export const SESSION_TIMEOUTS = TIMEOUTS
