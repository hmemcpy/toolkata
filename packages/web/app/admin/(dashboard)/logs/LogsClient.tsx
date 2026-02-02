"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { getSandboxHttpUrl } from "@/lib/sandbox-url"
import type { LogEntry, LogsResponse } from "./LogsTypes"
import { LOG_LEVELS, LEVEL_CONFIG, type LogLevelName } from "./LogsTypes"

/**
 * LogsClient props.
 */
interface LogsClientProps {
  readonly initialLogs: LogsResponse | null
  readonly availableFiles: readonly string[]
  readonly error: string | null
  readonly adminApiKey: string
}

/**
 * Maximum entries to keep in memory.
 */
const MAX_ENTRIES = 500

/**
 * Auto-scroll threshold (if user scrolled up, don't auto-scroll).
 */
const AUTO_SCROLL_THRESHOLD = 50

/**
 * LogsClient component.
 *
 * Client-side component for viewing and streaming logs.
 * Features:
 * - Real-time log streaming via SSE
 * - Level filtering
 * - Text search with debounce
 * - Start/Stop streaming toggle
 * - Download logs
 * - Auto-scroll to bottom (can be disabled by scrolling up)
 */
export function LogsClient(props: LogsClientProps) {
  const { initialLogs, availableFiles, error: initialError, adminApiKey } = props

  // State
  const [entries, setEntries] = useState<LogEntry[]>(
    initialLogs ? [...initialLogs.entries] : [],
  )
  const [isStreaming, setIsStreaming] = useState(true)
  const [minLevel, setMinLevel] = useState<number>(LOG_LEVELS.info)
  const [searchQuery, setSearchQuery] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")
  const [error, setError] = useState<string | null>(initialError)
  const [autoScroll, setAutoScroll] = useState(true)
  const [sortDescending, setSortDescending] = useState(true) // newest first by default

  // Refs
  const eventSourceRef = useRef<EventSource | null>(null)
  const logContainerRef = useRef<HTMLDivElement>(null)
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isStreamingRef = useRef(true)
  const isInitialConnectionRef = useRef(true)

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery)
    }, 300)
    return () => clearTimeout(timer)
  }, [searchQuery])

  // Filter and sort entries based on level, search, and sort order
  const filteredEntries = useMemo(() => {
    const filtered = entries.filter((entry) => {
      // Level filter
      if (entry.level < minLevel) return false

      // Search filter
      if (debouncedSearch) {
        const searchLower = debouncedSearch.toLowerCase()
        const msgMatch = entry.msg.toLowerCase().includes(searchLower)
        const serviceMatch = entry.service?.toLowerCase().includes(searchLower)
        if (!msgMatch && !serviceMatch) return false
      }

      return true
    })

    // Sort by sequence number (reliable ordering even for identical timestamps)
    return [...filtered].sort((a, b) =>
      sortDescending ? b.seq - a.seq : a.seq - b.seq
    )
  }, [entries, minLevel, debouncedSearch, sortDescending])

  // Start SSE streaming
  const startStreaming = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close()
    }

    const apiUrl = getSandboxHttpUrl()
    const url = new URL(`${apiUrl}/admin/logs/stream`)
    url.searchParams.set("level", String(minLevel))
    // EventSource doesn't support custom headers, so we pass the key via query param
    if (adminApiKey !== "") {
      url.searchParams.set("key", adminApiKey)
    }

    const eventSource = new EventSource(url.toString())
    eventSourceRef.current = eventSource

    eventSource.onmessage = (event) => {
      try {
        const entry = JSON.parse(event.data) as LogEntry
        setEntries((prev) => {
          // Deduplicate by seq number
          if (prev.some((e) => e.seq === entry.seq)) {
            return prev
          }
          const newEntries = [entry, ...prev]
          // Keep only the last MAX_ENTRIES
          return newEntries.slice(0, MAX_ENTRIES)
        })
      } catch {
        // Ignore parse errors
      }
    }

    eventSource.onerror = () => {
      eventSource.close()
      eventSourceRef.current = null
      setIsStreaming(false)
      isStreamingRef.current = false
      // Only show error if this wasn't the initial auto-connect attempt
      if (!isInitialConnectionRef.current) {
        setError("Connection lost. Click 'Start Stream' to reconnect.")
      }
      isInitialConnectionRef.current = false
    }

    eventSource.onopen = () => {
      setError(null)
      isInitialConnectionRef.current = false
    }

    setIsStreaming(true)
    isStreamingRef.current = true
  }, [minLevel, adminApiKey])

  // Stop SSE streaming
  const stopStreaming = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close()
      eventSourceRef.current = null
    }
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
      reconnectTimeoutRef.current = null
    }
    setIsStreaming(false)
    isStreamingRef.current = false
  }, [])

  // Toggle streaming
  const toggleStreaming = useCallback(() => {
    if (isStreaming) {
      stopStreaming()
    } else {
      startStreaming()
    }
  }, [isStreaming, startStreaming, stopStreaming])

  // Auto-start streaming on mount
  // biome-ignore lint/correctness/useExhaustiveDependencies: only run on mount
  useEffect(() => {
    startStreaming()
  }, [])

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close()
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
      }
    }
  }, [])

  // Restart streaming when level changes (startStreaming has minLevel in its deps)
  useEffect(() => {
    if (isStreamingRef.current) {
      startStreaming()
    }
  }, [startStreaming])

  // Auto-scroll to top when new entries arrive (logs are shown newest-first)
  // biome-ignore lint/correctness/useExhaustiveDependencies: entriesLength is needed to trigger scroll on new entries
  useEffect(() => {
    if (autoScroll && logContainerRef.current) {
      logContainerRef.current.scrollTop = 0
    }
  }, [filteredEntries.length, autoScroll])

  // Handle scroll to detect if user scrolled
  const handleScroll = useCallback(() => {
    if (logContainerRef.current) {
      const { scrollTop } = logContainerRef.current
      // If user scrolled down, disable auto-scroll
      setAutoScroll(scrollTop < AUTO_SCROLL_THRESHOLD)
    }
  }, [])

  // Download logs
  const downloadLogs = useCallback(async () => {
    const apiUrl = getSandboxHttpUrl()
    const headers: Record<string, string> = {}
    if (adminApiKey !== "") {
      headers["X-Admin-Key"] = adminApiKey
    }

    try {
      const response = await fetch(`${apiUrl}/admin/logs/download`, {
        headers,
      })
      if (!response.ok) {
        throw new Error(`Failed to download: ${response.status}`)
      }

      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `logs-${Date.now()}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Download failed")
    }
  }, [adminApiKey])

  // Clear logs
  const clearLogs = useCallback(() => {
    setEntries([])
  }, [])

  // Format timestamp
  const formatTime = (timestamp: number): string => {
    return new Date(timestamp).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    })
  }

  // Get level name from numeric level
  const getLevelName = (level: number): LogLevelName => {
    if (level <= 10) return "trace"
    if (level <= 20) return "debug"
    if (level <= 30) return "info"
    if (level <= 40) return "warn"
    if (level <= 50) return "error"
    return "fatal"
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold font-mono text-[var(--color-text)]">
          Logs
        </h1>
        <div className="flex items-center gap-3">
          {/* Entry count */}
          <span className="text-sm font-mono text-[var(--color-text-dim)]">
            {filteredEntries.length} / {entries.length} entries
          </span>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-4 p-4 border border-[var(--color-border)] rounded bg-[var(--color-surface)]">
        {/* Level filter */}
        <div className="flex items-center gap-2">
          <label
            htmlFor="level-filter"
            className="text-sm font-mono text-[var(--color-text-muted)]"
          >
            Level:
          </label>
          <select
            id="level-filter"
            value={minLevel}
            onChange={(e) => setMinLevel(Number(e.target.value))}
            className="px-3 py-1.5 text-sm font-mono border border-[var(--color-border)] rounded bg-[var(--color-bg)] text-[var(--color-text)] focus:outline-none focus:border-[var(--color-accent)]"
          >
            <option value={LOG_LEVELS.trace}>Trace</option>
            <option value={LOG_LEVELS.debug}>Debug</option>
            <option value={LOG_LEVELS.info}>Info</option>
            <option value={LOG_LEVELS.warn}>Warn</option>
            <option value={LOG_LEVELS.error}>Error</option>
            <option value={LOG_LEVELS.fatal}>Fatal</option>
          </select>
        </div>

        {/* Search */}
        <div className="flex items-center gap-2 flex-1 min-w-[200px] max-w-md">
          <label
            htmlFor="search"
            className="text-sm font-mono text-[var(--color-text-muted)]"
          >
            Search:
          </label>
          <input
            id="search"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filter messages..."
            className="flex-1 px-3 py-1.5 text-sm font-mono border border-[var(--color-border)] rounded bg-[var(--color-bg)] text-[var(--color-text)] placeholder:text-[var(--color-text-dim)] focus:outline-none focus:border-[var(--color-accent)]"
          />
        </div>

        {/* Sort order toggle */}
        <button
          type="button"
          onClick={() => setSortDescending(!sortDescending)}
          className="px-4 py-1.5 text-sm font-mono border border-[var(--color-border)] rounded text-[var(--color-text)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] transition-colors focus-visible:outline-none focus-visible:ring-[var(--focus-ring)]"
          title={sortDescending ? "Showing newest first" : "Showing oldest first"}
        >
          [{sortDescending ? "↓ Newest" : "↑ Oldest"}]
        </button>

        {/* Streaming toggle */}
        <button
          type="button"
          onClick={toggleStreaming}
          className={`px-4 py-1.5 text-sm font-mono border rounded transition-colors focus-visible:outline-none focus-visible:ring-[var(--focus-ring)] ${
            isStreaming
              ? "border-[var(--color-accent)] text-[var(--color-accent)] bg-[var(--color-accent-bg)]"
              : "border-[var(--color-border)] text-[var(--color-text)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
          }`}
        >
          [{isStreaming ? "◉ Live" : "○ Start Stream"}]
        </button>

        {/* Download */}
        <button
          type="button"
          onClick={downloadLogs}
          className="px-4 py-1.5 text-sm font-mono border border-[var(--color-border)] rounded text-[var(--color-text)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] transition-colors focus-visible:outline-none focus-visible:ring-[var(--focus-ring)]"
        >
          [↓ Download]
        </button>

        {/* Clear */}
        <button
          type="button"
          onClick={clearLogs}
          className="px-4 py-1.5 text-sm font-mono border border-[var(--color-border)] rounded text-[var(--color-text-muted)] hover:border-[var(--color-error)] hover:text-[var(--color-error)] transition-colors focus-visible:outline-none focus-visible:ring-[var(--focus-ring)]"
        >
          [× Clear]
        </button>
      </div>

      {/* Error display */}
      {error && (
        <div className="p-4 border border-[var(--color-error)] rounded bg-[color-mix(in_srgb,var(--color-error)_10%,transparent)]">
          <p className="text-sm font-mono text-[var(--color-error)]">{error}</p>
        </div>
      )}

      {/* Log entries */}
      <div
        ref={logContainerRef}
        onScroll={handleScroll}
        className="h-[600px] overflow-y-auto border border-[var(--color-border)] rounded bg-[#0a0a0a] font-mono text-sm"
      >
        {filteredEntries.length === 0 ? (
          <div className="flex items-center justify-center h-full text-[var(--color-text-dim)]">
            {entries.length === 0 ? "No logs available" : "No matching entries"}
          </div>
        ) : (
          <div className="p-2 space-y-0.5">
            {filteredEntries.map((entry, index) => {
              const levelName = getLevelName(entry.level)
              const config = LEVEL_CONFIG[levelName]

              return (
                <div
                  key={`${entry.time}-${index}`}
                  className="flex gap-2 py-0.5 hover:bg-[#1a1a1a] rounded px-1"
                >
                  {/* Timestamp */}
                  <span className="text-[#6b7280] flex-shrink-0 w-[72px]">
                    {formatTime(entry.time)}
                  </span>

                  {/* Level */}
                  <span className={`flex-shrink-0 w-[48px] ${config.color}`}>
                    {config.label}
                  </span>

                  {/* Service (if present) */}
                  {entry.service && (
                    <span className="text-[#9ca3af] flex-shrink-0 w-[120px] truncate">
                      [{entry.service}]
                    </span>
                  )}

                  {/* Message */}
                  <span className="text-[#e5e7eb] flex-1 break-all">
                    {entry.msg}
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Auto-scroll indicator */}
      {!autoScroll && (
        <div className="flex items-center justify-center">
          <button
            type="button"
            onClick={() => {
              setAutoScroll(true)
              if (logContainerRef.current) {
                logContainerRef.current.scrollTop = 0
              }
            }}
            className="px-3 py-1 text-xs font-mono text-[var(--color-text-dim)] border border-[var(--color-border)] rounded hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] transition-colors"
          >
            [↑ Scroll to top & resume auto-scroll]
          </button>
        </div>
      )}

      {/* Available files info */}
      {availableFiles.length > 0 && (
        <div className="text-xs font-mono text-[var(--color-text-dim)]">
          Log files available: {availableFiles.slice(0, 3).join(", ")}
          {availableFiles.length > 3 && ` (+${availableFiles.length - 3} more)`}
        </div>
      )}
    </div>
  )
}
