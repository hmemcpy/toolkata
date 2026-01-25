/**
 * Glossary data module for Cats Effect ← ZIO API reference.
 *
 * Shared data source for both the cheatsheet page and the future glossary page.
 * Provides search, filtering, and category grouping capabilities.
 *
 * @module
 */

import type { GlossaryEntry as SharedGlossaryEntry } from "./types"

/**
 * Glossary category types for API groupings.
 */
export type GlossaryCategory =
  | "BASICS"
  | "ERRORS"
  | "DEPENDENCIES"
  | "CONCURRENCY"
  | "STREAMING"
  | "RUNTIME"
  | "INTEROP"

/**
 * Single glossary entry for API mapping.
 *
 * Contains the source API, target API, optional note,
 * and category for grouping.
 */
export interface GlossaryEntry extends SharedGlossaryEntry {
  /** Category grouping for this entry */
  readonly category: GlossaryCategory
}

/**
 * Complete glossary data for Cats Effect ← ZIO comparison.
 *
 * API mappings organized by functional category with notes
 * for important differences.
 */
export const catsEffectZioGlossary: readonly GlossaryEntry[] = [
  // BASICS
  {
    id: "basics-1",
    category: "BASICS",
    fromCommand: "ZIO.succeed(a)",
    toCommand: "IO.pure(a)",
    note: "Lift pure value into effect",
  },
  {
    id: "basics-2",
    category: "BASICS",
    fromCommand: "ZIO.fail(e)",
    toCommand: "IO.raiseError(e)",
    note: "Lift error into effect",
  },
  {
    id: "basics-3",
    category: "BASICS",
    fromCommand: "ZIO.effect(thunk)",
    toCommand: "IO.delay(thunk)",
    note: "Suspend side effect",
  },
  {
    id: "basics-4",
    category: "BASICS",
    fromCommand: "ZIO.attempt(thunk)",
    toCommand: "IO.blocking(thunk)",
    note: "May throw, blocking",
  },
  {
    id: "basics-5",
    category: "BASICS",
    fromCommand: "UIO[A]",
    toCommand: "IO[A]",
    note: "No error type (Nothing)",
  },
  {
    id: "basics-6",
    category: "BASICS",
    fromCommand: "ZIO.fromEither(e)",
    toCommand: "IO.fromEither(e)",
    note: "From Either",
  },
  {
    id: "basics-7",
    category: "BASICS",
    fromCommand: "ZIO.fromOption(o)",
    toCommand: "IO.fromOption(o)",
    note: "From Option",
  },
  // ERRORS
  {
    id: "errors-1",
    category: "ERRORS",
    fromCommand: "effect.catchAll(f)",
    toCommand: "effect.handleErrorWith(f)",
    note: "Recover from error",
  },
  {
    id: "errors-2",
    category: "ERRORS",
    fromCommand: "effect.orElse(fallback)",
    toCommand: "effect.handleErrorWith(_ => fallback)",
    note: "Fallback on error",
  },
  {
    id: "errors-3",
    category: "ERRORS",
    fromCommand: "effect.mapError(f)",
    toCommand: "effect.adaptError(f)",
    note: "Transform error",
  },
  {
    id: "errors-4",
    category: "ERRORS",
    fromCommand: "effect.retry(schedule)",
    toCommand: "effect.timeout + handleError",
    note: "Manual retries in CE",
  },
  {
    id: "errors-5",
    category: "ERRORS",
    fromCommand: "ZIO.collectAll(list)",
    toCommand: "list.sequence",
    note: "Sequence effects",
  },
  // DEPENDENCIES
  {
    id: "deps-1",
    category: "DEPENDENCIES",
    fromCommand: "ZLayer.succeed(service)",
    toCommand: "Resource.pure(service)",
    note: "Create dependency",
  },
  {
    id: "deps-2",
    category: "DEPENDENCIES",
    fromCommand: "effect.provideLayer(layer)",
    toCommand: "Kleisli.run(effect)(service)",
    note: "Inject dependency",
  },
  {
    id: "deps-3",
    category: "DEPENDENCIES",
    fromCommand: "ZIO.service[A]",
    toCommand: "IO.ask[A]",
    note: "Get from env (Kleisli)",
  },
  {
    id: "deps-4",
    category: "DEPENDENCIES",
    fromCommand: "layer1 ++ layer2",
    toCommand: "Resource.forProductN",
    note: "Compose dependencies",
  },
  {
    id: "deps-5",
    category: "DEPENDENCIES",
    fromCommand: "ZManaged.acquireRelease",
    toCommand: "Resource.make",
    note: "Resource lifecycle",
  },
  // CONCURRENCY
  {
    id: "concurrency-1",
    category: "CONCURRENCY",
    fromCommand: "effect.fork",
    toCommand: "effect.start",
    note: "Spawn fiber",
  },
  {
    id: "concurrency-2",
    category: "CONCURRENCY",
    fromCommand: "fiber.join",
    toCommand: "fiber.join",
    note: "Await fiber result",
  },
  {
    id: "concurrency-3",
    category: "CONCURRENCY",
    fromCommand: "effect1.race(effect2)",
    toCommand: "effect1.race(effect2)",
    note: "First to finish wins",
  },
  {
    id: "concurrency-4",
    category: "CONCURRENCY",
    fromCommand: "effect.timeout(duration)",
    toCommand: "effect.timeout(duration)",
    note: "Cancel if too slow",
  },
  {
    id: "concurrency-5",
    category: "CONCURRENCY",
    fromCommand: "fiber.interrupt",
    toCommand: "fiber.cancel",
    note: "Cancel fiber",
  },
  {
    id: "concurrency-6",
    category: "CONCURRENCY",
    fromCommand: "ZIO.supervised",
    toCommand: "Resource with cancel",
    note: "Manual supervision",
  },
  {
    id: "concurrency-7",
    category: "CONCURRENCY",
    fromCommand: "ZIO.collectAllPar(list)",
    toCommand: "list.parSequence",
    note: "Parallel execution",
  },
  // STREAMING
  {
    id: "streaming-1",
    category: "STREAMING",
    fromCommand: "ZStream(values)",
    toCommand: "Stream(values)",
    note: "Create stream",
  },
  {
    id: "streaming-2",
    category: "STREAMING",
    fromCommand: "stream.map(f)",
    toCommand: "stream.map(f)",
    note: "Transform elements",
  },
  {
    id: "streaming-3",
    category: "STREAMING",
    fromCommand: "stream.filter(p)",
    toCommand: "stream.filter(p)",
    note: "Filter elements",
  },
  {
    id: "streaming-4",
    category: "STREAMING",
    fromCommand: "stream.runCollect",
    toCommand: "stream.compile.toList",
    note: "Collect to list",
  },
  {
    id: "streaming-5",
    category: "STREAMING",
    fromCommand: "stream.mapZIO(f)",
    toCommand: "stream.evalMap(f)",
    note: "Effectful map",
  },
  {
    id: "streaming-6",
    category: "STREAMING",
    fromCommand: "stream.merge(other)",
    toCommand: "stream.merge(other)",
    note: "Merge streams",
  },
  {
    id: "streaming-7",
    category: "STREAMING",
    fromCommand: "ZStream.fromPath(path)",
    toCommand: "Files[IO].readAll(path)",
    note: "File streaming (fs2)",
  },
  // RUNTIME
  {
    id: "runtime-1",
    category: "RUNTIME",
    fromCommand: "object Main extends ZIOAppDefault",
    toCommand: "object Main extends IOApp.Simple",
    note: "Application entry",
  },
  {
    id: "runtime-2",
    category: "RUNTIME",
    fromCommand: "override val run: ZIO[...]",
    toCommand: "val run: IO[Throwable, Unit]",
    note: "Main effect",
  },
  {
    id: "runtime-3",
    category: "RUNTIME",
    fromCommand: "override val bootstrap",
    toCommand: "IORuntime (implicit)",
    note: "Runtime config",
  },
  {
    id: "runtime-4",
    category: "RUNTIME",
    fromCommand: "effect.onInterrupt(f)",
    toCommand: "effect.onCancel(f)",
    note: "Shutdown hook",
  },
  {
    id: "runtime-5",
    category: "RUNTIME",
    fromCommand: "ZIO.logInfo(msg)",
    toCommand: "logger.info(msg) (log4cats)",
    note: "Logging",
  },
  // INTEROP
  {
    id: "interop-1",
    category: "INTEROP",
    fromCommand: "zio.toIO",
    toCommand: "Use in CE via interop",
    note: "zio-interop-cats",
  },
  {
    id: "interop-2",
    category: "INTEROP",
    fromCommand: "zio.toResource",
    toCommand: "Use in CE via interop",
    note: "Convert ZManaged",
  },
  {
    id: "interop-3",
    category: "INTEROP",
    fromCommand: "effects.parTupled",
    toCommand: "effects.parTupled",
    note: "Via Cats Parallel",
  },
  {
    id: "interop-4",
    category: "INTEROP",
    fromCommand: "list.traverse(ZIO)",
    toCommand: "list.traverse(IO)",
    note: "Cats syntax",
  },
] as const

