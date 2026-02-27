"use client"

import type { ReactNode } from "react"
import { useInlineTerminal } from "../../contexts/InlineTerminalContext"
import { InlineTerminal } from "./InlineTerminal"

/**
 * TerminalAutoAppend - Renders InlineTerminal only if no <Terminal /> was placed in MDX.
 *
 * Reads hasInlineTerminal from context. If false (no TerminalMDX mounted),
 * renders an InlineTerminal at the bottom of the step content.
 */
export function TerminalAutoAppend({
  toolPair,
}: {
  readonly toolPair: string
}): ReactNode {
  const { hasInlineTerminal, sandboxConfig } = useInlineTerminal()

  // Don't render if MDX already has a <Terminal />
  if (hasInlineTerminal) {
    return null
  }

  // Don't render if sandbox is disabled
  if (sandboxConfig !== undefined && sandboxConfig.enabled === false) {
    return null
  }

  return <InlineTerminal toolPair={toolPair} />
}
