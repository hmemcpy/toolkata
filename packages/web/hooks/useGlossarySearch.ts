import { useEffect, useMemo, useState } from "react"
import type { GlossaryCategory, GlossaryEntry } from "../content/glossary/jj-git"
import { searchEntries, filterByCategory } from "../content/glossary/jj-git"

/**
 * Return type for useGlossarySearch hook.
 */
export interface GlossarySearchState {
  readonly query: string
  readonly setQuery: (query: string) => void
  readonly category: GlossaryCategory | "All"
  readonly setCategory: (category: GlossaryCategory | "All") => void
  readonly filteredEntries: readonly GlossaryEntry[]
  readonly resultCount: number
}

/**
 * React hook for searching and filtering glossary entries.
 *
 * Features:
 * - Debounced search input (300ms) for performance
 * - Category filtering (All or specific category)
 * - Returns filtered entries and count
 * - Memoized results to prevent unnecessary re-renders
 *
 * @param entries - The glossary entries to search/filter
 *
 * @example
 * ```tsx
 * const { query, setQuery, category, setCategory, filteredEntries, resultCount } = useGlossarySearch(jjGitGlossary)
 *
 * return (
 *   <>
 *     <input value={query} onChange={(e) => setQuery(e.target.value)} />
 *     <button onClick={() => setCategory("COMMITS")}>Commits</button>
 *     <div>Found {resultCount} commands</div>
 *   </>
 * )
 * ```
 */
export function useGlossarySearch(entries: readonly GlossaryEntry[]): GlossarySearchState {
  const [query, setQuery] = useState("")
  const [debouncedQuery, setDebouncedQuery] = useState("")
  const [category, setCategory] = useState<GlossaryCategory | "All">("All")

  // Debounce search query (300ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query)
    }, 300)

    return () => {
      clearTimeout(timer)
    }
  }, [query])

  // Memoized filtered entries
  const filteredEntries = useMemo(() => {
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
