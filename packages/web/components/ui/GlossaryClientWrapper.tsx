/**
 * GlossaryClientWrapper - Client component wrapper for the glossary page.
 *
 * Renders tagline, then the interactive glossary.
 */

"use client"

import type { GlossaryEntry } from "../../content/glossary/jj-git"
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
  pairingFrom,
  pairingTo,
}: GlossaryClientWrapperProps) {
  return (
    <>
      {/* Tagline */}
      <p className="mt-2 text-sm text-[var(--color-text-muted)]">
        Search and filter commands for {pairingFrom} {"\u2192"} {pairingTo}
      </p>

      {/* Interactive glossary */}
      <div className="mt-8">
        <GlossaryClient
          entries={entries}
          toolPair={toolPair}
          fromLabel={pairingFrom}
          toLabel={pairingTo}
        />
      </div>
    </>
  )
}
