"use client"

import { useEffect, type ReactNode } from "react"
import { useInlineTerminal } from "../../contexts/InlineTerminalContext"
import { InlineTerminal } from "./InlineTerminal"

/**
 * TerminalMDX - Thin MDX wrapper for InlineTerminal.
 *
 * Registered in MDXComponents as <Terminal />.
 * When mounted, sets hasInlineTerminal=true in context so that
 * TerminalAutoAppend knows not to render a second terminal.
 *
 * Reads toolPair from InlineTerminalContext (no props needed from MDX).
 */
export function TerminalMDX(): ReactNode {
  const { toolPair, setHasInlineTerminal } = useInlineTerminal()

  useEffect(() => {
    setHasInlineTerminal(true)
    return () => setHasInlineTerminal(false)
  }, [setHasInlineTerminal])

  return <InlineTerminal toolPair={toolPair} />
}
