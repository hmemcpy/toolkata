"use client"

import Link from "next/link"
import { useCallback, useEffect, useRef, useState } from "react"

/**
 * Searchable step data.
 */
interface SearchableStep {
  readonly toolPair: string
  readonly toName: string
  readonly fromName: string
  readonly step: number
  readonly title: string
  readonly description: string
}

/**
 * All searchable steps data.
 * TODO: Load this dynamically from content service.
 */
const SEARCHABLE_STEPS: readonly SearchableStep[] = [
  // jj-git steps (12 steps)
  {
    toolPair: "jj-git",
    toName: "jj",
    fromName: "git",
    step: 1,
    title: "Installation & Setup",
    description: "Installing jj, colocated repos",
  },
  {
    toolPair: "jj-git",
    toName: "jj",
    fromName: "git",
    step: 2,
    title: "Mental Model",
    description: "Working copy as commit, no staging",
  },
  {
    toolPair: "jj-git",
    toName: "jj",
    fromName: "git",
    step: 3,
    title: "Creating Commits",
    description: "jj describe, jj new",
  },
  {
    toolPair: "jj-git",
    toName: "jj",
    fromName: "git",
    step: 4,
    title: "Viewing History",
    description: "jj log, revsets basics",
  },
  {
    toolPair: "jj-git",
    toName: "jj",
    fromName: "git",
    step: 5,
    title: "Navigating Commits",
    description: "jj edit, jj new <parent>",
  },
  {
    toolPair: "jj-git",
    toName: "jj",
    fromName: "git",
    step: 6,
    title: "Amending & Squashing",
    description: "jj squash, jj split",
  },
  {
    toolPair: "jj-git",
    toName: "jj",
    fromName: "git",
    step: 7,
    title: "Bookmarks",
    description: "Bookmarks replace branches",
  },
  {
    toolPair: "jj-git",
    toName: "jj",
    fromName: "git",
    step: 8,
    title: "Handling Conflicts",
    description: "First-class conflicts",
  },
  {
    toolPair: "jj-git",
    toName: "jj",
    fromName: "git",
    step: 9,
    title: "Rebasing",
    description: "Automatic descendant rebasing",
  },
  {
    toolPair: "jj-git",
    toName: "jj",
    fromName: "git",
    step: 10,
    title: "Undo & Recovery",
    description: "jj undo, jj op log",
  },
  {
    toolPair: "jj-git",
    toName: "jj",
    fromName: "git",
    step: 11,
    title: "Working with Remotes",
    description: "jj git push/fetch",
  },
  {
    toolPair: "jj-git",
    toName: "jj",
    fromName: "git",
    step: 12,
    title: "Revsets",
    description: "Advanced commit selection",
  },
  // zio-cats steps (15 steps)
  {
    toolPair: "zio-cats",
    toName: "cats-effect",
    fromName: "zio",
    step: 1,
    title: "R/E/A Signature",
    description: "IO type vs ZIO's R/E/A",
  },
  {
    toolPair: "zio-cats",
    toName: "cats-effect",
    fromName: "zio",
    step: 2,
    title: "Creating Effects",
    description: "IO.pure, IO.delay, IO.async",
  },
  {
    toolPair: "zio-cats",
    toName: "cats-effect",
    fromName: "zio",
    step: 3,
    title: "Error Handling",
    description: "MonadError, handleErrorWith",
  },
  {
    toolPair: "zio-cats",
    toName: "cats-effect",
    fromName: "zio",
    step: 4,
    title: "Map/FlatMap Purity",
    description: "Effect composition basics",
  },
  {
    toolPair: "zio-cats",
    toName: "cats-effect",
    fromName: "zio",
    step: 5,
    title: "Tagless Final vs ZLayer",
    description: "Dependency injection patterns",
  },
  {
    toolPair: "zio-cats",
    toName: "cats-effect",
    fromName: "zio",
    step: 6,
    title: "Resource Management",
    description: "Resource, bracket, use",
  },
  {
    toolPair: "zio-cats",
    toName: "cats-effect",
    fromName: "zio",
    step: 7,
    title: "Fiber Supervision",
    description: "Concurrent effects, supervision",
  },
  {
    toolPair: "zio-cats",
    toName: "cats-effect",
    fromName: "zio",
    step: 8,
    title: "Streaming",
    description: "fs2 vs ZStream",
  },
  {
    toolPair: "zio-cats",
    toName: "cats-effect",
    fromName: "zio",
    step: 9,
    title: "Application Structure",
    description: "IOApp, main entry point",
  },
  {
    toolPair: "zio-cats",
    toName: "cats-effect",
    fromName: "zio",
    step: 10,
    title: "Interop",
    description: "ZIO-CE interop, migration",
  },
  {
    toolPair: "zio-cats",
    toName: "cats-effect",
    fromName: "zio",
    step: 11,
    title: "STM",
    description: "Software Transactional Memory",
  },
  {
    toolPair: "zio-cats",
    toName: "cats-effect",
    fromName: "zio",
    step: 12,
    title: "Concurrent Structures",
    description: "Ref, Queue, Hub, Semaphore",
  },
  {
    toolPair: "zio-cats",
    toName: "cats-effect",
    fromName: "zio",
    step: 13,
    title: "Configuration",
    description: "ZIO Config vs Ciris",
  },
  {
    toolPair: "zio-cats",
    toName: "cats-effect",
    fromName: "zio",
    step: 14,
    title: "HTTP",
    description: "ZIO HTTP vs http4s",
  },
  {
    toolPair: "zio-cats",
    toName: "cats-effect",
    fromName: "zio",
    step: 15,
    title: "Database",
    description: "ZIO JDBC vs Doobie/Skunk",
  },
  // effect-zio steps (15 steps)
  {
    toolPair: "effect-zio",
    toName: "effect",
    fromName: "zio",
    step: 1,
    title: "Effect<A, E, R> vs ZIO[-R, +E, +A]",
    description: "Type parameter order difference",
  },
  {
    toolPair: "effect-zio",
    toName: "effect",
    fromName: "zio",
    step: 2,
    title: "Creating Effects",
    description: "Effect.succeed, Effect.fail",
  },
  {
    toolPair: "effect-zio",
    toName: "effect",
    fromName: "zio",
    step: 3,
    title: "Error Handling",
    description: "Typed errors and defects",
  },
  {
    toolPair: "effect-zio",
    toName: "effect",
    fromName: "zio",
    step: 4,
    title: "Composition with Generators",
    description: "Effect.gen vs for-comprehension",
  },
  {
    toolPair: "effect-zio",
    toName: "effect",
    fromName: "zio",
    step: 5,
    title: "Services and Context.Tag",
    description: "Dependency injection patterns",
  },
  {
    toolPair: "effect-zio",
    toName: "effect",
    fromName: "zio",
    step: 6,
    title: "Layers",
    description: "Layer.succeed, Layer.provide",
  },
  {
    toolPair: "effect-zio",
    toName: "effect",
    fromName: "zio",
    step: 7,
    title: "Resource Management",
    description: "Effect.acquireRelease, Scope",
  },
  {
    toolPair: "effect-zio",
    toName: "effect",
    fromName: "zio",
    step: 8,
    title: "Fibers and Forking",
    description: "Effect.fork, Fiber.join",
  },
  {
    toolPair: "effect-zio",
    toName: "effect",
    fromName: "zio",
    step: 9,
    title: "Concurrent Combinators",
    description: "Effect.all, Effect.race",
  },
  {
    toolPair: "effect-zio",
    toName: "effect",
    fromName: "zio",
    step: 10,
    title: "Ref and Concurrent State",
    description: "Ref.make, Ref.update",
  },
  {
    toolPair: "effect-zio",
    toName: "effect",
    fromName: "zio",
    step: 11,
    title: "STM",
    description: "Software Transactional Memory",
  },
  {
    toolPair: "effect-zio",
    toName: "effect",
    fromName: "zio",
    step: 12,
    title: "Streaming",
    description: "Stream transformations and Sinks",
  },
  {
    toolPair: "effect-zio",
    toName: "effect",
    fromName: "zio",
    step: 13,
    title: "Schema (Validation)",
    description: "Schema<A,I,R>, decode/encode",
  },
  {
    toolPair: "effect-zio",
    toName: "effect",
    fromName: "zio",
    step: 14,
    title: "Platform & HTTP",
    description: "HttpClient, cross-platform abstractions",
  },
  {
    toolPair: "effect-zio",
    toName: "effect",
    fromName: "zio",
    step: 15,
    title: "Database Access",
    description: "@effect/sql, SqlClient",
  },
]

export function TerminalSearch() {
  const [query, setQuery] = useState("")
  const [isOpen, setIsOpen] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const results =
    query.length > 0
      ? SEARCHABLE_STEPS.filter((step) => {
          const searchText =
            `${step.title} ${step.description} ${step.toName} ${step.fromName}`.toLowerCase()
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
