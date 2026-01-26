/**
 * Effect ← ZIO glossary entries
 *
 * Maps ZIO concepts to their Effect.TS equivalents.
 */

import type { GlossaryEntry as SharedGlossaryEntry } from "./types"

/**
 * Glossary category types for concept groupings.
 */
export type GlossaryCategory =
  | "CORE"
  | "ERRORS"
  | "COMPOSITION"
  | "SERVICES"
  | "LAYERS"
  | "CONCURRENCY"
  | "STREAMING"
  | "SCHEMA"
  | "HTTP"
  | "SQL"

/**
 * Single glossary entry for API mapping.
 */
export interface GlossaryEntry extends SharedGlossaryEntry {
  /** Category grouping for this entry */
  readonly category: GlossaryCategory
}

const effectZioGlossary: readonly GlossaryEntry[] = [
  // CORE
  {
    id: "core-1",
    category: "CORE",
    fromCommand: "Effect<A, E, R>",
    toCommand: "ZIO[-R, +E, +A]",
    note: "Type parameter order is different: Effect puts Success (A) first, while ZIO puts Environment (R) first",
  },
  {
    id: "core-2",
    category: "CORE",
    fromCommand: "Effect.succeed(x)",
    toCommand: "ZIO.succeed(x)",
    note: "Creates a successful effect with the given value",
  },
  {
    id: "core-3",
    category: "CORE",
    fromCommand: "Effect.fail(e)",
    toCommand: "ZIO.fail(e)",
    note: "Creates a failed effect with the given error",
  },
  {
    id: "core-4",
    category: "CORE",
    fromCommand: "Effect.try(() => ...)",
    toCommand: "ZIO.attempt(...)",
    note: "Wraps a synchronous operation that may throw",
  },
  {
    id: "core-5",
    category: "CORE",
    fromCommand: "Effect.sync(() => ...)",
    toCommand: "ZIO.suspend(...)",
    note: "Defers evaluation of a thunk (side-effecting code)",
  },

  // ERRORS
  {
    id: "errors-1",
    category: "ERRORS",
    fromCommand: "Effect.catchAll(fa, f)",
    toCommand: "fa.catchAll(f)",
    note: "Handle all errors with a recovery function",
  },
  {
    id: "errors-2",
    category: "ERRORS",
    fromCommand: "Effect.orElse(fa, () => fb)",
    toCommand: "fa.orElse(fb)",
    note: "Run fallback effect if first fails",
  },
  {
    id: "errors-3",
    category: "ERRORS",
    fromCommand: "Effect.mapError(fa, f)",
    toCommand: "fa.mapError(f)",
    note: "Transform the error type",
  },
  {
    id: "errors-4",
    category: "ERRORS",
    fromCommand: "Effect.either(fa)",
    toCommand: "fa.either",
    note: "Convert Effect<A, E, R> to Effect<Either<E, A>, never, R>",
  },
  {
    id: "errors-5",
    category: "ERRORS",
    fromCommand: "Effect.die(defect)",
    toCommand: "ZIO.die(defect)",
    note: "Create a fatal defect (not in the typed error channel)",
  },

  // COMPOSITION
  {
    id: "composition-1",
    category: "COMPOSITION",
    fromCommand: "Effect.gen(function* () { ... })",
    toCommand: "for { ... } yield ...",
    note: "Sequential composition with generators. Use yield* to unwrap effects",
  },
  {
    id: "composition-2",
    category: "COMPOSITION",
    fromCommand: "yield* effect",
    toCommand: "<- effect (in for-comprehension)",
    note: "Bind/unwrap an effect in a generator",
  },
  {
    id: "composition-3",
    category: "COMPOSITION",
    fromCommand: "Effect.map(fa, f)",
    toCommand: "fa.map(f)",
    note: "Transform the success value",
  },
  {
    id: "composition-4",
    category: "COMPOSITION",
    fromCommand: "Effect.flatMap(fa, f)",
    toCommand: "fa.flatMap(f)",
    note: "Chain effects (bind)",
  },

  // SERVICES
  {
    id: "services-1",
    category: "SERVICES",
    fromCommand: "class Tag extends Context.Tag",
    toCommand: "ZIO.service[T]",
    note: "Define service tags with Context.Tag class pattern",
  },
  {
    id: "services-2",
    category: "SERVICES",
    fromCommand: "yield* ServiceTag",
    toCommand: "ZIO.service[ServiceType]",
    note: "Access a service in Effect.gen",
  },
  {
    id: "services-3",
    category: "SERVICES",
    fromCommand: "Layer.succeed(Tag, impl)",
    toCommand: "ZLayer.succeed(impl)",
    note: "Create a layer from a service implementation",
  },
  {
    id: "services-4",
    category: "SERVICES",
    fromCommand: "Layer.effect(Tag, effect)",
    toCommand: "ZLayer.fromEffect(...)",
    note: "Create a layer from an effect",
  },

  // LAYERS
  {
    id: "layers-1",
    category: "LAYERS",
    fromCommand: "Layer.provide(inner, outer)",
    toCommand: "outer >>> inner",
    note: "Horizontal layer composition (dependencies)",
  },
  {
    id: "layers-2",
    category: "LAYERS",
    fromCommand: "Layer.merge(layer1, layer2)",
    toCommand: "layer1 ++ layer2",
    note: "Vertical layer composition (merge independent layers)",
  },
  {
    id: "layers-3",
    category: "LAYERS",
    fromCommand: "Effect.provide(effect, layer)",
    toCommand: "effect.provideLayer(layer)",
    note: "Provide layers to an effect",
  },
  {
    id: "layers-4",
    category: "LAYERS",
    fromCommand: "Layer.scoped(Tag, effect)",
    toCommand: "ZLayer.scoped(...)",
    note: "Create a layer with scoped resource management",
  },

  // CONCURRENCY
  {
    id: "concurrency-1",
    category: "CONCURRENCY",
    fromCommand: "Effect.fork(fa)",
    toCommand: "fa.fork",
    note: "Run effect concurrently in a fiber",
  },
  {
    id: "concurrency-2",
    category: "CONCURRENCY",
    fromCommand: "Fiber.join(fiber)",
    toCommand: "fiber.join",
    note: "Wait for fiber to complete and get result",
  },
  {
    id: "concurrency-3",
    category: "CONCURRENCY",
    fromCommand: "Fiber.interrupt(fiber)",
    toCommand: "fiber.interrupt",
    note: "Cancel a running fiber",
  },
  {
    id: "concurrency-4",
    category: "CONCURRENCY",
    fromCommand: "Effect.all(effects, { concurrency })",
    toCommand: "ZIO.collectAllPar(effects)",
    note: "Run effects in parallel with concurrency control",
  },
  {
    id: "concurrency-5",
    category: "CONCURRENCY",
    fromCommand: "Effect.race(fa, fb)",
    toCommand: "fa.race(fb)",
    note: "Run both effects, return result of first to succeed",
  },
  {
    id: "concurrency-6",
    category: "CONCURRENCY",
    fromCommand: "Ref.make(initial)",
    toCommand: "Ref.make(initial)",
    note: "Create atomic reference for concurrent state",
  },
  {
    id: "concurrency-7",
    category: "CONCURRENCY",
    fromCommand: "Ref.get/set/update(ref, ...)",
    toCommand: "ref.get/set/update",
    note: "Atomic operations on Ref",
  },

  // STREAMING
  {
    id: "streaming-1",
    category: "STREAMING",
    fromCommand: "Stream<A, E, R>",
    toCommand: "ZStream[-R, +E, +O]",
    note: "Stream type with Output (A) first, unlike ZStream",
  },
  {
    id: "streaming-2",
    category: "STREAMING",
    fromCommand: "Stream.succeed(...)",
    toCommand: "ZStream(...)",
    note: "Create stream from values",
  },
  {
    id: "streaming-3",
    category: "STREAMING",
    fromCommand: "Stream.map/flatMap/filter(stream, f)",
    toCommand: "stream.map/flatMap/filter",
    note: "Stream transformations use pipe syntax",
  },
  {
    id: "streaming-4",
    category: "STREAMING",
    fromCommand: "Stream.runCollect(stream)",
    toCommand: "stream.runCollect",
    note: "Collect stream elements into array",
  },
  {
    id: "streaming-5",
    category: "STREAMING",
    fromCommand: "Sink.count/last/...",
    toCommand: "ZSink.count/last/...",
    note: "Aggregators for stream consumption",
  },

  // SCHEMA
  {
    id: "schema-1",
    category: "SCHEMA",
    fromCommand: "Schema<A>",
    toCommand: "Schema[A]",
    note: "Runtime type validation and transformation",
  },
  {
    id: "schema-2",
    category: "SCHEMA",
    fromCommand: "Schema.decodeUnknown(schema)(data)",
    toCommand: "schema.decode(data)",
    note: "Parse/validate unknown data into typed value",
  },
  {
    id: "schema-3",
    category: "SCHEMA",
    fromCommand: "Schema.optional(Schema.String)",
    toCommand: "Option[String]",
    note: "Optional/nullable field in schema",
  },

  // HTTP
  {
    id: "http-1",
    category: "HTTP",
    fromCommand: "HttpClient service",
    toCommand: "Client.service (ZIO HTTP)",
    note: "HTTP client service from @effect/platform",
  },
  {
    id: "http-2",
    category: "HTTP",
    fromCommand: "client.get/post(url, options)",
    toCommand: "Client.get/post(url, ...)",
    note: "HTTP methods return HttpClientResponse effect",
  },
  {
    id: "http-3",
    category: "HTTP",
    fromCommand: "response.json/text",
    toCommand: "response.body.asString",
    note: "Get response body as parsed JSON or text",
  },

  // SQL
  {
    id: "sql-1",
    category: "SQL",
    fromCommand: "SqlClient service",
    toCommand: "JdbcService (ZIO JDBC)",
    note: "Database client service from @effect/sql",
  },
  {
    id: "sql-2",
    category: "SQL",
    fromCommand: "sql`SELECT ... WHERE id = ${id}`",
    toCommand: 'sql"SELECT ... WHERE id = $id"',
    note: "Template literal SQL with automatic parameterization",
  },
  {
    id: "sql-3",
    category: "SQL",
    fromCommand: "SqlClient.transaction(effect)",
    toCommand: "jdbc.transaction { ... }",
    note: "Run effects in a database transaction",
  },
]

/**
 * Get all glossary entries for effect-zio.
 */
export function getEffectZioGlossary(): readonly GlossaryEntry[] {
  return effectZioGlossary
}

/**
 * Get glossary entries by category.
 */
export function getEffectZioGlossaryByCategory(): Record<string, readonly GlossaryEntry[]> {
  const grouped: Record<string, GlossaryEntry[]> = {}

  for (const entry of effectZioGlossary) {
    const category = entry.category
    grouped[category] ??= []
    grouped[category]?.push(entry)
  }

  return grouped
}

/**
 * Search effect-zio glossary entries.
 */
export function searchEffectZioGlossary(query: string): readonly GlossaryEntry[] {
  const lowerQuery = query.toLowerCase()

  return effectZioGlossary.filter(
    (entry) =>
      entry.fromCommand.toLowerCase().includes(lowerQuery) ||
      entry.toCommand.toLowerCase().includes(lowerQuery) ||
      entry.category.toLowerCase().includes(lowerQuery) ||
      entry.note.toLowerCase().includes(lowerQuery),
  )
}

export default effectZioGlossary
