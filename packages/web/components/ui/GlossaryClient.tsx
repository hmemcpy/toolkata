/**
 * GlossaryClient - Searchable glossary component with category filtering.
 *
 * Features:
 * - Client-side component for interactive search and filtering
 * - Direction-aware display (respects DirectionContext)
 * - Category filter tabs (All + 8 categories)
 * - Debounced search input with aria-live result announcements
 * - Two-column table with copy buttons
 * - Responsive: horizontal scroll on mobile
 * - Empty state for no results
 *
 * @example
 * ```tsx
 * import { DirectionProvider } from "@/contexts/DirectionContext"
 * import { GlossaryClient } from "@/components/ui/GlossaryClient"
 *
 * <DirectionProvider toolPair="jj-git">
 *   <GlossaryClient entries={jjGitGlossary} toolPair="jj-git" />
 * </DirectionProvider>
 * ```
 */

"use client"

import React from "react"
import type { GlossaryEntry, GlossaryCategory } from "../../content/glossary/jj-git"
import { getCategories } from "../../content/glossary/jj-git"
import { useGlossarySearch } from "../../hooks/useGlossarySearch"
import { useDirectionContext } from "../../contexts/DirectionContext"
import { getPairing } from "../../content/pairings"

/**
 * Copy button component for individual commands.
 *
 * Copies the appropriate command based on current direction preference.
 * - Default (git→jj): copies the jj (to) command
 * - Reversed (jj→git): copies the git (from) command
 */
function CopyButton({ text }: { readonly text: string }): React.JSX.Element {
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
      [{copied ? "\u2713" : "Copy"}]
    </button>
  )
}

/**
 * Category filter tab button.
 */
function CategoryTab({
  category,
  isActive,
  onClick,
}: {
  readonly category: GlossaryCategory | "All"
  readonly isActive: boolean
  readonly onClick: () => void
}): React.JSX.Element {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={isActive}
      className={[
        "px-3 py-1.5 text-sm font-mono border whitespace-nowrap transition-colors duration-[var(--transition-fast)]",
        "min-h-[44px]", // Touch target
        isActive
          ? "border-[var(--color-accent)] text-[var(--color-accent)] bg-[rgba(34,197,94,0.05)]"
          : "border-[var(--color-border)] text-[var(--color-text-muted)] bg-[var(--color-surface)] hover:border-[var(--color-border-focus)] hover:text-[var(--color-text)]",
        "focus-visible:outline-none focus-visible:ring-[var(--focus-ring)]",
      ].join(" ")}
    >
      {category}
    </button>
  )
}

/**
 * Props for GlossaryClient component.
 */
export interface GlossaryClientProps {
  /** The glossary entries to display */
  readonly entries: readonly GlossaryEntry[]
  /** The tool pairing slug */
  readonly toolPair: string
}

/**
 * GlossaryClient component.
 *
 * Renders an interactive glossary with search and category filtering.
 * Must be used within a DirectionProvider.
 */
