/**
 * Search data loader for TerminalSearch.
 *
 * Dynamically builds searchable steps from pairings and step metadata arrays.
 * This replaces the hardcoded SEARCHABLE_STEPS array in TerminalSearch.tsx.
 *
 * @example
 * ```ts
 * import { getSearchableSteps } from "./lib/search-data"
 *
 * const steps = getSearchableSteps()
 * // Returns readonly SearchableStep[] for all published pairings
 * ```
 */

import { getPublishedEntries, isPairing, isTutorial } from "../content/pairings"

/**
 * Searchable step data for TerminalSearch.
 */
export interface SearchableStep {
  readonly toolPair: string
  readonly toName: string
  readonly fromName: string
  readonly step: number
  readonly title: string
  readonly description: string
  readonly tags?: readonly string[]
}

/**
 * Step metadata arrays for each pairing.
 *
 * These are centralized here to avoid duplication across multiple files.
 * Source: app/[toolPair]/page.tsx
 */
const STEPS_BY_PAIRING = {
  "jj-git": [
    {
      step: 1,
      title: "Installation & Setup",
      description: "Installing jj, colocated repos",
      slug: "01-step",
    },
    {
      step: 2,
      title: "Mental Model",
      description: "Working copy as commit, no staging",
      slug: "02-step",
    },
    { step: 3, title: "Creating Commits", description: "jj describe, jj new", slug: "03-step" },
    { step: 4, title: "Viewing History", description: "jj log, revsets basics", slug: "04-step" },
    {
      step: 5,
      title: "Navigating Commits",
      description: "jj edit, jj new <parent>",
      slug: "05-step",
    },
    { step: 6, title: "Amending & Squashing", description: "jj squash, jj split", slug: "06-step" },
    { step: 7, title: "Bookmarks", description: "Bookmarks replace branches", slug: "07-step" },
    { step: 8, title: "Handling Conflicts", description: "First-class conflicts", slug: "08-step" },
    { step: 9, title: "Rebasing", description: "Automatic descendant rebasing", slug: "09-step" },
    { step: 10, title: "Undo & Recovery", description: "jj undo, jj op log", slug: "10-step" },
    { step: 11, title: "Working with Remotes", description: "jj git push/fetch", slug: "11-step" },
    { step: 12, title: "Revsets", description: "Advanced commit selection", slug: "12-step" },
  ] as const,

  "zio-cats": [
    { step: 1, title: "R/E/A Signature", description: "IO type vs ZIO's R/E/A", slug: "01-step" },
    {
      step: 2,
      title: "Creating Effects",
      description: "IO.pure, IO.delay, IO.async",
      slug: "02-step",
    },
    {
      step: 3,
      title: "Error Handling",
      description: "MonadError, handleErrorWith",
      slug: "03-step",
    },
    {
      step: 4,
      title: "Map/FlatMap Purity",
      description: "Effect composition basics",
      slug: "04-step",
    },
    {
      step: 5,
      title: "Tagless Final vs ZLayer",
      description: "Dependency injection patterns",
      slug: "05-step",
    },
    {
      step: 6,
      title: "Resource Management",
      description: "Resource, bracket, use",
      slug: "06-step",
    },
    {
      step: 7,
      title: "Fiber Supervision",
      description: "Concurrent effects, supervision",
      slug: "07-step",
    },
    { step: 8, title: "Streaming", description: "fs2 vs ZStream", slug: "08-step" },
    {
      step: 9,
      title: "Application Structure",
      description: "IOApp, main entry point",
      slug: "09-step",
    },
    { step: 10, title: "Interop", description: "ZIO-CE interop, migration", slug: "10-step" },
    { step: 11, title: "STM", description: "Software Transactional Memory", slug: "11-step" },
    {
      step: 12,
      title: "Concurrent Structures",
      description: "Ref, Queue, Hub, Semaphore",
      slug: "12-step",
    },
    { step: 13, title: "Configuration", description: "ZIO Config vs Ciris", slug: "13-step" },
    { step: 14, title: "HTTP", description: "ZIO HTTP vs http4s", slug: "14-step" },
    { step: 15, title: "Database", description: "ZIO JDBC vs Doobie/Skunk", slug: "15-step" },
  ] as const,

  "effect-zio": [
    {
      step: 1,
      title: "Effect<A, E, R> vs ZIO[-R, +E, +A]",
      description: "Type parameter order difference",
      slug: "01-step",
    },
    {
      step: 2,
      title: "Creating Effects",
      description: "Effect.succeed, Effect.fail",
      slug: "02-step",
    },
    { step: 3, title: "Error Handling", description: "Typed errors and defects", slug: "03-step" },
    {
      step: 4,
      title: "Composition with Generators",
      description: "Effect.gen vs for-comprehension",
      slug: "04-step",
    },
    {
      step: 5,
      title: "Services and Context.Tag",
      description: "Dependency injection patterns",
      slug: "05-step",
    },
    { step: 6, title: "Layers", description: "Layer.succeed, Layer.provide", slug: "06-step" },
    {
      step: 7,
      title: "Resource Management",
      description: "Effect.acquireRelease, Scope",
      slug: "07-step",
    },
    {
      step: 8,
      title: "Fibers and Forking",
      description: "Effect.fork, Fiber.join",
      slug: "08-step",
    },
    {
      step: 9,
      title: "Concurrent Combinators",
      description: "Effect.all, Effect.race",
      slug: "09-step",
    },
    {
      step: 10,
      title: "Ref and Concurrent State",
      description: "Ref.make, Ref.update",
      slug: "10-step",
    },
    { step: 11, title: "STM", description: "Software Transactional Memory", slug: "11-step" },
    {
      step: 12,
      title: "Streaming",
      description: "Stream transformations and Sinks",
      slug: "12-step",
    },
    {
      step: 13,
      title: "Schema (Validation)",
      description: "Schema<A,I,R>, decode/encode",
      slug: "13-step",
    },
    {
      step: 14,
      title: "Platform & HTTP",
      description: "HttpClient, cross-platform abstractions",
      slug: "14-step",
    },
    { step: 15, title: "Database Access", description: "@effect/sql, SqlClient", slug: "15-step" },
  ] as const,

  tmux: [
    {
      step: 1,
      title: "What is tmux?",
      description: "Terminal multiplexer basics",
      slug: "01-step",
    },
    {
      step: 2,
      title: "Sessions",
      description: "Create, list, attach, detach",
      slug: "02-step",
    },
    {
      step: 3,
      title: "Windows",
      description: "Create, navigate, rename",
      slug: "03-step",
    },
    {
      step: 4,
      title: "Panes",
      description: "Split vertical/horizontal",
      slug: "04-step",
    },
    {
      step: 5,
      title: "Key Bindings",
      description: "Prefix key, list bindings",
      slug: "05-step",
    },
    {
      step: 6,
      title: "Copy Mode",
      description: "Navigate, search, copy",
      slug: "06-step",
    },
    {
      step: 7,
      title: "Configuration",
      description: ".tmux.conf, options",
      slug: "07-step",
    },
    {
      step: 8,
      title: "Session Management",
      description: "Multiple sessions, scripting",
      slug: "08-step",
    },
  ] as const,
} as const

