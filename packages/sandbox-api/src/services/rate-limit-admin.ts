/**
 * RateLimitAdminService - Admin operations for rate limit management.
 *
 * Provides read/write access to rate limit state for monitoring and management.
 * Reads from the same in-memory store as RateLimitService.
 *
 * @example
 * ```ts
 * import { RateLimitAdminService } from "./services/rate-limit-admin"
 *
 * const program = Effect.gen(function* () {
 *   const admin = yield* RateLimitAdminService
 *   const allStatus = yield* admin.getAllStatus()
 *   return allStatus
 * })
 * ```
 */

import { Context, Data, Effect, Layer, Option } from "effect"
import { type IpTracking, RATE_LIMITS_CONFIG, RateLimitService } from "./rate-limit.js"

/**
 * Rate limit status for a single client (IP address).
 */
export interface RateLimitStatus {
  readonly clientId: string
  readonly sessionCount: number
  readonly sessionsPerHour: number
  readonly hourWindowStart: number
  readonly hourWindowEnd: number
  readonly activeSessions: readonly string[]
  readonly commandCount: number
  readonly commandsPerMinute: number
  readonly minuteWindowStart: number
  readonly minuteWindowEnd: number
  readonly activeWebSocketIds: readonly string[]
  readonly maxConcurrentSessions: number
  readonly maxConcurrentWebSockets: number
}

/**
 * Request body for adjusting rate limit parameters.
 */
export interface AdjustRateLimitRequest {
  readonly windowDuration?: number
  readonly maxRequests?: number
}

/**
 * Error types for rate limit admin operations.
 */
export class RateLimitAdminError extends Data.TaggedClass("RateLimitAdminError")<{
  readonly cause: "NotFound" | "InvalidRequest" | "InternalError"
  readonly message: string
  readonly originalError?: unknown
}> {}

/**
 * Service interface for rate limit admin operations.
 */
export interface RateLimitAdminServiceShape {
  /**
   * Get rate limit status for all tracked clients.
   *
   * @returns Array of rate limit statuses for all tracked IPs.
   */
  readonly getAllStatus: Effect.Effect<readonly RateLimitStatus[], never>

  /**
   * Get rate limit status for a specific client.
   *
   * @param clientId - The client IP address.
   * @returns Rate limit status for the client.
   * @throws RateLimitAdminError with cause "NotFound" if client not tracked.
   */
  readonly getStatus: (clientId: string) => Effect.Effect<RateLimitStatus, RateLimitAdminError>

  /**
   * Reset rate limit tracking for a specific client.
   *
   * Clears all counters and removes the client from tracking.
   *
   * @param clientId - The client IP address.
   * @returns void
   * @throws RateLimitAdminError with cause "NotFound" if client not tracked.
   */
  readonly resetLimit: (clientId: string) => Effect.Effect<void, RateLimitAdminError>

  /**
   * Adjust rate limit parameters for a specific client.
   *
   * Note: Since rate limits are global (configured at startup),
   * this operation resets the client's counters to the current time.
   *
   * @param clientId - The client IP address.
   * @param params - Adjustment parameters (currently only used for validation).
   * @returns Updated rate limit status after reset.
   * @throws RateLimitAdminError with cause "NotFound" if client not tracked.
   * @throws RateLimitAdminError with cause "InvalidRequest" if params are invalid.
   */
  readonly adjustLimit: (
    clientId: string,
    params: AdjustRateLimitRequest,
  ) => Effect.Effect<RateLimitStatus, RateLimitAdminError>
}

/**
 * Service tag for dependency injection.
 */
export class RateLimitAdminService extends Context.Tag("RateLimitAdminService")<
  RateLimitAdminService,
  RateLimitAdminServiceShape
>() {}

/**
 * Convert IpTracking to RateLimitStatus with computed values.
 */
function toRateLimitStatus(clientId: string, tracking: IpTracking): RateLimitStatus {
  const hourWindowEnd = tracking.hourWindowStart + 60 * 60 * 1000
  const minuteWindowEnd = tracking.minuteWindowStart + 60 * 1000

  return {
    clientId,
    sessionCount: tracking.sessionCount,
    sessionsPerHour: RATE_LIMITS_CONFIG.sessionsPerHour,
    hourWindowStart: tracking.hourWindowStart,
    hourWindowEnd,
    activeSessions: tracking.activeSessions,
    commandCount: tracking.commandCount,
    commandsPerMinute: RATE_LIMITS_CONFIG.commandsPerMinute,
    minuteWindowStart: tracking.minuteWindowStart,
    minuteWindowEnd,
    activeWebSocketIds: tracking.activeWebSocketIds,
    maxConcurrentSessions: RATE_LIMITS_CONFIG.maxConcurrentSessions,
    maxConcurrentWebSockets: RATE_LIMITS_CONFIG.maxConcurrentWebSockets,
  }
}

