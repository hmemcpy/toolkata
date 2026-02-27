/**
 * TryIt - Inline command component with disposable per-instance terminal.
 *
 * Displays an editable command with a "Run" button. On click, an inline
 * terminal appears below, creates a disposable sandbox session, runs
 * setup commands silently, and auto-executes the command.
 *
 * Used in MDX content like:
 * `<TryIt command="jj status" setup={["jj git init --colocate ."]} />`
 */

"use client"

import dynamic from "next/dynamic"
import { useCallback, useEffect, useState } from "react"
import { useSandboxConfig } from "../../contexts/SandboxConfigContext"

/**
 * Lazy-load InlineTryItTerminal for SSR safety and bundle optimization.
 */
const InlineTryItTerminal = dynamic(
  () => import("./InlineTryItTerminal").then((mod) => ({ default: mod.InlineTryItTerminal })),
  {
    loading: () => (
      <div className="mt-2 flex items-center justify-center rounded border border-[var(--color-border)] bg-[#0c0c0c] p-4" style={{ height: "200px" }}>
        <div className="text-center">
          <div
            className="mb-2 inline-block h-6 w-6 animate-spin rounded-full border-2 border-[var(--color-border)] border-t-[var(--color-accent)]"
            aria-hidden="true"
          />
          <p className="text-xs text-[var(--color-text-muted)]">Loading terminal...</p>
        </div>
      </div>
    ),
    ssr: false,
  },
)

/**
 * Props for the TryIt component.
 */
export interface TryItProps {
  /**
   * The command to execute in the terminal (e.g., "jj status").
   * Serves as the initial value if editable.
   */
  readonly command: string

  /**
   * Optional description text shown as a tooltip.
   */
  readonly description?: string

  /**
   * Optional expected output to display below the command.
   * Helps users verify their command worked correctly.
   */
  readonly expectedOutput?: string

  /**
   * Whether the command input should be editable.
   * @default true
   */
  readonly editable?: boolean

  /**
   * Setup commands to run before the main command.
   * Each TryIt gets its own sandbox session with these setup commands
   * executed silently before the main command runs.
   */
  readonly setup?: readonly string[]

  /**
   * Whether to skip build-time snippet validation.
   * @default undefined (validate by default)
   */
  readonly validate?: boolean
}

/**
 * TryIt component - editable inline command with Run button and inline terminal.
 */
export function TryIt({
  command,
  description,
  expectedOutput,
  editable = true,
  setup,
}: TryItProps): React.JSX.Element {
  const { toolPair, sandboxConfig, authToken } = useSandboxConfig()
  const [isTerminalOpen, setIsTerminalOpen] = useState(false)
  const [editedCommand, setEditedCommand] = useState(command)

  const handleRun = useCallback(() => {
    setIsTerminalOpen(true)
  }, [])

  const handleClose = useCallback(() => {
    setIsTerminalOpen(false)
  }, [])

  // Reset edited command when the original command prop changes
  useEffect(() => {
    setEditedCommand(command)
  }, [command])

  // Don't show Run button if sandbox is disabled
  const sandboxEnabled = sandboxConfig === undefined || sandboxConfig.enabled !== false

  const commonInputProps = {
    className:
      "flex-1 bg-transparent font-mono text-sm text-[var(--color-accent)] outline-none placeholder:text-[var(--color-text-dim)]",
    "aria-label": description ?? `Command: ${command}`,
    title: description,
  }

  return (
    <div className="my-2">
      <div className="flex flex-col gap-1.5 rounded border border-[var(--color-border)] bg-[var(--color-surface)] p-3">
        {/* Command row with input and button */}
        <div className="flex items-center gap-2">
          <span className="shrink-0 text-[var(--color-text-dim)]">$</span>
          {editable ? (
            <input
              {...commonInputProps}
              type="text"
              value={editedCommand}
              onChange={(e) => setEditedCommand(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && sandboxEnabled) {
                  handleRun()
                }
              }}
              placeholder={command}
            />
          ) : (
            <code {...commonInputProps}>{command}</code>
          )}
          {sandboxEnabled ? (
            <button
              type="button"
              onClick={isTerminalOpen ? handleClose : handleRun}
              aria-label={isTerminalOpen ? `Close terminal for: ${editedCommand}` : `Run command: ${editedCommand}`}
              className="shrink-0 rounded bg-[var(--color-accent)] px-2 py-0.5 text-xs font-medium text-[var(--color-bg)] transition-colors hover:bg-[var(--color-accent-hover)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]"
            >
              {isTerminalOpen ? "Close" : "Run"}
            </button>
          ) : null}
        </div>

        {/* Expected output (optional) */}
        {expectedOutput && (
          <div className="pl-4 text-xs font-mono text-[var(--color-text-muted)]">
            <span className="text-[var(--color-text-dim)]"># Expected output:</span>
            <pre className="mt-1 whitespace-pre-wrap break-words">{expectedOutput}</pre>
          </div>
        )}
      </div>

      {/* Inline terminal (appears below the command bar) */}
      {isTerminalOpen ? (
        <InlineTryItTerminal
          toolPair={toolPair}
          sandboxConfig={sandboxConfig}
          authToken={authToken}
          setupCommands={setup ?? []}
          initialCommand={editedCommand}
          onClose={handleClose}
        />
      ) : null}
    </div>
  )
}
