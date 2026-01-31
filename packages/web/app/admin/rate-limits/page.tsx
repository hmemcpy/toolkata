import { revalidatePath } from "next/cache"
import { getSandboxHttpUrl, ADMIN_API_KEY } from "../../../lib/sandbox-url"
import type { RateLimitInfo, AdjustRateLimitRequest } from "../../../components/admin/RateLimitTable"
import { RateLimitsClient } from "./RateLimitsClient"

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
 * - Terminal aesthetic styling
 */
export default async function RateLimitsPage() {
  // Fetch rate limits from admin API
  const rateLimits = await fetchRateLimits()

  // Server action to refresh rate limit data
  async function refreshRateLimits() {
    "use server"
    revalidatePath("/admin/rate-limits")
  }

  // Server action to reset rate limit
  async function resetRateLimit(clientId: string) {
    "use server"
    const apiUrl = getSandboxHttpUrl()
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    }

    if (ADMIN_API_KEY !== "") {
      headers["X-Admin-Key"] = ADMIN_API_KEY
    }

    const response = await fetch(`${apiUrl}/admin/rate-limits/${encodeURIComponent(clientId)}/reset`, {
      method: "POST",
      headers,
    })

    if (!response.ok) {
      console.error(`Failed to reset rate limit: ${response.status}`)
      throw new Error("Failed to reset rate limit")
    }

    revalidatePath("/admin/rate-limits")
  }

  // Server action to adjust rate limit
  async function adjustRateLimit(clientId: string, params: AdjustRateLimitRequest) {
    "use server"
    const apiUrl = getSandboxHttpUrl()
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    }

    if (ADMIN_API_KEY !== "") {
      headers["X-Admin-Key"] = ADMIN_API_KEY
    }

    const response = await fetch(`${apiUrl}/admin/rate-limits/${encodeURIComponent(clientId)}/adjust`, {
      method: "POST",
      headers,
      body: JSON.stringify(params),
    })

    if (!response.ok) {
      console.error(`Failed to adjust rate limit: ${response.status}`)
      throw new Error("Failed to adjust rate limit")
    }

    revalidatePath("/admin/rate-limits")
  }

  return (
    <RateLimitsClient
      rateLimits={rateLimits}
      refreshRateLimits={refreshRateLimits}
      resetRateLimit={resetRateLimit}
      adjustRateLimit={adjustRateLimit}
    />
  )
}

/**
 * Fetch rate limits from admin API.
 */
async function fetchRateLimits(): Promise<readonly RateLimitInfo[]> {
  try {
    const apiUrl = getSandboxHttpUrl()
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    }

    if (ADMIN_API_KEY !== "") {
      headers["X-Admin-Key"] = ADMIN_API_KEY
    }

    const response = await fetch(`${apiUrl}/admin/rate-limits`, {
      headers,
      // Don't cache - always show fresh data
      cache: "no-store",
    })

    if (!response.ok) {
      console.error(`Failed to fetch rate limits: ${response.status}`)
      return []
    }

    const data = (await response.json()) as { readonly rateLimits: readonly RateLimitInfo[] }
    return data.rateLimits
  } catch (error) {
    console.error("Error fetching rate limits:", error)
    return []
  }
}
