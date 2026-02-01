/**
 * GlossaryClient - Searchable glossary component with category filtering.
 *
 * Features:
 * - Client-side component for interactive search and filtering
 * - Category filter tabs (All + dynamic categories)
 * - Debounced search input with aria-live result announcements
 * - Two-column table with copy buttons
 * - Responsive: horizontal scroll on mobile
 * - Empty state for no results
 * - Direction reversal via useDirection hook (swaps columns)
 *
 * @example
 * ```tsx
 * import { GlossaryClient } from "@/components/ui/GlossaryClient"
 *
 * <GlossaryClient entries={jjGitGlossary} toolPair="jj-git" />
 * ```
 */

"use client"

import React from "react"
import type { GlossaryEntry } from "../../content/glossary/types"
import { useGlossarySearch } from "../../hooks/useGlossarySearch"
import { useDirection } from "@/hooks/useDirection"

/**
 * Copy button component for individual commands.
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
  readonly category: string | "All"
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
  /** Label for the "from" tool (left column) */
  readonly fromLabel?: string
  /** Label for the "to" tool (right column) */
  readonly toLabel?: string
}

/**
 * GlossaryClient component.
 *
 * Renders an interactive glossary with search and category filtering.
 * Supports direction reversal via useDirection hook to swap which tool appears on which side.
 */
export function GlossaryClient({
  entries,
  toolPair: _toolPair,
  fromLabel = "git",
  toLabel = "jj",
}: GlossaryClientProps): React.JSX.Element {
  const { query, setQuery, category, setCategory, filteredEntries, resultCount } =
    useGlossarySearch(entries)

  // Get direction preference for column ordering
  const { isReversed } = useDirection()

  // When reversed, swap which labels appear in left vs right columns
  // Colors follow semantic meaning: left column = orange (accent-alt), right column = green (accent)
  const leftLabel = isReversed ? toLabel : fromLabel
  const rightLabel = isReversed ? fromLabel : toLabel

  // Extract unique categories from entries
  const categories = React.useMemo(() => {
    const uniqueCategories = new Set<string>()
    for (const entry of entries) {
      uniqueCategories.add(entry.category)
    }
    return Array.from(uniqueCategories).sort()
  }, [entries])

  return (
    <div>
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
          <div className="overflow-x-auto">
            {/* Table header */}
            <div className="grid grid-cols-2 gap-4 border-b border-[var(--color-border)] bg-[var(--color-bg)] px-6 py-3">
              <div className="text-xs font-mono font-medium uppercase tracking-wide text-[var(--color-accent-alt)]">
                {leftLabel}
              </div>
              <div className="text-xs font-mono font-medium uppercase tracking-wide text-[var(--color-accent)]">
                {rightLabel}
              </div>
            </div>

            {/* Command rows - swap commands based on direction */}
            {filteredEntries.map((entry) => {
              // When reversed, swap which command appears in which column
              const leftCommand = isReversed ? entry.toCommand : entry.fromCommand
              const rightCommand = isReversed ? entry.fromCommand : entry.toCommand

              return (
                <div
                  key={entry.id}
                  className="grid grid-cols-2 gap-4 border-b border-[var(--color-border)] px-6 py-3 last:border-b-0 hover:bg-[var(--color-surface-hover)] transition-colors duration-[var(--transition-fast)]"
                >
                  <div className="flex items-center">
                    <code className="text-sm font-mono text-[var(--color-accent-alt)]">
                      {leftCommand}
                    </code>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <code className="text-sm font-mono text-[var(--color-accent)]">
                        {rightCommand}
                      </code>
                      {entry.note && (
                        <span className="text-xs text-[var(--color-text-muted)] italic hidden sm:inline">
                          ({entry.note})
                        </span>
                      )}
                    </div>
                    <CopyButton text={rightCommand} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
