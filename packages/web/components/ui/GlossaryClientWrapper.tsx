/**
 * GlossaryClientWrapper - Client component wrapper for the glossary page.
 *
 * This wrapper provides:
 * - DirectionProvider for direction context
 * - Header with DirectionToggle
 * - GlossaryClient with interactive search and filtering
 *
 * @example
 * ```tsx
 * <GlossaryClientWrapper
 *   entries={jjGitGlossary}
 *   toolPair="jj-git"
 *   pairingFrom="git"
 *   pairingTo="jj"
 * />
 * ```
 */

"use client"

import type { GlossaryEntry } from "../../content/glossary/jj-git"
import { DirectionProvider } from "../../contexts/DirectionContext"
import { DirectionToggle } from "./DirectionToggle"
import { GlossaryClient } from "./GlossaryClient"

export interface GlossaryClientWrapperProps {
  /**
   * The glossary entries to display.
   */
  readonly entries: readonly GlossaryEntry[]

  /**
   * The tool pairing slug (e.g., "jj-git").
   */
  readonly toolPair: string

  /**
   * The "from" tool name (e.g., "git") for display.
   */
  readonly pairingFrom: string

  /**
   * The "to" tool name (e.g., "jj") for display.
   */
  readonly pairingTo: string
}

/**
 * GlossaryClientWrapper component.
 *
 * Client component that wraps the glossary with:
 * - DirectionProvider for direction context
 * - DirectionToggle in the header
 * - GlossaryClient for interactive search and filtering
 */
export function GlossaryClientWrapper({
  entries,
  toolPair,
  pairingFrom: _pairingFrom,
  pairingTo: _pairingTo,
}: GlossaryClientWrapperProps) {
  return (
    <DirectionProvider toolPair={toolPair}>
      {/* Header with direction toggle */}
      <div className="mb-8 flex items-center justify-end">
        <DirectionToggle />
      </div>

      {/* Glossary client with search and filtering */}
      <GlossaryClient entries={entries} toolPair={toolPair} />
    </DirectionProvider>
  )
}
