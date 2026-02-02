/**
 * Rate limit tier configuration.
 *
 * Defines rate limits per user tier for sandbox sessions.
 * Authenticated users get higher limits as an incentive to create accounts.
 */

/**
 * Tier names for rate limiting.
 */
export type TierName = "anonymous" | "logged-in" | "premium" | "admin"

/**
 * Rate limit configuration for a single tier.
 */
export interface TierLimits {
  /** Maximum sessions that can be created per hour */
  readonly sessionsPerHour: number
  /** Maximum concurrent active sessions */
  readonly maxConcurrentSessions: number
  /** Maximum commands per minute */
  readonly commandsPerMinute: number
  /** Maximum concurrent WebSocket connections */
  readonly maxConcurrentWebSockets: number
}

/**
 * Rate limit configuration per tier.
 *
 * | Tier | Sessions/hr | Concurrent | Cmds/min | WebSockets |
 * |------|-------------|------------|----------|------------|
 * | Anonymous | 30 | 2 | 60 | 2 |
 * | Logged-in | 100 | 4 | 120 | 5 |
 * | Premium | 500 | 10 | 300 | 15 |
 * | Admin | Infinity | Infinity | Infinity | Infinity |
 */
export const TIER_LIMITS: Record<TierName, TierLimits> = {
  anonymous: {
    sessionsPerHour: 30,
    maxConcurrentSessions: 2,
    commandsPerMinute: 60,
    maxConcurrentWebSockets: 2,
  },
  "logged-in": {
    sessionsPerHour: 100,
    maxConcurrentSessions: 4,
    commandsPerMinute: 120,
    maxConcurrentWebSockets: 5,
  },
  premium: {
    sessionsPerHour: 500,
    maxConcurrentSessions: 10,
    commandsPerMinute: 300,
    maxConcurrentWebSockets: 15,
  },
  admin: {
    sessionsPerHour: Number.POSITIVE_INFINITY,
    maxConcurrentSessions: Number.POSITIVE_INFINITY,
    commandsPerMinute: Number.POSITIVE_INFINITY,
    maxConcurrentWebSockets: Number.POSITIVE_INFINITY,
  },
} as const

/**
 * Check if a tier has unlimited access (admin tier).
 */
export const isUnlimitedTier = (tier: TierName): boolean => tier === "admin"

/**
 * Get the display name for a tier.
 */
export const getTierDisplayName = (tier: TierName): string => {
  switch (tier) {
    case "anonymous":
      return "Anonymous"
    case "logged-in":
      return "Logged In"
    case "premium":
      return "Premium"
    case "admin":
      return "Admin"
    default:
      return "Unknown"
  }
}
