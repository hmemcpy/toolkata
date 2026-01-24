/**
 * useSandboxStatus - Hook to fetch and poll sandbox availability status.
 *
 * Checks the circuit breaker status to determine if the sandbox is available.
 * Polls periodically to stay updated.
 */

"use client"

import { useEffect, useState } from "react"

export interface SandboxStatus {
  readonly isOpen: boolean // true = sandbox unavailable
  readonly reason: string | null
  readonly metrics: {
    readonly containers: number
    readonly maxContainers: number
    readonly memoryPercent: number
    readonly maxMemoryPercent: number
  }
}

interface UseSandboxStatusResult {
  readonly status: SandboxStatus | null
  readonly isUnavailable: boolean
  readonly reason: string | null
  readonly isLoading: boolean
  readonly error: string | null
}

// Default poll interval (30 seconds)
const POLL_INTERVAL = 30000

export function useSandboxStatus(): UseSandboxStatusResult {
  const [status, setStatus] = useState<SandboxStatus | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const apiUrl = process.env["NEXT_PUBLIC_SANDBOX_API_URL"] ?? "http://localhost:3001"
    // Convert WebSocket URLs to HTTP, keeping the port
    const httpUrl = apiUrl.replace(/^ws:\/\//, "http://").replace(/^wss:\/\//, "https://")
    const statusUrl = `${httpUrl}/api/v1/status`

    const fetchStatus = async () => {
      try {
        const response = await fetch(statusUrl, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        })

        if (!response.ok) {
          throw new Error(`Status check failed: ${response.status}`)
        }

        const data = (await response.json()) as SandboxStatus
        setStatus(data)
        setError(null)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to check sandbox status")
        // Don't clear status on error - keep last known state
      } finally {
        setIsLoading(false)
      }
    }

    // Initial fetch
    fetchStatus()

    // Poll periodically
    const interval = setInterval(fetchStatus, POLL_INTERVAL)

    return () => clearInterval(interval)
  }, [])

  return {
    status,
    isUnavailable: status?.isOpen ?? false,
    reason: status?.reason ?? null,
    isLoading,
    error,
  }
}
