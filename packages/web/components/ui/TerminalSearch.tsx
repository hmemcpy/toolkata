"use client"

import Link from "next/link"
import { useCallback, useEffect, useRef, useState } from "react"
import type { SearchableStep } from "../../lib/search-data"
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
      ? (() => {
          // Filter matching steps
          const matches = SEARCHABLE_STEPS.filter((step) => {
            const tags = step.tags?.join(" ") ?? ""
            const searchText =
              `${step.title} ${step.description} ${step.toName} ${step.fromName} ${tags}`.toLowerCase()
            return searchText.includes(query.toLowerCase())
          })

          // Group by tool pair for diversity
          const byPairing = new Map<string, SearchableStep[]>()
          for (const step of matches) {
            const existing = byPairing.get(step.toolPair) ?? []
            byPairing.set(step.toolPair, [...existing, step])
          }

          // Round-robin through pairings, max 2 per pairing
          const diverse: SearchableStep[] = []
          const pairingKeys = Array.from(byPairing.keys())
          const maxPerPairing = 2
          const maxResults = 6

          // Track how many steps we've taken from each pairing
          const takenFromPairing = new Map<string, number>()
          for (const key of pairingKeys) {
            takenFromPairing.set(key, 0)
          }

          for (let round = 0; round < maxPerPairing; round++) {
            for (const pairingKey of pairingKeys) {
              if (diverse.length >= maxResults) break

              const steps = byPairing.get(pairingKey)
              if (!steps) continue

              const taken = takenFromPairing.get(pairingKey) ?? 0
              if (taken < steps.length) {
                const step = steps[taken]
                if (step) {
                  diverse.push(step)
                  takenFromPairing.set(pairingKey, taken + 1)
                }
              }
            }
            if (diverse.length >= maxResults) break
          }

          return diverse
        })()
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
    <div ref={containerRef} className="relative inline-block w-full max-w-md">
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
                  {result.fromName ? `${result.toName} ← ${result.fromName}` : result.toName}
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
