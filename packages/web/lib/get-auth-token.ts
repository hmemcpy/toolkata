"use server"

/**
 * Server action to get the raw JWT token for the current user.
 *
 * This token can be passed to the sandbox API for tiered rate limiting.
 * The sandbox API uses the same AUTH_SECRET to verify the token.
 *
 * @returns The raw JWT token string, or null if not authenticated
 */

import { getToken } from "next-auth/jwt"
import { cookies } from "next/headers"

/**
 * Get the raw JWT token for the current user.
 *
 * This is a server action that retrieves the NextAuth JWT token.
 * The token can be passed to external services (like the sandbox API)
 * that share the same AUTH_SECRET for verification.
 *
 * @returns The raw JWT token string, or null if not authenticated
 */
export async function getAuthToken(): Promise<string | null> {
  try {
    // Get cookies for the request
    const cookieStore = await cookies()

    // Build a minimal request object with the cookies
    // Next-auth's getToken needs access to cookies
    const cookieHeader = cookieStore
      .getAll()
      .map((c) => `${c.name}=${c.value}`)
      .join("; ")

    // Use getToken with raw: true to get the JWT string directly
    const token = await getToken({
      req: {
        headers: {
          cookie: cookieHeader,
        },
      } as unknown as Parameters<typeof getToken>[0]["req"],
      raw: true,
    })

    return token ?? null
  } catch (error) {
    // Log error in development only
    if (process.env.NODE_ENV === "development") {
      console.error("[getAuthToken] Failed to get token:", error)
    }
    return null
  }
}
