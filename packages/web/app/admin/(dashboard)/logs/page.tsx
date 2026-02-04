import { adminApiFetch } from "@/lib/admin-api"
import { LogsClient } from "./LogsClient"
import type { LogsResponse, LogFilesResponse } from "./LogsTypes"

export const dynamic = "force-dynamic"

/**
 * Fetch result with error handling.
 */
interface FetchResult {
  readonly logs: LogsResponse | null
  readonly files: readonly string[]
  readonly error: string | null
}

/**
 * Logs admin page.
 *
 * Displays application logs with filtering and real-time streaming capabilities.
 * Features:
 * - Server-side initial data fetch
 * - Level filtering (trace, debug, info, warn, error, fatal)
 * - Text search
 * - Real-time log streaming via SSE
 * - Log file download
 * - Terminal aesthetic styling
 */
export default async function LogsPage() {
  const result = await fetchLogs()

  return (
    <LogsClient
      initialLogs={result.logs}
      availableFiles={result.files}
      error={result.error}
    />
  )
}

/**
 * Fetch initial logs and file list from admin API.
 */
async function fetchLogs(): Promise<FetchResult> {
  try {
    const [logsResponse, filesResponse] = await Promise.all([
      adminApiFetch("/logs?limit=100", { cache: "no-store" }),
      adminApiFetch("/logs/files", { cache: "no-store" }),
    ])

    let logs: LogsResponse | null = null
    let files: readonly string[] = []

    if (logsResponse.ok) {
      logs = (await logsResponse.json()) as LogsResponse
    }

    if (filesResponse.ok) {
      const filesData = (await filesResponse.json()) as LogFilesResponse
      files = filesData.files
    }

    if (!logsResponse.ok) {
      return {
        logs: null,
        files,
        error: `Failed to fetch logs: ${logsResponse.status}`,
      }
    }

    return {
      logs,
      files,
      error: null,
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error"
    console.error("Error fetching logs:", error)
    return {
      logs: null,
      files: [],
      error: `Failed to connect to admin API: ${message}`,
    }
  }
}
