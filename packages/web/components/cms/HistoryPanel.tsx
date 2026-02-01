"use client"

import { useState, useCallback, useMemo } from "react"
import dynamic from "next/dynamic"
import type { GitHubCommit } from "@/services/cms-client"

// Lazy load diff viewer to reduce initial bundle size
const ReactDiffViewer = dynamic(() => import("react-diff-viewer-continued"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-32 text-sm font-mono text-[var(--color-text-dim)]">
      Loading diff viewer...
    </div>
  ),
})

/**
 * File change in a commit.
 */
export interface FileChange {
  readonly filename: string
  readonly status: "added" | "removed" | "modified" | "renamed"
  readonly additions: number
  readonly deletions: number
  readonly patch?: string
  readonly previousFilename?: string
}

/**
 * Git diff for a commit.
 */
export interface GitDiff {
  readonly files: readonly FileChange[]
  readonly additions: number
  readonly deletions: number
}

/**
 * HistoryPanel component props.
 */
interface HistoryPanelProps {
  /** List of commits to display */
  readonly commits: readonly GitHubCommit[]
  /** Currently selected commit SHA */
  readonly selectedCommitSha?: string
  /** Diff for the selected commit */
  readonly diff?: GitDiff
  /** Callback when a commit is selected */
  readonly onCommitSelect: (sha: string) => void
  /** Callback when revert is requested */
  readonly onRevert?: (sha: string) => void
  /** Whether loading commits */
  readonly isLoading?: boolean
  /** Whether loading diff for selected commit */
  readonly isDiffLoading?: boolean
  /** Error message to display */
  readonly error?: string
  /** Callback when error is dismissed */
  readonly onErrorDismiss?: () => void
}

/**
 * Format relative time from timestamp.
 */
function formatRelativeTime(timestamp: number): string {
  const now = Date.now()
  const diff = now - timestamp

  const seconds = Math.floor(diff / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)
  const weeks = Math.floor(days / 7)
  const months = Math.floor(days / 30)

  if (months > 0) {
    return `${months}mo ago`
  }
  if (weeks > 0) {
    return `${weeks}w ago`
  }
  if (days > 0) {
    return `${days}d ago`
  }
  if (hours > 0) {
    return `${hours}h ago`
  }
  if (minutes > 0) {
    return `${minutes}m ago`
  }
  return "just now"
}

/**
 * Get icon for file status.
 */
function getStatusIcon(status: FileChange["status"]): string {
  switch (status) {
    case "added":
      return "+"
    case "removed":
      return "-"
    case "modified":
      return "~"
    case "renamed":
      return ">"
    default:
      return "?"
  }
}

/**
 * Get color class for file status.
 */
function getStatusColorClass(status: FileChange["status"]): string {
  switch (status) {
    case "added":
      return "text-[var(--color-accent)]"
    case "removed":
      return "text-[var(--color-error)]"
    case "modified":
      return "text-[var(--color-warning)]"
    case "renamed":
      return "text-[var(--color-text-muted)]"
    default:
      return "text-[var(--color-text-muted)]"
  }
}

/**
 * Truncate commit message to first line.
 */
function truncateMessage(message: string, maxLength = 50): string {
  const firstLine = message.split("\n")[0] ?? message
  if (firstLine.length <= maxLength) {
    return firstLine
  }
  return `${firstLine.slice(0, maxLength)}...`
}

/**
 * HistoryPanel component.
 *
 * Shows commit history with diff viewer for the CMS.
 *
 * Features:
 * - Commit list with author, date, message
 * - Diff viewer for selected commit
 * - File-level change list
 * - Copy commit hash button
 * - Revert button (optional)
 *
 * Follows the terminal aesthetic design system.
 *
 * @example
 * ```tsx
 * <HistoryPanel
 *   commits={commits}
 *   selectedCommitSha={selectedSha}
 *   diff={commitDiff}
 *   onCommitSelect={(sha) => loadDiff(sha)}
 *   onRevert={(sha) => revertToCommit(sha)}
 * />
 * ```
 */
