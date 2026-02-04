import { adminApiFetch } from "@/lib/admin-api"
import { MetricsClient } from "./MetricsClient"
import type { RateLimitMetricsInfo, SandboxMetricsInfo, SystemMetricsInfo } from "./MetricsTypes"

export const dynamic = "force-dynamic"

/**
 * Metrics fetch result.
 */
interface MetricsResult {
  readonly system: SystemMetricsInfo | null
  readonly sandbox: SandboxMetricsInfo | null
  readonly rateLimits: RateLimitMetricsInfo | null
  readonly error: string | null
}

/**
 * Metrics admin page.
 *
 * Displays system, sandbox, and rate limit metrics.
 * Fetches data server-side and renders the MetricsClient component.
 *
 * Features:
 * - Server-side data fetching for fast initial load
 * - Auto-refresh every 30 seconds
 * - Last updated timestamp display
 * - Three sections: System, Sandbox, Rate Limits
 * - Error state with retry button
 * - Terminal aesthetic styling
 */
export default async function MetricsPage() {
  // Fetch metrics from admin API
  const result = await fetchMetrics()

  // Server action to refresh metrics data
  async function refreshMetrics() {
    "use server"
  }

  return (
    <MetricsClient
      systemMetrics={result.system}
      sandboxMetrics={result.sandbox}
      rateLimitMetrics={result.rateLimits}
      error={result.error}
      refreshMetrics={refreshMetrics}
    />
  )
}

/**
 * Fetch all metrics from admin API.
 *
 * Returns both the data and any error that occurred.
 */
async function fetchMetrics(): Promise<MetricsResult> {
  // Fetch all three metrics types in parallel
  try {
    const [systemResponse, sandboxResponse, rateLimitsResponse] = await Promise.all([
      adminApiFetch("/metrics/system", { cache: "no-store" }),
      adminApiFetch("/metrics/sandbox", { cache: "no-store" }),
      adminApiFetch("/metrics/rate-limits", { cache: "no-store" }),
    ])

    // Parse responses
    let system: SystemMetricsInfo | null = null
    let sandbox: SandboxMetricsInfo | null = null
    let rateLimits: RateLimitMetricsInfo | null = null
    const errors: string[] = []

    if (systemResponse.ok) {
      system = (await systemResponse.json()) as SystemMetricsInfo
    } else {
      errors.push(`System: ${systemResponse.status}`)
    }

    if (sandboxResponse.ok) {
      sandbox = (await sandboxResponse.json()) as SandboxMetricsInfo
    } else {
      errors.push(`Sandbox: ${sandboxResponse.status}`)
    }

    if (rateLimitsResponse.ok) {
      rateLimits = (await rateLimitsResponse.json()) as RateLimitMetricsInfo
    } else {
      errors.push(`Rate Limits: ${rateLimitsResponse.status}`)
    }

    // If all failed, return error
    if (errors.length === 3) {
      return {
        system: null,
        sandbox: null,
        rateLimits: null,
        error: `Failed to fetch metrics: ${errors.join(", ")}`,
      }
    }

    // Return partial success
    return {
      system,
      sandbox,
      rateLimits,
      error: errors.length > 0 ? `Partial errors: ${errors.join(", ")}` : null,
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error"
    console.error("Error fetching metrics:", error)
    return {
      system: null,
      sandbox: null,
      rateLimits: null,
      error: `Failed to connect to admin API: ${message}`,
    }
  }
}