export function GlossaryClient({
  entries,
  toolPair,
}: GlossaryClientProps): React.JSX.Element {
  const { isReversed, isLoading, fromTool, toTool } =
    useDirectionContext()

  const {
    query,
    setQuery,
    category,
    setCategory,
    filteredEntries,
    resultCount,
  } = useGlossarySearch(entries)

  const categories = getCategories()
  const _pairing = getPairing(toolPair)

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
      {/* Header with title and direction toggle */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold font-mono text-[var(--color-text)]">
          Command Glossary
        </h1>
        <p className="mt-2 text-sm text-[var(--color-text-muted)]">
          Search and filter commands for {fromTool} \u2192 {toTool}
        </p>
      </div>

      {/* Search input */}
      <div className="mb-6">
        <label htmlFor="glossary-search" className="sr-only">
          Search commands
        </label>
        <input
          id="glossary-search"
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search commands... (e.g., 'commit', 'branch')"
          className={[
            "w-full px-4 py-3 bg-[var(--color-surface)] border border-[var(--color-border)]",
            "text-[var(--color-text)] placeholder:text-[var(--color-text-dim)]",
            "font-mono text-sm rounded-md",
            "focus:outline-none focus-visible:ring-[var(--focus-ring)] focus:border-[var(--color-accent)]",
            "transition-colors duration-[var(--transition-fast)]",
          ].join(" ")}
          aria-describedby="search-results-count"
        />
      </div>

      {/* Category filter tabs */}
      <div className="mb-6 overflow-x-auto pb-2">
        <div className="flex flex-wrap gap-2 min-w-max sm:min-w-0">
          <CategoryTab
            category="All"
            isActive={category === "All"}
            onClick={() => setCategory("All")}
          />
          {categories.map((cat) => (
            <CategoryTab
              key={cat}
              category={cat}
              isActive={category === cat}
              onClick={() => setCategory(cat)}
            />
          ))}
        </div>
      </div>

      {/* Results count (aria-live for screen readers) */}
      <div className="mb-4">
        <p
          id="search-results-count"
          className="text-sm text-[var(--color-text-muted)]"
          aria-live="polite"
        >
          {query || category !== "All"
            ? `Found ${resultCount} command${resultCount === 1 ? "" : "s"}`
            : `All ${resultCount} commands`}
        </p>
      </div>

      {/* Empty state */}
      {filteredEntries.length === 0 && (
        <div className="py-12 text-center">
          <p className="text-[var(--color-text-muted)] font-mono">
            No commands found matching &quot;{query}&quot;
          </p>
          <button
            type="button"
            onClick={() => {
              setQuery("")
              setCategory("All")
            }}
            className="mt-4 px-4 py-2 text-sm font-mono text-[var(--color-text)] bg-[var(--color-surface)] border border-[var(--color-border)] rounded-md hover:bg-[var(--color-surface-hover)] focus-visible:outline-none focus-visible:ring-[var(--focus-ring)] transition-all duration-[var(--transition-fast)]"
          >
            [Clear filters]
          </button>
        </div>
      )}

      {/* Results table */}
      {filteredEntries.length > 0 && (
        <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] overflow-hidden">
          {/* Mobile: horizontal scroll */}
          <div className="overflow-x-auto">
            {/* Table header */}
            <div className="grid grid-cols-12 gap-4 border-b border-[var(--color-border)] bg-[var(--color-bg)] px-6 py-3 min-w-[600px]">
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
                \u2551
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

            {/* Command rows */}
            {filteredEntries.map((entry) => {
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
                  className="grid grid-cols-12 gap-4 border-b border-[var(--color-border)] px-6 py-3 last:border-b-0 hover:bg-[var(--color-surface-hover)] transition-colors duration-[var(--transition-fast)] min-w-[600px]"
                >
                  {/* Left column (fromTool's command in current direction) */}
                  <div className="col-span-5 flex items-center">
                    <code className={["text-sm font-mono", leftColor].join(" ")}>
                      {leftCommand}
                    </code>
                  </div>

                  {/* Divider */}
                  <div className="col-span-1 flex items-center justify-center">
                    <span className="text-[var(--color-text-dim)] text-sm">
                      \u2551
                    </span>
                  </div>

                  {/* Right column (toTool's command in current direction) */}
                  <div className="col-span-5 flex items-center justify-end gap-2">
                    {entry.note && (
                      <span className="text-xs text-[var(--color-text-muted)] italic hidden sm:inline">
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
        </div>
      )}

      {/* Mobile note display below table for small screens */}
      {filteredEntries.some((e) => e.note) && (
        <div className="mt-4 text-xs text-[var(--color-text-muted)] sm:hidden">
          Notes shown inline on desktop. Tap any row to expand (coming soon).
        </div>
      )}
    </div>
  )
}
