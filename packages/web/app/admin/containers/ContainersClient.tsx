"use client"

import { useRouter } from "next/navigation"
import { useTransition } from "react"
import { useState } from "react"
import type { ContainerInfo } from "../../../components/admin/ContainerGrid"
import { ContainerGrid } from "../../../components/admin/ContainerGrid"

/**
 * ContainersClient props.
 */
interface ContainersClientProps {
  readonly containers: readonly ContainerInfo[]
  readonly error: string | null
  readonly refreshContainers: () => Promise<void>
  readonly restartContainer: (containerId: string) => Promise<void>
  readonly stopContainer: (containerId: string) => Promise<void>
  readonly removeContainer: (containerId: string, force?: boolean) => Promise<void>
  readonly getContainerLogs: (containerId: string, tail?: number) => Promise<string>
}

/**
 * Client component for the containers admin page.
 *
 * Handles interactivity including:
 * - Loading states during server actions
 * - Error display with retry
 * - Container actions (restart, stop, remove, logs)
 * - Refresh functionality
 */
export function ContainersClient(props: ContainersClientProps) {
  const { containers, error, refreshContainers, restartContainer, stopContainer, removeContainer, getContainerLogs } = props
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [isActionPending, setIsActionPending] = useTransition()
  const [showLogsModal, setShowLogsModal] = useState(false)
  const [logsContent, setLogsContent] = useState("")
  const [logsError, setLogsError] = useState<string | null>(null)
  const [isLogsPending, setIsLogsPending] = useState(false)
  const [selectedContainerId, setSelectedContainerId] = useState("")
  const [selectedContainerName, setSelectedContainerName] = useState("")

  // Handle refresh
  function handleRefresh() {
    startTransition(async () => {
      await refreshContainers()
      router.refresh()
    })
  }

  // Handle restart
  function handleRestart(containerId: string) {
    setIsActionPending(async () => {
      try {
        await restartContainer(containerId)
        router.refresh()
      } catch (error) {
        console.error("Failed to restart container:", error)
      }
    })
  }

  // Handle stop
  function handleStop(containerId: string) {
    setIsActionPending(async () => {
      try {
        await stopContainer(containerId)
        router.refresh()
      } catch (error) {
        console.error("Failed to stop container:", error)
      }
    })
  }

  // Handle remove
  function handleRemove(containerId: string, force = false) {
    setIsActionPending(async () => {
      try {
        await removeContainer(containerId, force)
        router.refresh()
      } catch (error) {
        console.error("Failed to remove container:", error)
      }
    })
  }

  // Handle view logs
  function handleViewLogs(containerId: string, containerName: string) {
    setSelectedContainerId(containerId)
    setSelectedContainerName(containerName)
    setShowLogsModal(true)
    setLogsError(null)
    setIsLogsPending(true)

    getContainerLogs(containerId, 200)
      .then((logs) => {
        setLogsContent(logs)
        setIsLogsPending(false)
      })
      .catch((error) => {
        console.error("Failed to get container logs:", error)
        setLogsError(error instanceof Error ? error.message : "Failed to get logs")
        setIsLogsPending(false)
      })
  }

  // Close logs modal
  function handleCloseLogsModal() {
    setShowLogsModal(false)
    setLogsContent("")
    setLogsError(null)
    setSelectedContainerId("")
    setSelectedContainerName("")
  }

  // Error state
  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold font-mono text-[var(--color-text)]">
              Containers
            </h1>
            <p className="text-sm text-[var(--color-text-muted)] mt-1">
              Manage Docker containers used by the sandbox API
            </p>
          </div>
          <button
            type="button"
            onClick={handleRefresh}
            disabled={isPending}
            className="px-4 py-2 text-sm font-mono border border-[var(--color-border)] rounded text-[var(--color-text)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] transition-colors focus-visible:outline-none focus-visible:ring-[var(--focus-ring)] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            [{isPending ? "Refreshing..." : "Refresh"}]
          </button>
        </div>

        <div className="border border-[var(--color-error)] rounded bg-[var(--color-bg)] p-6">
          <h2 className="text-lg font-semibold font-mono text-[var(--color-error)] mb-2">
            Error Loading Containers
          </h2>
          <p className="text-sm text-[var(--color-text-muted)] mb-4">{error}</p>
          <button
            type="button"
            onClick={handleRefresh}
            disabled={isPending}
            className="px-4 py-2 text-sm font-mono border border-[var(--color-border)] rounded text-[var(--color-text)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] transition-colors focus-visible:outline-none focus-visible:ring-[var(--focus-ring)] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            [Retry]
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold font-mono text-[var(--color-text)]">
            Containers
          </h1>
          <p className="text-sm text-[var(--color-text-muted)] mt-1">
            Manage Docker containers used by the sandbox API
          </p>
        </div>
        <button
          type="button"
          onClick={handleRefresh}
          disabled={isPending}
          className="px-4 py-2 text-sm font-mono border border-[var(--color-border)] rounded text-[var(--color-text)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] transition-colors focus-visible:outline-none focus-visible:ring-[var(--focus-ring)] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          [{isPending ? "Refreshing..." : "Refresh"}]
        </button>
      </div>

      {/* Container Grid */}
      <ContainerGrid
        containers={containers}
        onRestart={handleRestart}
        onStop={handleStop}
        onRemove={handleRemove}
        onViewLogs={(id) => {
          const container = containers.find((c) => c.id === id)
          handleViewLogs(id, container?.name ?? id)
        }}
        isActionPending={isActionPending}
      />

      {/* Logs Modal */}
      {showLogsModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
          onClick={handleCloseLogsModal}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              handleCloseLogsModal()
            }
          }}
          role="presentation"
          style={{ cursor: "pointer" }}
        >
          <div
            className="w-full max-w-4xl h-[600px] bg-[var(--color-surface)] border border-[var(--color-border)] rounded shadow-lg flex flex-col"
            role="dialog"
            aria-modal="true"
            aria-labelledby="logs-modal-title"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                handleCloseLogsModal()
              }
            }}
            style={{ cursor: "default" }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--color-border)]">
              <h3 id="logs-modal-title" className="text-lg font-semibold font-mono text-[var(--color-text)]">
                Logs: {selectedContainerName}
              </h3>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const container = containers.find((c) => c.id === selectedContainerId)
                    if (container) {
                      handleViewLogs(selectedContainerId, container.name)
                    }
                  }}
                  disabled={isLogsPending}
                  className="px-3 py-1 text-sm font-mono border border-[var(--color-border)] rounded text-[var(--color-text)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] transition-colors focus-visible:outline-none focus-visible:ring-[var(--focus-ring)] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  [{isLogsPending ? "Loading..." : "Refresh"}]
                </button>
                <button
                  type="button"
                  onClick={handleCloseLogsModal}
                  className="px-3 py-1 text-sm font-mono border border-[var(--color-border)] rounded text-[var(--color-text)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] transition-colors focus-visible:outline-none focus-visible:ring-[var(--focus-ring)]"
                >
                  [×]
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-auto p-4 bg-[var(--color-bg)]">
              {isLogsPending ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-sm font-mono text-[var(--color-text-muted)]">
                    Loading logs...
                  </div>
                </div>
              ) : logsError ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <p className="text-sm font-mono text-[var(--color-error)] mb-2">
                      Error loading logs
                    </p>
                    <p className="text-xs font-mono text-[var(--color-text-muted)]">
                      {logsError}
                    </p>
                  </div>
                </div>
              ) : logsContent.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-sm font-mono text-[var(--color-text-muted)]">
                    No logs available
                  </div>
                </div>
              ) : (
                <pre className="text-xs font-mono text-[var(--color-text)] whitespace-pre-wrap break-words">
                  {logsContent}
                </pre>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-3 border-t border-[var(--color-border)] bg-[var(--color-surface)]">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono text-[var(--color-text-dim)]">
                  {logsContent.length} bytes
                </span>
                <button
                  type="button"
                  onClick={handleCloseLogsModal}
                  className="px-4 py-1 text-sm font-mono border border-[var(--color-border)] rounded text-[var(--color-text)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] transition-colors focus-visible:outline-none focus-visible:ring-[var(--focus-ring)]"
                >
                  [Close]
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
