/**
 * CheatSheetClientWrapper - Client component wrapper for cheat sheet pages.
 *
 * Renders tagline, then the interactive cheat sheet.
 * Used for single-tool tutorials (tmux, vim, etc.).
 */

"use client"

import type { CheatSheetEntry } from "../../content/glossary/types"
import { CheatSheetClient } from "./CheatSheetClient"

export interface CheatSheetClientWrapperProps {
  readonly entries: readonly CheatSheetEntry[]
  readonly toolPair: string
  readonly toolName: string
}

export function CheatSheetClientWrapper({
  entries,
  toolPair,
  toolName,
}: CheatSheetClientWrapperProps) {
  return (
    <>
      {/* Tagline */}
      <p className="mt-2 text-sm text-[var(--color-text-muted)]">
        Search and filter {toolName} commands
      </p>

      {/* Interactive cheat sheet */}
      <div className="mt-8">
        <CheatSheetClient entries={entries} toolPair={toolPair} />
      </div>
    </>
  )
}
