import type { AdjustRateLimitRequest, RateLimitInfo } from "@/components/admin/RateLimitTable"
import { adminApiFetch } from "@/lib/admin-api"
import { revalidatePath } from "next/cache"
import { RateLimitsClient } from "./RateLimitsClient"

export const dynamic = "force-dynamic"

/**
 * Rate limits fetch result.
 */
interface RateLimitsResult {
  readonly rateLimits: readonly RateLimitInfo[]
  readonly error: string | null
}

/**
 * Rate limits admin page.
 *
 * Displays all current rate limit statuses for clients using the sandbox API.
 * Fetches data server-side and renders the RateLimitTable component.
 *
 * Features:
 * - Server-side data fetching for fast initial load
 * - Refresh button to revalidate and fetch fresh data
 * - Reset and adjust actions for rate limits
 * - Empty state when no rate limits exist
 * - Error state with retry button
 * - Terminal aesthetic styling
 */
export default async function RateLimitsPage() {
  // Fetch rate limits from admin API
  const result = await fetchRateLimits()

  // Server action to refresh rate limit data
  async function refreshRateLimits() {
    "use server"
  }

  // Server action to reset rate limit
  async function resetRateLimit(clientId: string) {
    "use server"
    const response = await adminApiFetch(
      `/rate-limits/${encodeURIComponent(clientId)}/reset`,
      { method: "POST" },
    )

    if (!response.ok) {
      console.error(`Failed to reset rate limit: ${response.status}`)
      throw new Error("Failed to reset rate limit")
    }

    revalidatePath("/admin/rate-limits")
  }

  // Server action to adjust rate limit
  async function adjustRateLimit(clientId: string, params: AdjustRateLimitRequest) {
    "use server"
    const response = await adminApiFetch(
      `/rate-limits/${encodeURIComponent(clientId)}/adjust`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(params),
      },
    )

    if (!response.ok) {
      console.error(`Failed to adjust rate limit: ${response.status}`)
      throw new Error("Failed to adjust rate limit")
    }
  }

  return (
    <RateLimitsClient
      rateLimits={result.rateLimits}
      error={result.error}
      refreshRateLimits={refreshRateLimits}
      resetRateLimit={resetRateLimit}
      adjustRateLimit={adjustRateLimit}
    />
  )
}

/**
 * Fetch rate limits from admin API.
 *
 * Returns both the data and any error that occurred.
 */
async function fetchRateLimits(): Promise<RateLimitsResult> {
  try {
    const response = await adminApiFetch("/rate-limits", {
      cache: "no-store",
    })

    if (!response.ok) {
      const statusText = response.statusText || "Unknown error"
      console.error(`Failed to fetch rate limits: ${response.status} ${statusText}`)
      return {
        rateLimits: [],
        error: `Failed to fetch rate limits: ${response.status} ${statusText}`,
      }
    }

    const data = (await response.json()) as { readonly rateLimits: readonly RateLimitInfo[] }
    return { rateLimits: data.rateLimits, error: null }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error"
    console.error("Error fetching rate limits:", error)
    return {
      rateLimits: [],
      error: `Failed to connect to admin API: ${message}`,
    }
  }
}
