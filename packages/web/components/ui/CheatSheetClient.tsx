/**
 * CheatSheetClient - Searchable cheat sheet component with category filtering.
 *
 * Features:
 * - Client-side component for interactive search and filtering
 * - Category filter tabs (All + dynamic categories)
 * - Debounced search input with aria-live result announcements
 * - Single-column table with command + description
 * - Copy button for each command
 * - Responsive: horizontal scroll on mobile
 * - Empty state for no results
 * - No direction toggle (single-tool, not a comparison)
 *
 * @example
 * ```tsx
 * import { CheatSheetClient } from "@/components/ui/CheatSheetClient"
 *
 * <CheatSheetClient entries={tmuxCheatSheet} toolPair="tmux" />
 * ```
 */

"use client"

import React from "react"
import type { CheatSheetEntry } from "../../content/glossary/types"

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
 * Props for CheatSheetClient component.
 */
export interface CheatSheetClientProps {
  /** The cheat sheet entries to display */
  readonly entries: readonly CheatSheetEntry[]
  /** The tool/tutorial slug */
  readonly toolPair: string
}

/**
 * Search function for cheat sheet entries.
 */
function searchEntries(entries: readonly CheatSheetEntry[], query: string): readonly CheatSheetEntry[] {
  if (!query) {
    return entries
  }

  const lowerQuery = query.toLowerCase()

  return entries.filter(
    (entry) =>
      entry.command.toLowerCase().includes(lowerQuery) ||
      entry.description.toLowerCase().includes(lowerQuery) ||
      (entry.note?.toLowerCase().includes(lowerQuery)),
  )
}

/**
 * Filter by category function.
 */
function filterByCategory(
  entries: readonly CheatSheetEntry[],
  category: string,
): readonly CheatSheetEntry[] {
  return entries.filter((entry) => entry.category === category)
}

/**
 * React hook for searching and filtering cheat sheet entries.
 *
 * Features:
 * - Debounced search input (300ms) for performance
 * - Category filtering (All or specific category)
 * - Returns filtered entries and count
 * - Memoized results to prevent unnecessary re-renders
 */
function useCheatSheetSearch(entries: readonly CheatSheetEntry[]) {
  const [query, setQuery] = React.useState("")
  const [debouncedQuery, setDebouncedQuery] = React.useState("")
  const [category, setCategory] = React.useState<string | "All">("All")

  // Debounce search query (300ms)
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query)
    }, 300)

    return () => {
      clearTimeout(timer)
    }
  }, [query])

  // Memoized filtered entries
  const filteredEntries = React.useMemo(() => {
    let results = entries

    // Filter by category first
    if (category !== "All") {
      results = filterByCategory(results, category)
    }

    // Then search by query
    if (debouncedQuery) {
      results = searchEntries(results, debouncedQuery)
    }

    return results
  }, [entries, category, debouncedQuery])

  const resultCount = filteredEntries.length

  return {
    query,
    setQuery,
    category,
    setCategory,
    filteredEntries,
    resultCount,
  }
}

/**
 * CheatSheetClient component.
 *
 * Renders an interactive cheat sheet with search and category filtering.
 * Single-column layout for single-tool tutorials (not comparisons).
 */
export function CheatSheetClient({
  entries,
  toolPair: _toolPair,
}: CheatSheetClientProps): React.JSX.Element {
  const { query, setQuery, category, setCategory, filteredEntries, resultCount } =
    useCheatSheetSearch(entries)

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
        <label htmlFor="cheat-sheet-search" className="sr-only">
          Search commands
        </label>
        <input
          id="cheat-sheet-search"
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search commands... (e.g., 'session', 'pane')"
          className={[
            "w-full px-4 py-3 bg-[var(--color-surface)] border border-[var(--color-border)]",
            "text-[var(--color-text)] placeholder:text-[var(--color-text-dim)]",
            "font-mono text-sm rounded-md",
            "focus:outline-none focus-visible:ring-[var(--focus-ring)] focus:border-[var(--color-accent)]",
            "transition-colors duration-[var(--transition-fast)]",
          ].join(" ")}
          aria-describedby="cheat-sheet-results-count"
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
          id="cheat-sheet-results-count"
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
          {/* Command rows */}
          {filteredEntries.map((entry) => (
            <div
              key={entry.id}
              className="border-b border-[var(--color-border)] px-6 py-4 last:border-b-0 hover:bg-[var(--color-surface-hover)] transition-colors duration-[var(--transition-fast)]"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  {/* Command with copy button */}
                  <div className="flex items-center gap-2 mb-1">
                    <code className="text-sm font-mono text-[var(--color-accent)] break-all">
                      {entry.command}
                    </code>
                    <CopyButton text={entry.command} />
                  </div>
                  {/* Description */}
                  <p className="text-sm text-[var(--color-text)]">{entry.description}</p>
                  {/* Optional note */}
                  {entry.note && (
                    <p className="mt-1 text-xs text-[var(--color-text-muted)] italic">
                      ({entry.note})
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
