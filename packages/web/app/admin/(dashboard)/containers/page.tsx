import type { ContainerInfo } from "@/components/admin/ContainerGrid"
import { adminApiFetch } from "@/lib/admin-api"
import { ContainersClient } from "./ContainersClient"

export const dynamic = "force-dynamic"

/**
 * Containers fetch result.
 */
interface ContainersResult {
  readonly containers: readonly ContainerInfo[]
  readonly error: string | null
}

/**
 * Containers admin page.
 *
 * Displays all Docker containers managed by the sandbox API.
 * Fetches data server-side and renders the ContainerGrid component.
 *
 * Features:
 * - Server-side data fetching for fast initial load
 * - Filter controls: status dropdown, toolPair dropdown, olderThan checkbox
 * - Refresh button to revalidate and fetch fresh data
 * - Restart, stop, remove container actions
 * - View logs action
 * - Empty state when no containers exist
 * - Error state with retry button
 * - Terminal aesthetic styling
 */
export default async function ContainersPage() {
  // Fetch containers from admin API
  const result = await fetchContainers()

  // Server action to refresh container data
  async function refreshContainers() {
    "use server"
  }

  // Server action to restart a container
  async function restartContainer(containerId: string) {
    "use server"
    const response = await adminApiFetch(
      `/containers/${encodeURIComponent(containerId)}/restart`,
      { method: "POST" },
    )

    if (!response.ok) {
      console.error(`Failed to restart container: ${response.status}`)
      throw new Error("Failed to restart container")
    }
  }

  // Server action to stop a container
  async function stopContainer(containerId: string) {
    "use server"
    const response = await adminApiFetch(
      `/containers/${encodeURIComponent(containerId)}/stop`,
      { method: "POST" },
    )

    if (!response.ok) {
      console.error(`Failed to stop container: ${response.status}`)
      throw new Error("Failed to stop container")
    }
  }

  // Server action to remove a container
  async function removeContainer(containerId: string, force = false) {
    "use server"
    const url = force
      ? `/containers/${encodeURIComponent(containerId)}?force=true`
      : `/containers/${encodeURIComponent(containerId)}`

    const response = await adminApiFetch(url, { method: "DELETE" })

    if (!response.ok) {
      console.error(`Failed to remove container: ${response.status}`)
      throw new Error("Failed to remove container")
    }
  }

  // Server action to get container logs
  async function getContainerLogs(containerId: string, tail = 100) {
    "use server"
    const response = await adminApiFetch(
      `/containers/${encodeURIComponent(containerId)}/logs?tail=${tail}`,
    )

    if (!response.ok) {
      console.error(`Failed to get container logs: ${response.status}`)
      throw new Error("Failed to get container logs")
    }

    return await response.text()
  }

  return (
    <ContainersClient
      containers={result.containers}
      error={result.error}
      refreshContainers={refreshContainers}
      restartContainer={restartContainer}
      stopContainer={stopContainer}
      removeContainer={removeContainer}
      getContainerLogs={getContainerLogs}
    />
  )
}

/**
 * Fetch containers from admin API.
 *
 * Returns both the data and any error that occurred.
 */
async function fetchContainers(): Promise<ContainersResult> {
  try {
    const response = await adminApiFetch("/containers", {
      cache: "no-store",
    })

    if (!response.ok) {
      const statusText = response.statusText || "Unknown error"
      console.error(`Failed to fetch containers: ${response.status} ${statusText}`)
      return {
        containers: [],
        error: `Failed to fetch containers: ${response.status} ${statusText}`,
      }
    }

    const data = (await response.json()) as { readonly containers: readonly ContainerInfo[] }
    return { containers: data.containers, error: null }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error"
    console.error("Error fetching containers:", error)
    return {
      containers: [],
      error: `Failed to connect to admin API: ${message}`,
    }
  }
}