export function HistoryPanel(props: HistoryPanelProps) {
  const {
    commits,
    selectedCommitSha,
    diff,
    onCommitSelect,
    onRevert,
    isLoading,
    isDiffLoading,
    error,
    onErrorDismiss,
  } = props

  // State for expanded diff file
  const [expandedFile, setExpandedFile] = useState<string | null>(null)

  // State for copy feedback
  const [copiedSha, setCopiedSha] = useState<string | null>(null)

  // Get selected commit
  const selectedCommit = useMemo(
    () => commits.find((c) => c.sha === selectedCommitSha),
    [commits, selectedCommitSha],
  )

  // Handle copy SHA
  const handleCopySha = useCallback(async (sha: string, e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      await navigator.clipboard.writeText(sha)
      setCopiedSha(sha)
      setTimeout(() => setCopiedSha(null), 2000)
    } catch {
      // Fallback for older browsers
      const textArea = document.createElement("textarea")
      textArea.value = sha
      document.body.appendChild(textArea)
      textArea.select()
      document.execCommand("copy")
      document.body.removeChild(textArea)
      setCopiedSha(sha)
      setTimeout(() => setCopiedSha(null), 2000)
    }
  }, [])

  // Handle commit select
  const handleCommitSelect = useCallback(
    (sha: string) => {
      onCommitSelect(sha)
      setExpandedFile(null)
    },
    [onCommitSelect],
  )

  // Handle file expand toggle
  const handleFileToggle = useCallback((filename: string) => {
    setExpandedFile((prev) => (prev === filename ? null : filename))
  }, [])

  // Handle revert
  const handleRevert = useCallback(
    (sha: string, e: React.MouseEvent) => {
      e.stopPropagation()
      if (onRevert) {
        onRevert(sha)
      }
    },
    [onRevert],
  )

  return (
    <div className="flex flex-col h-full bg-[var(--color-surface)]">
      {/* Error message */}
      {error && (
        <div className="flex items-center justify-between px-3 py-2 text-sm font-mono text-[var(--color-error)] bg-[rgba(255,65,54,0.1)] border-b border-[var(--color-error)]/30">
          <span>{error}</span>
          {onErrorDismiss && (
            <button
              type="button"
              onClick={onErrorDismiss}
              className="p-1 hover:text-[var(--color-text)] transition-colors"
              aria-label="Dismiss error"
            >
              ✕
            </button>
          )}
        </div>
      )}

      <div className="flex flex-1 overflow-hidden">
        {/* Commit list */}
        <div className="w-80 flex-shrink-0 border-r border-[var(--color-border)] flex flex-col">
          {/* Header */}
          <div className="px-3 py-2 border-b border-[var(--color-border)] bg-[var(--color-bg)]">
            <h3 className="text-sm font-mono font-semibold text-[var(--color-text)]">
              Commit History
            </h3>
            <p className="text-xs font-mono text-[var(--color-text-dim)]">
              {commits.length} commit{commits.length !== 1 ? "s" : ""}
            </p>
          </div>

          {/* Commit list */}
          <div className="flex-1 overflow-y-auto">
            {isLoading ? (
              <CommitListSkeleton />
            ) : commits.length === 0 ? (
              <div className="flex items-center justify-center h-32 p-4">
                <p className="text-sm font-mono text-[var(--color-text-dim)]">
                  No commits found
                </p>
              </div>
            ) : (
              <div className="divide-y divide-[var(--color-border)]">
                {commits.map((commit) => {
                  const revertProps = onRevert ? { onRevert: handleRevert } : {}
                  return (
                    <CommitItem
                      key={commit.sha}
                      commit={commit}
                      isSelected={commit.sha === selectedCommitSha}
                      copiedSha={copiedSha}
                      onSelect={handleCommitSelect}
                      onCopySha={handleCopySha}
                      {...revertProps}
                    />
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* Diff viewer */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {selectedCommit ? (
            <>
              {/* Commit details header */}
              <div className="px-4 py-3 border-b border-[var(--color-border)] bg-[var(--color-bg)]">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h4 className="text-sm font-mono font-semibold text-[var(--color-text)] truncate">
                      {truncateMessage(selectedCommit.message, 80)}
                    </h4>
                    <p className="text-xs font-mono text-[var(--color-text-dim)] mt-1">
                      {selectedCommit.author.name} &lt;{selectedCommit.author.email}&gt;
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-xs font-mono text-[var(--color-text-dim)]">
                      {formatRelativeTime(selectedCommit.author.date)}
                    </span>
                  </div>
                </div>

                {/* Diff stats */}
                {diff && (
                  <div className="flex items-center gap-3 mt-2 text-xs font-mono">
                    <span className="text-[var(--color-text-muted)]">
                      {diff.files.length} file{diff.files.length !== 1 ? "s" : ""} changed
                    </span>
                    {diff.additions > 0 && (
                      <span className="text-[var(--color-accent)]">
                        +{diff.additions}
                      </span>
                    )}
                    {diff.deletions > 0 && (
                      <span className="text-[var(--color-error)]">
                        -{diff.deletions}
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Diff content */}
              <div className="flex-1 overflow-y-auto">
                {isDiffLoading ? (
                  <DiffSkeleton />
                ) : diff ? (
                  <div className="divide-y divide-[var(--color-border)]">
                    {diff.files.map((file) => (
                      <FileChangeItem
                        key={file.filename}
                        file={file}
                        isExpanded={expandedFile === file.filename}
                        onToggle={handleFileToggle}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-32 p-4">
                    <p className="text-sm font-mono text-[var(--color-text-dim)]">
                      Select a commit to view changes
                    </p>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-full p-4">
              <div className="text-center">
                <span className="text-4xl block mb-3">📜</span>
                <p className="text-sm font-mono text-[var(--color-text-muted)]">
                  Select a commit to view details
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/**
 * Individual commit item in the list.
 */
function CommitItem(props: {
  readonly commit: GitHubCommit
  readonly isSelected: boolean
  readonly copiedSha: string | null
  readonly onSelect: (sha: string) => void
  readonly onCopySha: (sha: string, e: React.MouseEvent) => void
  readonly onRevert?: (sha: string, e: React.MouseEvent) => void
}) {
  const { commit, isSelected, copiedSha, onSelect, onCopySha, onRevert } = props

  return (
    <button
      type="button"
      onClick={() => onSelect(commit.sha)}
      className={`w-full text-left px-3 py-2.5 transition-colors ${
        isSelected
          ? "bg-[var(--color-surface-hover)] border-l-2 border-[var(--color-accent)]"
          : "hover:bg-[var(--color-surface-hover)]"
      }`}
      aria-selected={isSelected}
    >
      {/* Message */}
      <p className="text-sm font-mono text-[var(--color-text)] truncate">
        {truncateMessage(commit.message)}
      </p>

      {/* Meta */}
      <div className="flex items-center gap-2 mt-1.5">
        {/* SHA */}
        <button
          type="button"
          onClick={(e) => onCopySha(commit.sha, e)}
          className="px-1.5 py-0.5 text-xs font-mono text-[var(--color-text-dim)] bg-[var(--color-bg)] rounded hover:text-[var(--color-accent)] hover:bg-[var(--color-surface-hover)] transition-colors"
          title="Copy commit SHA"
        >
          {copiedSha === commit.sha ? "✓" : commit.shortSha}
        </button>

        {/* Author */}
        <span className="text-xs font-mono text-[var(--color-text-dim)] truncate">
          {commit.author.name}
        </span>

        {/* Time */}
        <span className="text-xs font-mono text-[var(--color-text-dim)] flex-shrink-0 ml-auto">
          {formatRelativeTime(commit.author.date)}
        </span>
      </div>

      {/* Revert button */}
      {onRevert && isSelected && (
        <div className="mt-2">
          <button
            type="button"
            onClick={(e) => onRevert(commit.sha, e)}
            className="px-2 py-1 text-xs font-mono text-[var(--color-warning)] border border-[var(--color-warning)]/50 rounded hover:bg-[var(--color-warning)]/10 transition-colors"
          >
            Revert to this commit
          </button>
        </div>
      )}
    </button>
  )
}

/**
 * File change item with expandable diff.
 */
function FileChangeItem(props: {
  readonly file: FileChange
  readonly isExpanded: boolean
  readonly onToggle: (filename: string) => void
}) {
  const { file, isExpanded, onToggle } = props

  // Parse patch into old/new content for diff viewer
  const diffContent = useMemo(() => {
    if (!file.patch) return null

    // Simple patch parsing - extract lines
    const lines = file.patch.split("\n")
    const oldLines: string[] = []
    const newLines: string[] = []

    for (const line of lines) {
      if (line.startsWith("@@")) {
        // Hunk header - skip
      } else if (line.startsWith("-")) {
        oldLines.push(line.slice(1))
      } else if (line.startsWith("+")) {
        newLines.push(line.slice(1))
      } else if (line.startsWith(" ") || line === "") {
        // Context line
        const content = line.startsWith(" ") ? line.slice(1) : line
        oldLines.push(content)
        newLines.push(content)
      }
    }

    return {
      oldValue: oldLines.join("\n"),
      newValue: newLines.join("\n"),
    }
  }, [file.patch])

  return (
    <div className="bg-[var(--color-surface)]">
      {/* File header */}
      <button
        type="button"
        onClick={() => onToggle(file.filename)}
        className="w-full flex items-center gap-2 px-4 py-2.5 hover:bg-[var(--color-surface-hover)] transition-colors"
      >
        {/* Expand icon */}
        <span
          className={`text-xs text-[var(--color-text-dim)] transition-transform ${
            isExpanded ? "rotate-90" : ""
          }`}
        >
          ▶
        </span>

        {/* Status icon */}
        <span className={`text-sm font-mono font-bold ${getStatusColorClass(file.status)}`}>
          {getStatusIcon(file.status)}
        </span>

        {/* Filename */}
        <span className="text-sm font-mono text-[var(--color-text)] truncate">
          {file.previousFilename
            ? `${file.previousFilename} → ${file.filename}`
            : file.filename}
        </span>

        {/* Change stats */}
        <span className="ml-auto flex items-center gap-1 text-xs font-mono flex-shrink-0">
          {file.additions > 0 && (
            <span className="text-[var(--color-accent)]">+{file.additions}</span>
          )}
          {file.deletions > 0 && (
            <span className="text-[var(--color-error)]">-{file.deletions}</span>
          )}
        </span>
      </button>

      {/* Diff content */}
      {isExpanded && (
        <div className="border-t border-[var(--color-border)]">
          {file.patch && diffContent ? (
            <div className="text-xs overflow-x-auto">
              <ReactDiffViewer
                oldValue={diffContent.oldValue}
                newValue={diffContent.newValue}
                splitView={false}
                useDarkTheme
                hideLineNumbers={false}
                styles={{
                  variables: {
                    dark: {
                      diffViewerBackground: "var(--color-bg)",
                      diffViewerTitleBackground: "var(--color-surface)",
                      diffViewerTitleColor: "var(--color-text)",
                      diffViewerTitleBorderColor: "var(--color-border)",
                      addedBackground: "rgba(34, 197, 94, 0.1)",
                      addedColor: "var(--color-accent)",
                      removedBackground: "rgba(255, 65, 54, 0.1)",
                      removedColor: "var(--color-error)",
                      wordAddedBackground: "rgba(34, 197, 94, 0.2)",
                      wordRemovedBackground: "rgba(255, 65, 54, 0.2)",
                      addedGutterBackground: "rgba(34, 197, 94, 0.15)",
                      removedGutterBackground: "rgba(255, 65, 54, 0.15)",
                      gutterBackground: "var(--color-surface)",
                      gutterBackgroundDark: "var(--color-bg)",
                      highlightBackground: "var(--color-surface-hover)",
                      highlightGutterBackground: "var(--color-surface)",
                      codeFoldGutterBackground: "var(--color-bg)",
                      codeFoldBackground: "var(--color-surface)",
                      emptyLineBackground: "var(--color-bg)",
                      gutterColor: "var(--color-text-dim)",
                      addedGutterColor: "var(--color-accent)",
                      removedGutterColor: "var(--color-error)",
                      codeFoldContentColor: "var(--color-text-muted)",
                      diffViewerColor: "var(--color-text)",
                    },
                  },
                  contentText: {
                    fontFamily: "var(--font-mono), monospace",
                  },
                  lineNumber: {
                    fontFamily: "var(--font-mono), monospace",
                  },
                }}
              />
            </div>
          ) : (
            <div className="px-4 py-3 text-xs font-mono text-[var(--color-text-dim)] bg-[var(--color-bg)]">
              {file.status === "added"
                ? "New file"
                : file.status === "removed"
                  ? "File deleted"
                  : "Binary file or no diff available"}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

/**
 * Skeleton loader for commit list.
 */
function CommitListSkeleton() {
  // Static skeleton items - keys are stable since array never changes
  const skeletonItems = ["commit-skeleton-0", "commit-skeleton-1", "commit-skeleton-2", "commit-skeleton-3", "commit-skeleton-4"]
  return (
    <div className="divide-y divide-[var(--color-border)]">
      {skeletonItems.map((key) => (
        <div key={key} className="px-3 py-2.5 animate-pulse">
          <div className="h-4 bg-[var(--color-surface-hover)] rounded w-3/4 mb-2" />
          <div className="flex items-center gap-2">
            <div className="h-4 w-12 bg-[var(--color-surface-hover)] rounded" />
            <div className="h-3 w-20 bg-[var(--color-surface-hover)] rounded" />
            <div className="h-3 w-8 bg-[var(--color-surface-hover)] rounded ml-auto" />
          </div>
        </div>
      ))}
    </div>
  )
}

/**
 * Skeleton loader for diff content.
 */
function DiffSkeleton() {
  // Static skeleton items - keys are stable since array never changes
  const skeletonItems = ["diff-skeleton-0", "diff-skeleton-1", "diff-skeleton-2"]
  return (
    <div className="p-4 animate-pulse">
      <div className="space-y-3">
        {skeletonItems.map((key) => (
          <div key={key}>
            <div className="flex items-center gap-2 mb-2">
              <div className="h-4 w-4 bg-[var(--color-surface-hover)] rounded" />
              <div className="h-4 w-48 bg-[var(--color-surface-hover)] rounded" />
              <div className="h-4 w-12 bg-[var(--color-surface-hover)] rounded ml-auto" />
            </div>
            <div className="h-24 bg-[var(--color-surface-hover)] rounded" />
          </div>
        ))}
      </div>
    </div>
  )
}

/**
 * HistoryPanel skeleton loader.
 *
 * Use while fetching commit history.
 */
export function HistoryPanelSkeleton() {
  return (
    <div className="flex h-full bg-[var(--color-surface)]">
      {/* Commit list skeleton */}
      <div className="w-80 flex-shrink-0 border-r border-[var(--color-border)]">
        <div className="px-3 py-2 border-b border-[var(--color-border)] bg-[var(--color-bg)]">
          <div className="h-4 w-24 bg-[var(--color-surface-hover)] rounded animate-pulse" />
          <div className="h-3 w-16 bg-[var(--color-surface-hover)] rounded animate-pulse mt-1" />
        </div>
        <CommitListSkeleton />
      </div>

      {/* Diff viewer skeleton */}
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center animate-pulse">
          <div className="h-12 w-12 bg-[var(--color-surface-hover)] rounded-full mx-auto mb-3" />
          <div className="h-4 w-40 bg-[var(--color-surface-hover)] rounded mx-auto" />
        </div>
      </div>
    </div>
  )
}