/**
 * Get all unique categories from glossary entries.
 *
 * Returns categories in a consistent order for UI display.
 *
 * @example
 * ```ts
 * import { getCategories } from "@/content/glossary/cats-effect-zio"
 *
 * const categories = getCategories()
 * // ["BASICS", "ERRORS", "DEPENDENCIES", "CONCURRENCY", "STREAMING", "RUNTIME", "INTEROP"]
 * ```
 */
export function getCategories(): readonly GlossaryCategory[] {
  const categoryOrder: readonly GlossaryCategory[] = [
    "BASICS",
    "ERRORS",
    "DEPENDENCIES",
    "CONCURRENCY",
    "STREAMING",
    "RUNTIME",
    "INTEROP",
  ]

  const categories = new Set<GlossaryCategory>()
  for (const entry of catsEffectZioGlossary) {
    categories.add(entry.category)
  }

  // Return in defined order
  return categoryOrder.filter((cat) => categories.has(cat))
}

/**
 * Filter glossary entries by category.
 *
 * @param entries - The glossary entries to filter
 * @param category - The category to filter by
 * @returns Entries matching the specified category
 *
 * @example
 * ```ts
 * import { filterByCategory, catsEffectZioGlossary } from "@/content/glossary/cats-effect-zio"
 *
 * const basics = filterByCategory(catsEffectZioGlossary, "BASICS")
 * // Returns 7 entries from BASICS category
 * ```
 */
