/**
 * JWT Authentication Service for tiered rate limiting.
 *
 * Verifies NextAuth JWT tokens and extracts user tier information.
 * Uses the same AUTH_SECRET as the web frontend for signature verification.
 */

import { Context, Data, Effect, Layer } from "effect"
import * as jose from "jose"
import type { TierName } from "../config/tiers.js"

/**
 * JWT verification error.
 */
export class JwtAuthError extends Data.TaggedClass("JwtAuthError")<{
  readonly cause: "InvalidToken" | "ExpiredToken" | "MissingSecret" | "VerificationFailed"
  readonly message: string
}> {}

/**
 * Result of JWT verification.
 */
export interface JwtVerifyResult {
  /** User tier for rate limiting */
  readonly tier: TierName
  /** User ID for tracking (email or unique identifier) */
  readonly userId: string
  /** User email (if available) */
  readonly email: string | null
  /** Whether user has admin privileges */
  readonly isAdmin: boolean
}

/**
 * JWT Auth Service interface.
 */
export interface JwtAuthServiceShape {
  /**
   * Verify a JWT token and extract user information.
   *
   * @param token - The raw JWT token string
   * @returns User tier, ID, and email on success
   */
  readonly verify: (token: string) => Effect.Effect<JwtVerifyResult, JwtAuthError>

  /**
   * Get the tier for a request, falling back to anonymous if no valid token.
   *
   * @param token - Optional JWT token (from Authorization header or query param)
   * @returns The user's tier (never fails - falls back to anonymous)
   */
  readonly getTierFromToken: (token: string | null) => Effect.Effect<JwtVerifyResult, never>
}

/**
 * JWT Auth Service tag for dependency injection.
 */
export class JwtAuthService extends Context.Tag("JwtAuthService")<
  JwtAuthService,
  JwtAuthServiceShape
>() {}

/**
 * Anonymous user result (used when no token or invalid token).
 */
const ANONYMOUS_RESULT: JwtVerifyResult = {
  tier: "anonymous",
  userId: "anonymous",
  email: null,
  isAdmin: false,
}

/**
 * Create the JWT Auth Service implementation.
 */
const make = Effect.gen(function* () {
  // Get AUTH_SECRET from environment
  const authSecret = process.env["AUTH_SECRET"] ?? ""

  /**
   * Verify a JWT token.
   */
  const verify = (token: string): Effect.Effect<JwtVerifyResult, JwtAuthError> =>
    Effect.gen(function* () {
      if (authSecret === "") {
        return yield* Effect.fail(
          new JwtAuthError({
            cause: "MissingSecret",
            message: "AUTH_SECRET environment variable is not set",
          }),
        )
      }

      if (!token || token.trim() === "") {
        return yield* Effect.fail(
          new JwtAuthError({
            cause: "InvalidToken",
            message: "Token is empty",
          }),
        )
      }

      // NextAuth uses a derived key from AUTH_SECRET
      // The derivation uses HKDF with the secret as input
      const encoder = new TextEncoder()
      const secretKey = yield* Effect.promise(() =>
        jose.hkdf(
          "sha256",
          encoder.encode(authSecret),
          new Uint8Array(0),
          encoder.encode("Auth.js Generated Encryption Key"),
          32,
        ),
      )

      // Decrypt and verify the JWT
      const result = yield* Effect.tryPromise({
        try: async () => {
          // NextAuth v5 uses JWE (encrypted JWT) by default
          const { payload } = await jose.jwtDecrypt(token, secretKey, {
            clockTolerance: 60, // Allow 60 seconds clock skew
          })

          // Extract user information from NextAuth JWT payload
          const email = typeof payload["email"] === "string" ? payload["email"] : null
          const isAdmin = payload["isAdmin"] === true

          // Determine tier based on JWT claims
          let tier: TierName = "logged-in"
          if (isAdmin) {
            tier = "admin"
          } else if (payload["isPremium"] === true) {
            tier = "premium"
          }

          // Use email as userId, or sub if email not available
          const userId =
            email ?? (typeof payload["sub"] === "string" ? payload["sub"] : "unknown-user")

          return {
            tier,
            userId,
            email,
            isAdmin,
          } satisfies JwtVerifyResult
        },
        catch: (error) => {
          // Handle specific JWT errors
          if (error instanceof jose.errors.JWTExpired) {
            return new JwtAuthError({
              cause: "ExpiredToken",
              message: "Token has expired",
            })
          }

          return new JwtAuthError({
            cause: "VerificationFailed",
            message: error instanceof Error ? error.message : "Token verification failed",
          })
        },
      })

      return result
    })

  /**
   * Get tier from token with graceful fallback to anonymous.
   */
  const getTierFromToken = (token: string | null): Effect.Effect<JwtVerifyResult, never> => {
    if (!token) {
      return Effect.succeed(ANONYMOUS_RESULT)
    }

    return verify(token).pipe(
      Effect.catchAll((error) => {
        // Log verification failures for debugging (not in production-sensitive way)
        if (process.env["NODE_ENV"] === "development") {
          console.log(`[JwtAuth] Token verification failed: ${error.cause} - ${error.message}`)
        }
        return Effect.succeed(ANONYMOUS_RESULT)
      }),
    )
  }

  return {
    verify,
    getTierFromToken,
  } satisfies JwtAuthServiceShape
})

/**
 * Live layer for JWT Auth Service.
 */
export const JwtAuthServiceLive = Layer.effect(JwtAuthService, make)
