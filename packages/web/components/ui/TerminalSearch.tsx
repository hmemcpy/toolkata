"use client"

import Link from "next/link"
import { useCallback, useEffect, useRef, useState } from "react"
import { getSearchableSteps } from "../../lib/search-data"

/**
 * TerminalSearch component.
 *
 * Provides keyboard-driven search across all tutorial steps.
 * Results include title, description, tool pair names, and tags.
 *
 * Features:
 * - Keyboard navigation (arrows, enter, escape)
 * - Searches across title, description, tool names, and tags
 * - Shows top 6 results
 * - Click outside to close
 */
export function TerminalSearch() {
  const [query, setQuery] = useState("")
  const [isOpen, setIsOpen] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Load searchable steps dynamically from pairings + step metadata
  const SEARCHABLE_STEPS = getSearchableSteps()

  const results =
    query.length > 0
      ? SEARCHABLE_STEPS.filter((step) => {
          // Search across title, description, tool names, and tags
          const tags = step.tags?.join(" ") ?? ""
          const searchText = `${step.title} ${step.description} ${step.toName} ${step.fromName} ${tags}`.toLowerCase()
          return searchText.includes(query.toLowerCase())
        }).slice(0, 6)
      : []

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault()
        setSelectedIndex((prev) => Math.min(prev + 1, results.length - 1))
      } else if (e.key === "ArrowUp") {
        e.preventDefault()
        setSelectedIndex((prev) => Math.max(prev - 1, 0))
      } else if (e.key === "Enter" && results[selectedIndex]) {
        e.preventDefault()
        const result = results[selectedIndex]
        window.location.href = `/${result.toolPair}/${result.step}`
      } else if (e.key === "Escape") {
        setIsOpen(false)
        setQuery("")
        inputRef.current?.blur()
      }
    },
    [results, selectedIndex],
  )

  // Auto-focus input on mount
  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const showPlaceholder = query.length === 0 && !isOpen

  return (
    <div ref={containerRef} className="relative">
      <div className="flex items-center">
        <span className="text-[var(--color-accent)]">$</span>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setSelectedIndex(0)
            setIsOpen(true)
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          className="flex-1 bg-transparent font-mono text-sm sm:text-base text-[var(--color-text)] outline-none ml-2"
          style={{ boxShadow: "none" }}
          aria-label="Search lessons"
        />
        {showPlaceholder && (
          <span className="absolute left-5 text-[#555] font-mono text-sm sm:text-base pointer-events-none">
            # type to search, or scroll down
          </span>
        )}
        {query.length > 0 && (
          <span className="text-[var(--color-text-dim)]" style={{ animation: "blink 1s infinite" }}>
            _
          </span>
        )}
      </div>

      {/* Results dropdown */}
      {isOpen && results.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-[var(--color-surface)] border border-[var(--color-border)] rounded shadow-lg z-50 overflow-hidden">
          {results.map((result, index) => (
            <Link
              key={`${result.toolPair}-${result.step}`}
              href={`/${result.toolPair}/${result.step}`}
              className={`block px-3 py-2 font-mono text-sm transition-colors ${
                index === selectedIndex
                  ? "bg-[var(--color-surface-hover)] text-white"
                  : "text-[var(--color-text-muted)] hover:bg-[var(--color-surface-hover)] hover:text-white"
              }`}
              onClick={() => {
                setIsOpen(false)
                setQuery("")
              }}
            >
              <span className="flex items-center justify-between">
                <span>
                  <span className="text-[var(--color-accent)]">{result.step}.</span> {result.title}
                </span>
                <span className="text-xs text-[var(--color-text-dim)]">
                  {result.toName} ← {result.fromName}
                </span>
              </span>
              <span className="block text-xs text-[var(--color-text-dim)] mt-0.5">
                {result.description}
              </span>
            </Link>
          ))}
        </div>
      )}

      {/* No results message */}
      {isOpen && query.length > 0 && results.length === 0 && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-[var(--color-surface)] border border-[var(--color-border)] rounded shadow-lg z-50 px-3 py-2">
          <span className="font-mono text-sm text-[var(--color-text-dim)]">no matches found</span>
        </div>
      )}
    </div>
  )
}