/**
 * Get all searchable steps for published entries (pairings and tutorials).
 *
 * Combines entry metadata (from pairings.ts) with step metadata arrays
 * to build the search index for TerminalSearch.
 *
 * @returns Readonly array of searchable steps with tool pair, names, and tags.
 */
export function getSearchableSteps(): readonly SearchableStep[] {
  const steps: SearchableStep[] = []

  for (const entry of getPublishedEntries()) {
    // Get step metadata for this entry
    const entrySteps = STEPS_BY_PAIRING[entry.slug as keyof typeof STEPS_BY_PAIRING]
    if (!entrySteps) {
      continue
    }

    // Build searchable steps with entry metadata
    for (const step of entrySteps) {
      let baseStep: SearchableStep

      if (isPairing(entry)) {
        // Pairing mode: X if you know Y (e.g., "jj ← git")
        baseStep = {
          toolPair: entry.slug,
          toName: entry.to.name,
          fromName: entry.from.name,
          step: step.step,
          title: step.title,
          description: step.description,
        }
        // Only add tags if defined (exactOptionalPropertyTypes: true)
        steps.push(entry.tags ? { ...baseStep, tags: entry.tags } : baseStep)
      } else if (isTutorial(entry)) {
        // Tutorial mode: Learn X (e.g., "tmux" with empty fromName)
        baseStep = {
          toolPair: entry.slug,
          toName: entry.tool.name,
          fromName: "", // Tutorials have no source tool
          step: step.step,
          title: step.title,
          description: step.description,
        }
        // Only add tags if defined (exactOptionalPropertyTypes: true)
        steps.push(entry.tags ? { ...baseStep, tags: entry.tags } : baseStep)
      }
    }
  }

  return steps
}

/**
 * Get searchable steps for a specific entry (pairing or tutorial).
 *
 * @param toolPair - The entry slug (e.g., "jj-git", "zio-cats", "effect-zio", "tmux").
 * @returns Readonly array of searchable steps for the entry, or empty array if not found.
 */
export function getSearchableStepsForPairing(toolPair: string): readonly SearchableStep[] {
  const entry = getPublishedEntries().find((e) => e.slug === toolPair)
  if (!entry) {
    return []
  }

  const entrySteps = STEPS_BY_PAIRING[toolPair as keyof typeof STEPS_BY_PAIRING]
  if (!entrySteps) {
    return []
  }

  return entrySteps.map((step) => {
    let baseStep: SearchableStep

    if (isPairing(entry)) {
      // Pairing mode: X if you know Y
      baseStep = {
        toolPair: entry.slug,
        toName: entry.to.name,
        fromName: entry.from.name,
        step: step.step,
        title: step.title,
        description: step.description,
      }
      return entry.tags ? { ...baseStep, tags: entry.tags } : baseStep
    }
    // Tutorial mode: Learn X (no fromName)
    baseStep = {
      toolPair: entry.slug,
      toName: entry.tool.name,
      fromName: "",
      step: step.step,
      title: step.title,
      description: step.description,
    }
    return entry.tags ? { ...baseStep, tags: entry.tags } : baseStep
  })
}
