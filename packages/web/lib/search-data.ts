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

import { toolPairings } from "../content/pairings"

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
} as const

/**
 * Get all searchable steps for published pairings.
 *
 * Combines pairing metadata (from pairings.ts) with step metadata arrays
 * to build the search index for TerminalSearch.
 *
 * @returns Readonly array of searchable steps with tool pair, names, and tags.
 */
export function getSearchableSteps(): readonly SearchableStep[] {
  const steps: SearchableStep[] = []

  for (const pairing of toolPairings) {
    // Only include published pairings in search
    if (pairing.status !== "published") {
      continue
    }

    // Get step metadata for this pairing
    const pairingSteps = STEPS_BY_PAIRING[pairing.slug as keyof typeof STEPS_BY_PAIRING]
    if (!pairingSteps) {
      continue
    }

    // Build searchable steps with pairing metadata
    for (const step of pairingSteps) {
      steps.push({
        toolPair: pairing.slug,
        toName: pairing.to.name,
        fromName: pairing.from.name,
        step: step.step,
        title: step.title,
        description: step.description,
        tags: pairing.tags,
      })
    }
  }

  return steps
}

/**
 * Get searchable steps for a specific tool pairing.
 *
 * @param toolPair - The tool pairing slug (e.g., "jj-git", "zio-cats", "effect-zio").
 * @returns Readonly array of searchable steps for the pairing, or empty array if not found.
 */
export function getSearchableStepsForPairing(toolPair: string): readonly SearchableStep[] {
  const pairing = toolPairings.find((p) => p.slug === toolPair)
  if (!pairing || pairing.status !== "published") {
    return []
  }

  const pairingSteps = STEPS_BY_PAIRING[toolPair as keyof typeof STEPS_BY_PAIRING]
  if (!pairingSteps) {
    return []
  }

  return pairingSteps.map((step) => ({
    toolPair: pairing.slug,
    toName: pairing.to.name,
    fromName: pairing.from.name,
    step: step.step,
    title: step.title,
    description: step.description,
    tags: pairing.tags,
  }))
}
