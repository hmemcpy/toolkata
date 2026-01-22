/**
 * TerminalWithSuggestions - Wires InteractiveTerminal with CommandSuggestions.
 *
 * Client component that combines the terminal and command suggestions,
 * allowing users to click suggested commands to insert them into the terminal.
 *
 * Features:
 * - InteractiveTerminal with imperative handle
 * - CommandSuggestions wired to terminal insertion
 * - Auto-focus terminal after command insertion
 * - Copy functionality fallback
 *
 * @example
 * ```tsx
 * <TerminalWithSuggestions
 *   toolPair="jj-git"
 *   stepId="03"
 *   suggestedCommands={[
 *     "jj status",
 *     "jj describe -m 'My commit'",
 *     "jj new"
 *   ]}
 * />
 * ```
 */

"use client"

import { useRef } from "react"
import { CommandSuggestions } from "./CommandSuggestions"
import type { InteractiveTerminalRef } from "./InteractiveTerminal"
import { InteractiveTerminal } from "./InteractiveTerminal"

export interface TerminalWithSuggestionsProps {
  /**
   * The tool pairing slug (e.g., "jj-git").
   */
  readonly toolPair: string

  /**
   * The step ID for this terminal instance.
   */
  readonly stepId: string

  /**
   * Suggested commands to display below the terminal.
   *
   * These commands will be shown as clickable buttons that insert
   * the command into the terminal when clicked.
   */
  readonly suggestedCommands: readonly string[]
}

/**
 * TerminalWithSuggestions component.
 *
 * Combines InteractiveTerminal and CommandSuggestions, wiring them
 * together so clicking a suggested command inserts it into the terminal.
 */
export function TerminalWithSuggestions({
  toolPair,
  stepId,
  suggestedCommands,
}: TerminalWithSuggestionsProps) {
  const terminalRef = useRef<InteractiveTerminalRef>(null)

  /**
   * Handle command click from CommandSuggestions.
   *
   * When a user clicks a suggested command:
   * 1. Insert it into the terminal via imperative handle
   * 2. Focus the terminal for continued input
   */
  const handleCommandClick = (command: string) => {
    const terminal = terminalRef.current
    if (terminal) {
      // Insert the command into the terminal
      terminal.insertCommand(command)
      // Auto-focus the terminal after insertion
      terminal.focus()
    }
  }

  return (
    <div>
      {/* Interactive Terminal */}
      <InteractiveTerminal
        ref={terminalRef}
        toolPair={toolPair}
        stepId={stepId}
        // Don't use preloadCommands - we use CommandSuggestions separately
        preloadCommands={[]}
      />

      {/* Command Suggestions - wired to terminal */}
      {suggestedCommands.length > 0 ? (
        <CommandSuggestions
          commands={suggestedCommands}
          onCommandClick={handleCommandClick}
          label="Suggested commands"
        />
      ) : null}
    </div>
  )
}
