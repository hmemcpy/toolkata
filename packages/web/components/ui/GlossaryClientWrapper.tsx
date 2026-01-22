/**
 * GlossaryClientWrapper - Client component wrapper for the glossary page.
 *
 * Renders tagline with direction toggle, then the interactive glossary.
 * DirectionProvider is provided by [toolPair]/layout.tsx.
 */

"use client"

import type { GlossaryEntry } from "../../content/glossary/jj-git"
import { useDirectionContext } from "../../contexts/DirectionContext"
import { DirectionToggle } from "./DirectionToggle"
import { GlossaryClient } from "./GlossaryClient"

export interface GlossaryClientWrapperProps {
  readonly entries: readonly GlossaryEntry[]
  readonly toolPair: string
  readonly pairingFrom: string
  readonly pairingTo: string
}

export function GlossaryClientWrapper({
  entries,
  toolPair,
}: GlossaryClientWrapperProps) {
  const { isLoading, fromTool, toTool } = useDirectionContext()

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-[var(--color-text-muted)]">Loading...</p>
      </div>
    )
  }

  return (
    <>
      {/* Tagline */}
      <p className="mt-2 text-sm text-[var(--color-text-muted)]">
        Search and filter commands for {fromTool} {"\u2192"} {toTool}
      </p>

      {/* Direction toggle */}
      <div className="mt-4 mb-8">
        <DirectionToggle />
      </div>

      {/* Interactive glossary */}
      <GlossaryClient entries={entries} toolPair={toolPair} />
    </>
  )
}
