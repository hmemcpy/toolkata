/**
 * InfoPanel - Tool info and contextual commands display.
 *
 * Shows:
 * - Tool versions header (jj 0.25.0, git 2.39.x)
 * - Scrollable list of commands from the current step
 * - "Run" buttons that execute commands in the terminal
 *
 * @example
 * ```tsx
 * <InfoPanel />
 * ```
 */

"use client"

import { useState, type ReactNode } from "react"
import { useTerminalContext } from "../../contexts/TerminalContext"

/**
 * Tool version information.
 * Hardcoded for the sandbox environment.
 */
const TOOL_VERSIONS = {
  jj: "0.25.0",
  git: "2.39.x",
}

/**
 * Common commands always available in the sandbox.
 */
const COMMON_COMMANDS = ["jj status", "jj log", "jj diff", "jj show @"]

/**
 * Command button component for consistent styling.
 * Shows "Run" when terminal is online, "Copy" when offline.
 */
function CommandButton({
  command,
  onRun,
  isOnline,
}: {
  readonly command: string
  readonly onRun: () => void
  readonly isOnline: boolean
}) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(command)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      // Clipboard API not available
    }
  }

  return (
    <li className="flex items-center gap-2">
      <code className="flex-1 truncate rounded bg-[var(--color-bg)] px-2 py-1.5 font-mono text-xs text-[var(--color-text)]">
        {command}
      </code>
      {isOnline ? (
        <button
          type="button"
          onClick={onRun}
          className="shrink-0 rounded bg-[var(--color-accent)] px-2 py-1 text-xs font-medium text-[var(--color-bg)] transition-colors hover:bg-[var(--color-accent-hover)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-surface)]"
          aria-label={`Run command: ${command}`}
        >
          Run
        </button>
      ) : (
        <button
          type="button"
          onClick={handleCopy}
          className="shrink-0 rounded border border-[var(--color-border)] px-2 py-1 text-xs font-medium text-[var(--color-text-muted)] transition-colors hover:border-[var(--color-accent)] hover:text-[var(--color-text)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-surface)]"
          aria-label={`Copy command: ${command}`}
        >
          {copied ? "Copied" : "Copy"}
        </button>
      )}
    </li>
  )
}

/**
 * InfoPanel component.
 *
 * Displays tool versions and contextual commands from the current step.
 * Commands can be executed in the terminal via "Run" buttons.
 */
export function InfoPanel(): ReactNode {
  const { contextCommands, executeCommand, state } = useTerminalContext()

  const isTerminalReady = state === "CONNECTED" || state === "TIMEOUT_WARNING"

  // Filter common commands to exclude any that are already in contextCommands
  const filteredCommonCommands = COMMON_COMMANDS.filter(
    (cmd) => !contextCommands.includes(cmd),
  )

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Tool versions header */}
      <div className="flex shrink-0 items-center gap-4 border-b border-[var(--color-border)] px-4 py-2">
        <span className="text-xs text-[var(--color-text-dim)]">Installed:</span>
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-medium text-[var(--color-accent)]">jj</span>
          <span className="text-xs text-[var(--color-text-muted)]">{TOOL_VERSIONS.jj}</span>
        </div>
        <div className="h-3 w-px bg-[var(--color-border)]" aria-hidden="true" />
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-medium text-[var(--color-git)]">git</span>
          <span className="text-xs text-[var(--color-text-muted)]">{TOOL_VERSIONS.git}</span>
        </div>
      </div>

      {/* Commands list */}
      <div className="flex-1 overflow-y-auto px-4 py-3">
        {/* Step-specific commands */}
        {contextCommands.length > 0 && (
          <>
            <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-[var(--color-text-muted)]">
              Try These
            </h3>
            <ul className="mb-4 space-y-2" aria-label="Commands to try">
              {contextCommands.map((command) => (
                <CommandButton
                  key={command}
                  command={command}
                  onRun={() => executeCommand(command)}
                  isOnline={isTerminalReady}
                />
              ))}
            </ul>
          </>
        )}

        {/* Common commands */}
        {filteredCommonCommands.length > 0 && (
          <>
            <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-[var(--color-text-dim)]">
              Common
            </h3>
            <ul className="space-y-2" aria-label="Common commands">
              {filteredCommonCommands.map((command) => (
                <CommandButton
                  key={command}
                  command={command}
                  onRun={() => executeCommand(command)}
                  isOnline={isTerminalReady}
                />
              ))}
            </ul>
          </>
        )}
      </div>
    </div>
  )
}
