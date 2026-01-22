"use client"

import Link from "next/link"
import { notFound } from "next/navigation"
import React from "react"
import type { JSX } from "react"
import { Footer } from "../../../components/ui/Footer"
import { Header } from "../../../components/ui/Header"
import { DirectionToggle } from "../../../components/ui/DirectionToggle"
import { useDirectionContext } from "../../../contexts/DirectionContext"
import { getPairing, isValidPairingSlug } from "../../../content/pairings"
import { jjGitGlossary, getCategories } from "../../../content/glossary/jj-git"

/**
 * Copy button component for individual commands.
 *
 * Copies the appropriate command based on current direction preference.
 * - Default (git→jj): copies the jj (to) command
 * - Reversed (jj→git): copies the git (from) command
 *
 * @param text - The text to copy to clipboard.
 */
function CopyButton({ text }: { readonly text: string }): JSX.Element {
  const [copied, setCopied] = React.useState(false)

  const handleCopy = () => {
    void navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="ml-2 text-xs text-[var(--color-text-muted)] hover:text-[var(--color-accent)] focus-visible:outline-none focus-visible:ring-[var(--focus-ring)] transition-colors duration-[var(--transition-fast)]"
      aria-label={`Copy command: ${text}`}
    >
      [{copied ? "✓" : "Copy"}]
    </button>
  )
}

/**
 * Inner cheatsheet content that consumes direction context.
 *
 * Renders the command reference table with direction-aware column headers
 * and copy buttons.
 */
function CheatsheetContent({
  toolPair,
}: {
  readonly toolPair: string
}): JSX.Element {
  const { isReversed, isLoading, fromTool, toTool } = useDirectionContext()

  const pairing = getPairing(toolPair)
  if (!pairing) {
    notFound()
  }

  const categories = getCategories()

  const handlePrint = () => {
    window.print()
  }

  // Don't render direction-dependent UI during hydration
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[var(--color-bg)] flex items-center justify-center">
        <p className="text-[var(--color-text-muted)]">Loading...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      <Header />

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header with back link, title, direction toggle, and print button */}
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <Link
              href={`/${toolPair}`}
              className="inline-flex items-center text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text)] focus-visible:outline-none focus-visible:ring-[var(--focus-ring)] transition-colors duration-[var(--transition-fast)]"
            >
              ← {pairing.to.name} ← {pairing.from.name}
            </Link>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <DirectionToggle />
            <Link
              href={`/${toolPair}/glossary`}
              className="inline-flex items-center px-4 py-2 text-sm font-mono text-[var(--color-text)] bg-[var(--color-surface)] border border-[var(--color-border)] rounded-md hover:bg-[var(--color-surface-hover)] focus-visible:outline-none focus-visible:ring-[var(--focus-ring)] transition-all duration-[var(--transition-fast)]"
            >
              [Glossary →]
            </Link>
            <h1 className="text-2xl font-bold font-mono text-[var(--color-text)]">
              Cheat Sheet
            </h1>
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center px-4 py-2 text-sm font-mono text-[var(--color-text)] bg-[var(--color-surface)] border border-[var(--color-border)] rounded-md hover:bg-[var(--color-surface-hover)] focus-visible:outline-none focus-visible:ring-[var(--focus-ring)] transition-all duration-[var(--transition-fast)]"
              aria-label="Print this cheat sheet"
            >
              [Print]
            </button>
          </div>
        </div>

        {/* Quick Reference heading with direction-aware arrow */}
        <div className="mb-8">
          <h2 className="text-xl font-mono font-medium text-[var(--color-text)]">
            Quick Reference: {fromTool} → {toTool}
          </h2>
          <div className="mt-2 h-0.5 w-16 bg-[var(--color-accent)]" />
        </div>

        {/* Cheat sheet table */}
        <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] overflow-hidden">
          {/* Table header */}
          <div className="grid grid-cols-12 gap-4 border-b border-[var(--color-border)] bg-[var(--color-bg)] px-6 py-3">
            <div
              className={[
                "col-span-5 text-xs font-mono font-medium uppercase tracking-wide",
                isReversed
                  ? "text-[var(--color-accent)] text-right"
                  : "text-[var(--color-accent-alt)]",
              ].join(" ")}
            >
              {fromTool}
            </div>
            <div className="col-span-1 text-center text-xs font-mono font-medium text-[var(--color-text-muted)] uppercase tracking-wide">
              ║
            </div>
            <div
              className={[
                "col-span-5 text-xs font-mono font-medium uppercase tracking-wide",
                isReversed
                  ? "text-[var(--color-accent-alt)]"
                  : "text-[var(--color-accent)]",
              ].join(" ")}
            >
              {toTool}
            </div>
            <div className="col-span-1" />
          </div>

          {/* Command rows grouped by category */}
          {categories.map((category) => {
            const categoryEntries = jjGitGlossary.filter(
              (entry) => entry.category === category,
            )
            return (
              <div key={category}>
                {/* Category header */}
                <div className="border-b border-[var(--color-border)] bg-[var(--color-bg)] px-6 py-2">
                  <span className="text-sm font-mono font-medium text-[var(--color-text-muted)]">
                    {category}
                  </span>
                  <span className="ml-2 text-sm text-[var(--color-text-dim)]">
                    ─────────
                  </span>
                </div>

                {/* Command rows in this category */}
                {categoryEntries.map((entry) => {
                  // When reversed, show toCommand on left (from position) and fromCommand on right (to position)
                  const leftCommand = isReversed ? entry.toCommand : entry.fromCommand
                  const rightCommand = isReversed ? entry.fromCommand : entry.toCommand
                  const leftColor = isReversed
                    ? "text-[var(--color-accent)]"
                    : "text-[var(--color-accent-alt)]"
                  const rightColor = isReversed
                    ? "text-[var(--color-accent-alt)]"
                    : "text-[var(--color-accent)]"

                  return (
                    <div
                      key={entry.id}
                      className="grid grid-cols-12 gap-4 border-b border-[var(--color-border)] px-6 py-3 last:border-b-0 hover:bg-[var(--color-surface-hover)] transition-colors duration-[var(--transition-fast)] print:hover:bg-transparent"
                    >
                      {/* Left column (fromTool's command in current direction) */}
                      <div className="col-span-5 flex items-center">
                        <code className={["text-sm font-mono", leftColor].join(" ")}>
                          {leftCommand}
                        </code>
                      </div>

                      {/* Divider */}
                      <div className="col-span-1 flex items-center justify-center">
                        <span className="text-[var(--color-text-dim)] text-sm">║</span>
                      </div>

                      {/* Right column (toTool's command in current direction) */}
                      <div className="col-span-5 flex items-center justify-end gap-2">
                        {entry.note && (
                          <span className="text-xs text-[var(--color-text-muted)] italic">
                            ({entry.note})
                          </span>
                        )}
                        <code className={["text-sm font-mono", rightColor].join(" ")}>
                          {rightCommand}
                        </code>
                      </div>

                      {/* Copy button - copies the toCommand (right column) */}
                      <div className="col-span-1 flex items-center justify-end">
                        <CopyButton text={rightCommand} />
                      </div>
                    </div>
                  )
                })}
              </div>
            )
          })}
        </div>

        {/* Print-only footer */}
        <div className="mt-8 text-sm text-[var(--color-text-muted)] print:block hidden">
          <p>
            Cheat sheet for {pairing.to.name} if you already know{" "}
            {pairing.from.name}.
          </p>
          <p className="mt-2">Visit toolkata.com for interactive tutorials.</p>
        </div>
      </main>

      <Footer />
    </div>
  )
}