/**
 * Create the RateLimitAdminService implementation.
 *
 * This service accesses RateLimitService's internal state through the admin interface.
 */
const make = Effect.gen(function* () {
  const rateLimitService = yield* RateLimitService

  // Get all rate limit statuses
  const getAllStatus = Effect.gen(function* () {
    const trackingMap = yield* rateLimitService.admin.getAllTracking()

    // Convert Map to array of RateLimitStatus
    const statuses: RateLimitStatus[] = []
    for (const [clientId, tracking] of trackingMap.entries()) {
      statuses.push(toRateLimitStatus(clientId, tracking))
    }

    return statuses as readonly RateLimitStatus[]
  })

  // Get status for specific client
  const getStatus = (clientId: string) =>
    Effect.gen(function* () {
      const trackingOption = yield* rateLimitService.admin.getTracking(clientId)

      if (Option.isNone(trackingOption)) {
        return yield* Effect.fail(
          new RateLimitAdminError({
            cause: "NotFound",
            message: `Client ${clientId} not found in rate limit tracking`,
          }),
        )
      }

      return toRateLimitStatus(clientId, trackingOption.value)
    })

  // Reset rate limit for a client
  const resetLimit = (clientId: string) =>
    Effect.gen(function* () {
      // Check if client exists first
      const trackingOption = yield* rateLimitService.admin.getTracking(clientId)

      if (Option.isNone(trackingOption)) {
        return yield* Effect.fail(
          new RateLimitAdminError({
            cause: "NotFound",
            message: `Client ${clientId} not found in rate limit tracking`,
          }),
        )
      }

      // Remove the tracking entry
      yield* rateLimitService.admin.removeTracking(clientId)
    })

  // Adjust rate limit parameters
  const adjustLimit = (clientId: string, params: AdjustRateLimitRequest) =>
    Effect.gen(function* () {
      // Validate parameters
      if (
        params.windowDuration !== undefined &&
        (typeof params.windowDuration !== "number" || params.windowDuration <= 0)
      ) {
        return yield* Effect.fail(
          new RateLimitAdminError({
            cause: "InvalidRequest",
            message: "windowDuration must be a positive number",
          }),
        )
      }

      if (
        params.maxRequests !== undefined &&
        (typeof params.maxRequests !== "number" || params.maxRequests <= 0)
      ) {
        return yield* Effect.fail(
          new RateLimitAdminError({
            cause: "InvalidRequest",
            message: "maxRequests must be a positive number",
          }),
        )
      }

      // Check if client exists
      const trackingOption = yield* rateLimitService.admin.getTracking(clientId)

      if (Option.isNone(trackingOption)) {
        return yield* Effect.fail(
          new RateLimitAdminError({
            cause: "NotFound",
            message: `Client ${clientId} not found in rate limit tracking`,
          }),
        )
      }

      // Since rate limits are global (configured at startup),
      // we reset the client's counters to give them a fresh window
      yield* rateLimitService.admin.removeTracking(clientId)

      // Return empty status since the client was just removed
      // The next request from this client will start fresh
      return {
        clientId,
        sessionCount: 0,
        sessionsPerHour: RATE_LIMITS_CONFIG.sessionsPerHour,
        hourWindowStart: 0,
        hourWindowEnd: 0,
        activeSessions: [],
        commandCount: 0,
        commandsPerMinute: RATE_LIMITS_CONFIG.commandsPerMinute,
        minuteWindowStart: 0,
        minuteWindowEnd: 0,
        activeWebSocketIds: [],
        maxConcurrentSessions: RATE_LIMITS_CONFIG.maxConcurrentSessions,
        maxConcurrentWebSockets: RATE_LIMITS_CONFIG.maxConcurrentWebSockets,
      } satisfies RateLimitStatus
    })

  return {
    getAllStatus,
    getStatus,
    resetLimit,
    adjustLimit,
  }
})

/**
 * Live layer for RateLimitAdminService.
 */
export const RateLimitAdminServiceLive = Layer.effect(RateLimitAdminService, make)
