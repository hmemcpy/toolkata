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
 * Per-environment tool info and common commands.
 */
const ENVIRONMENT_INFO: Record<
  string,
  {
    readonly tools: ReadonlyArray<{ readonly name: string; readonly version: string; readonly color: string }>
    readonly commonCommands: readonly string[]
  }
> = {
  bash: {
    tools: [
      { name: "jj", version: "0.25.0", color: "var(--color-accent)" },
      { name: "git", version: "2.39.x", color: "var(--color-git)" },
    ],
    commonCommands: ["jj status", "jj log", "jj diff", "jj show @"],
  },
  tmux: {
    tools: [{ name: "tmux", version: "3.5a", color: "var(--color-accent)" }],
    commonCommands: ["tmux list-sessions", "tmux list-windows", "tmux list-panes"],
  },
  scala: {
    tools: [{ name: "scala-cli", version: "1.x", color: "var(--color-accent)" }],
    commonCommands: [],
  },
  typescript: {
    tools: [{ name: "tsx", version: "4.x", color: "var(--color-accent)" }],
    commonCommands: [],
  },
}

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
  const { contextCommands, executeCommand, state, sandboxConfig } = useTerminalContext()

  const isTerminalReady = state === "CONNECTED" || state === "TIMEOUT_WARNING"

  const environment = sandboxConfig?.environment ?? "bash"
  const defaultEnvInfo = { tools: [], commonCommands: [] as readonly string[] }
  const envInfo = ENVIRONMENT_INFO[environment] ?? defaultEnvInfo
  const commonCommands = envInfo.commonCommands

  // Filter common commands to exclude any that are already in contextCommands
  const filteredCommonCommands = commonCommands.filter((cmd) => !contextCommands.includes(cmd))

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Tool versions header */}
      <div className="flex shrink-0 items-center gap-4 border-b border-[var(--color-border)] px-4 py-2">
        <span className="text-xs text-[var(--color-text-dim)]">Installed:</span>
        {envInfo.tools.map((tool, i) => (
          <div key={tool.name} className="flex items-center gap-1.5">
            {i > 0 && <div className="h-3 w-px bg-[var(--color-border)]" aria-hidden="true" />}
            <span className="text-xs font-medium" style={{ color: tool.color }}>{tool.name}</span>
            <span className="text-xs text-[var(--color-text-muted)]">{tool.version}</span>
          </div>
        ))}
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
