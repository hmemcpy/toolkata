/**
 * CommandSuggestions - Clickable command suggestions for terminal interaction.
 *
 * Displays suggested commands as clickable code blocks that can be inserted
 * into the interactive terminal (Phase 8). For now, provides copy functionality.
 *
 * Features:
 * - Clickable code blocks with hover state
 * - Copy to clipboard (functional)
 * - Terminal insertion callback (for Phase 8 integration)
 * - Touch-friendly targets (≥44px height)
 * - Terminal aesthetic styling
 *
 * @example
 * ```tsx
 * <CommandSuggestions
 *   commands={[
 *     "jj status",
 *     "jj describe -m 'My commit'",
 *     "jj new"
 *   ]}
 *   onCommandClick={(command) => console.log('Insert:', command)}
 * />
 * ```
 */

"use client"

import { useEffect, useRef, useState } from "react"

interface CommandSuggestionsProps {
  /**
   * Suggested commands to display.
   */
  readonly commands: readonly string[]

  /**
   * Optional callback when a command is clicked.
   * In Phase 8, this will insert into the terminal.
   * For now, commands are copied to clipboard.
   */
  readonly onCommandClick?: (command: string) => void

  /**
   * Optional label for the section.
   * @default "Suggested commands"
   */
  readonly label?: string

  /**
   * Whether to show copy feedback (checkmark animation).
   * @default true
   */
  readonly showCopyFeedback?: boolean
}

/**
 * Copy button states for user feedback.
 */
type CopyState = "idle" | "copied" | "error"

/**
 * Individual command suggestion button.
 */
interface CommandButtonProps {
  readonly command: string
  readonly onClick: () => void
  readonly state: CopyState
}

function CommandButton({ command, onClick, state }: CommandButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex w-full items-center justify-between rounded border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 text-left transition-all duration-[var(--transition-fast)] hover:border-[var(--color-border-focus)] hover:bg-[var(--color-surface-hover)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] active:scale-[0.99]"
      style={{ minHeight: "44px" }}
      aria-label={`Copy command: ${command}`}
    >
      {/* Command text */}
      <code className="flex-1 overflow-hidden text-ellipsis whitespace-nowrap text-sm text-[var(--color-text)] group-hover:text-[var(--color-text)]">
        {command}
      </code>

      {/* Status indicator */}
      <span className="ml-3 flex-shrink-0" aria-hidden="true">
        {state === "copied" ? (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-4 w-4 text-[var(--color-accent)]"
          >
            <title>Copied</title>
            <polyline points="20 6 9 17 4 12" />
          </svg>
        ) : state === "error" ? (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-4 w-4 text-[var(--color-error)]"
          >
            <title>Error</title>
            <circle cx="12" cy="12" r="10" />
            <line x1="15" y1="9" x2="9" y2="15" />
            <line x1="9" y1="9" x2="15" y2="15" />
          </svg>
        ) : (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-4 w-4 text-[var(--color-text-dim)] transition-colors group-hover:text-[var(--color-text-muted)]"
          >
            <title>Copy</title>
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
          </svg>
        )}
      </span>
    </button>
  )
}

/**
 * CommandSuggestions component displaying clickable command blocks.
 */
export function CommandSuggestions({
  commands,
  onCommandClick,
  label = "Suggested commands",
  showCopyFeedback = true,
}: CommandSuggestionsProps) {
  // Defensive: ensure commands is always an array
  const safeCommands = Array.isArray(commands) ? commands : []

  // Track copy state per command index
  const [copyStates, setCopyStates] = useState<Readonly<CopyState[]>>(
    new Array(safeCommands.length).fill("idle"),
  )
  const timeoutsRef = useRef<ReadonlyMap<number, NodeJS.Timeout>>(new Map())

  /**
   * Handle command click - copy to clipboard and call optional callback.
   */
  const handleCommandClick = async (command: string, index: number) => {
    // Copy to clipboard
    if (showCopyFeedback) {
      try {
        await navigator.clipboard.writeText(command)

        // Update state to show copied
        setCopyStates((prev) => {
          const next = [...prev]
          next[index] = "copied"
          return next
        })

        // Clear existing timeout for this index
        const existingTimeout = timeoutsRef.current.get(index)
        if (existingTimeout) {
          clearTimeout(existingTimeout)
        }

        // Reset to idle after 2 seconds
        const timeout = setTimeout(() => {
          setCopyStates((prev) => {
            const next = [...prev]
            next[index] = "idle"
            return next
          })
        }, 2000)

        timeoutsRef.current = new Map(timeoutsRef.current).set(index, timeout)
      } catch {
        // Show error state
        setCopyStates((prev) => {
          const next = [...prev]
          next[index] = "error"
          return next
        })

        setTimeout(() => {
          setCopyStates((prev) => {
            const next = [...prev]
            next[index] = "idle"
            return next
          })
        }, 2000)
      }
    }

    // Call optional callback (for Phase 8 terminal integration)
    onCommandClick?.(command)
  }

  /**
   * Clean up timeouts on unmount.
   */
  useEffect(() => {
    return () => {
      for (const timeout of timeoutsRef.current.values()) {
        clearTimeout(timeout)
      }
    }
  }, [])

  // Don't render if no commands
  if (safeCommands.length === 0) {
    return null
  }

  return (
    <div className="my-6">
      <h3 className="mb-3 text-sm font-semibold text-[var(--color-text-muted)]">{label}</h3>
      <div className="flex flex-col gap-2">
        {safeCommands.map((command, index) => (
          <CommandButton
            // biome-ignore lint/suspicious/noArrayIndexKey: Commands are static and order won't change
            key={index}
            command={command}
            onClick={() => handleCommandClick(command, index)}
            state={copyStates[index] ?? "idle"}
          />
        ))}
      </div>
    </div>
  )
}