export function filterByCategory(
  entries: readonly GlossaryEntry[],
  category: GlossaryCategory,
): readonly GlossaryEntry[] {
  return entries.filter((entry) => entry.category === category)
}

/**
 * Search glossary entries by query string.
 *
 * Searches across fromCommand, toCommand, and note fields.
 * Case-insensitive partial matching.
 *
 * @param entries - The glossary entries to search
 * @param query - The search query string
 * @returns Entries matching the search query
 *
 * @example
 * ```ts
 * import { searchEntries, catsEffectZioGlossary } from "@/content/glossary/cats-effect-zio"
 *
 * const results = searchEntries(catsEffectZioGlossary, "pure")
 * // Returns entries containing "pure" in any field
 *
 * const empty = searchEntries(catsEffectZioGlossary, "zzzzzzz")
 * // Returns empty array (no matches)
 * ```
 */
export function searchEntries(
  entries: readonly GlossaryEntry[],
  query: string,
): readonly GlossaryEntry[] {
  if (!query) {
    return entries
  }

  const lowerQuery = query.toLowerCase()

  return entries.filter(
    (entry) =>
      entry.fromCommand.toLowerCase().includes(lowerQuery) ||
      entry.toCommand.toLowerCase().includes(lowerQuery) ||
      entry.note.toLowerCase().includes(lowerQuery),
  )
}