/**
 * Cheat sheet page component.
 *
 * Displays a two-column command reference table with bidirectional support.
 * Users can toggle between:
 * - Default: {fromTool} → {toTool} (e.g., git → jj)
 * - Reversed: {toTool} → {fromTool} (e.g., jj → git)
 *
 * The table columns, colors, and copy buttons all respect the direction preference.
 *
 * DirectionProvider is now provided by the [toolPair]/layout.tsx, so this
 * page can directly use useDirectionContext().
 *
 * @param params - Route params containing toolPair slug
 */
export default function CheatSheetPage({
  params,
}: {
  readonly params: Promise<{ readonly toolPair: string }>
}) {
  // Using useState to handle params async and loading state
  const [toolPair, setToolPair] = React.useState<string | null>(null)
  const [notFoundState, setNotFoundState] = React.useState(false)

  React.useEffect(() => {
    void params.then((resolved) => {
      const { toolPair: resolvedToolPair } = resolved
      if (!isValidPairingSlug(resolvedToolPair)) {
        setNotFoundState(true)
      } else {
        setToolPair(resolvedToolPair)
      }
    })
  }, [params])

  if (notFoundState) {
    notFound()
  }

  if (!toolPair) {
    return (
      <div className="min-h-screen bg-[var(--color-bg)] flex items-center justify-center">
        <p className="text-[var(--color-text-muted)]">Loading...</p>
      </div>
    )
  }

  // DirectionProvider is now in layout.tsx - just render the content
  return <CheatsheetContent toolPair={toolPair} />
}
