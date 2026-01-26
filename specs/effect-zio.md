# Effect ← ZIO Tutorial Specification

**Slug:** `effect-zio`
**Direction:** Learning Effect.TS from ZIO knowledge
**Estimated Time:** ~75-80 minutes (15 steps)

## Overview

This tutorial teaches Effect.TS to developers who already know ZIO. Since Effect was heavily inspired by ZIO, many concepts map directly, but there are important differences in syntax, type parameter order, and ecosystem patterns.

---

## Requirements

### R1: Tutorial Content
- R1.1: 15 MDX step files covering fundamentals through ecosystem
- R1.2: Each step uses CrossLanguageBlock for Scala ↔ TypeScript comparisons
- R1.3: Content follows stripMargin `|` prefix format for code indentation
- R1.4: No celebration language, direct and concise writing style

### R2: CrossLanguageBlock Component
- R2.1: Two code panels side-by-side (ZIO/Scala left, Effect/TypeScript right)
- R2.2: Proper syntax highlighting for both languages via Shiki
- R2.3: Stacked vertically on mobile (both panels visible)
- R2.4: Optional comments below each panel
- R2.5: Support `|` stripMargin format like ScalaComparisonBlock

### R3: Pairing Schema Updates
- R3.1: Add `tags: readonly string[]` field for search discoverability
- R3.2: Add `language: "typescript" | "scala" | "shell" | "other"` field
- R3.3: Category icon represents TARGET ("to") technology
- R3.4: Update existing pairings with new fields

### R4: Search Improvements
- R4.1: Sticky search bar in header (visible on scroll)
- R4.2: Dynamic search data (load from pairings + step metadata)
- R4.3: Include tags in search matching
- R4.4: Search includes all tutorials (jj-git, zio-cats, effect-zio)

### R5: Icon Support
- R5.1: Add TypeScript icon via devicons-react
- R5.2: LessonCard displays language icon based on `language` field
- R5.3: Official brand colors (TypeScript: #3178C6, Scala: #DC322F)

### R6: Glossary
- R6.1: effect-zio.ts with ZIO → Effect mappings
- R6.2: Categories: CORE, ERRORS, COMPOSITION, SERVICES, LAYERS, CONCURRENCY, STREAMING, SCHEMA, HTTP, SQL

---

## Constraints

- Must pass existing validation: `bun run build && bun run typecheck && bun run lint`
- No sandbox/terminal for effect-zio (static code only, like zio-cats)
- Effect.TS version: 3.x (latest stable)
- Code examples must be accurate and compile

## Edge Cases

- Mobile layout: CrossLanguageBlock stacks vertically
- Empty search: Show placeholder text
- Missing icon: Fall back to null (no icon displayed)
- Tags search: Case-insensitive matching

## Out of Scope

- Interactive TypeScript playground embeds
- Effect.TS sandbox environment
- Video content or tutorials
- ZIO 1.x compatibility
- Effect 2.x compatibility

---

## Key Concept Mappings

### Type Signature (CRITICAL DIFFERENCE)

| ZIO (Scala) | Effect (TypeScript) | Notes |
|-------------|---------------------|-------|
| `ZIO[-R, +E, +A]` | `Effect<A, E, R>` | **Different order!** Effect puts Success first |
| R = Requirements | R = Requirements | Same meaning |
| E = Error | E = Error | Same meaning |
| A = Success | A = Success | Same meaning |

### Type Aliases

| ZIO | Effect Equivalent |
|-----|-------------------|
| `UIO[A]` | `Effect<A, never, never>` |
| `Task[A]` | `Effect<A, UnknownException, never>` |
| `IO[E, A]` | `Effect<A, E, never>` |
| `RIO[R, A]` | `Effect<A, Throwable, R>` |
| `URIO[R, A]` | `Effect<A, never, R>` |

### Effect Constructors

| ZIO (Scala) | Effect (TypeScript) |
|-------------|---------------------|
| `ZIO.succeed(42)` | `Effect.succeed(42)` |
| `ZIO.fail(error)` | `Effect.fail(error)` |
| `ZIO.attempt { ... }` | `Effect.try(() => ...)` |
| `ZIO.fromPromise(...)` | `Effect.tryPromise(() => ...)` |
| `ZIO.async { cb => ... }` | `Effect.async((resume) => ...)` |
| `ZIO.unit` | `Effect.void` |
| `ZIO.none` | `Effect.succeedNone` |
| `ZIO.some(a)` | `Effect.succeedSome(a)` |

### Composition

| ZIO (Scala) | Effect (TypeScript) |
|-------------|---------------------|
| `for { a <- fa; b <- fb } yield b` | `Effect.gen(function* () { const a = yield* fa; const b = yield* fb; return b })` |
| `fa.map(f)` | `Effect.map(fa, f)` or `fa.pipe(Effect.map(f))` |
| `fa.flatMap(f)` | `Effect.flatMap(fa, f)` or `fa.pipe(Effect.flatMap(f))` |
| `fa *> fb` | `Effect.zipRight(fa, fb)` |
| `fa <* fb` | `Effect.zipLeft(fa, fb)` |
| `fa.zip(fb)` | `Effect.zip(fa, fb)` |

### Error Handling

| ZIO (Scala) | Effect (TypeScript) |
|-------------|---------------------|
| `fa.catchAll(handler)` | `Effect.catchAll(fa, handler)` |
| `fa.catchSome(pf)` | `Effect.catchSome(fa, pf)` |
| `fa.mapError(f)` | `Effect.mapError(fa, f)` |
| `fa.orElse(fb)` | `Effect.orElse(fa, () => fb)` |
| `fa.either` | `Effect.either(fa)` |
| `ZIO.die(defect)` | `Effect.die(defect)` |
| `ZIO.dieMessage(msg)` | `Effect.dieMessage(msg)` |

### Dependency Injection

| ZIO (Scala) | Effect (TypeScript) |
|-------------|---------------------|
| `ZIO.service[T]` | `yield* Tag` (inside Effect.gen) |
| `ZLayer.succeed(impl)` | `Layer.succeed(Tag, impl)` |
| `ZLayer.fromEffect(...)` | `Layer.effect(Tag, ...)` |
| `ZLayer.scoped(...)` | `Layer.scoped(Tag, ...)` |
| `fa.provideLayer(layer)` | `Effect.provide(fa, layer)` |
| `fa.provide(ZLayer.succeed(...))` | `Effect.provideService(fa, Tag, impl)` |
| `layer1 >>> layer2` | `Layer.provide(layer2, layer1)` |
| `layer1 ++ layer2` | `Layer.merge(layer1, layer2)` |

### Concurrency

| ZIO (Scala) | Effect (TypeScript) |
|-------------|---------------------|
| `fa.fork` | `Effect.fork(fa)` |
| `fiber.join` | `Fiber.join(fiber)` |
| `fiber.interrupt` | `Fiber.interrupt(fiber)` |
| `fa.race(fb)` | `Effect.race(fa, fb)` |
| `ZIO.collectAllPar(effects)` | `Effect.all(effects, { concurrency: "unbounded" })` |
| `fa.timeout(duration)` | `Effect.timeout(fa, duration)` |
| `Ref.make(a)` | `Ref.make(a)` |
| `ref.get` | `Ref.get(ref)` |
| `ref.set(a)` | `Ref.set(ref, a)` |
| `ref.update(f)` | `Ref.update(ref, f)` |

### Resources

| ZIO (Scala) | Effect (TypeScript) |
|-------------|---------------------|
| `ZIO.acquireRelease(acquire)(release)` | `Effect.acquireRelease(acquire, release)` |
| `ZIO.scoped(...)` | `Effect.scoped(...)` |
| `Scope` | `Scope` |

### Streaming

| ZIO (Scala) | Effect (TypeScript) |
|-------------|---------------------|
| `ZStream` | `Stream` |
| `ZStream.from(...)` | `Stream.from(...)` |
| `stream.map(f)` | `Stream.map(stream, f)` |
| `stream.flatMap(f)` | `Stream.flatMap(stream, f)` |
| `stream.filter(p)` | `Stream.filter(stream, p)` |
| `stream.take(n)` | `Stream.take(stream, n)` |
| `stream.runCollect` | `Stream.runCollect(stream)` |
| `ZSink` | `Sink` |

### Running Effects

| ZIO (Scala) | Effect (TypeScript) |
|-------------|---------------------|
| `Runtime.default.unsafeRun(fa)` | `Effect.runSync(fa)` |
| `Runtime.default.unsafeRunToFuture(fa)` | `Effect.runPromise(fa)` |
| `ZIOAppDefault` | No direct equivalent - use `Effect.runPromise` in main |
| `ZIO.runtime` | `Effect.runtime` |

---

## Tutorial Structure (15 Steps)

### Section 1: Fundamentals (Steps 1-4)

#### Step 1: The Effect Type (~4 min)
**Title:** "Effect<A, E, R> vs ZIO[-R, +E, +A]"

Compare type signatures, highlighting the critical difference in parameter order:
- ZIO: Environment first (R, E, A)
- Effect: Success first (A, E, R)

Cover:
- Type parameter meanings (same concepts, different order)
- Mental model: `Effect<A, E, R>` ~ `(Context<R>) => E | A`
- Why Effect chose this order (A is most commonly varied)
- No type aliases like UIO/Task in Effect (use explicit parameters)

#### Step 2: Creating Effects (~5 min)
**Title:** "Effect.succeed, Effect.fail, Effect.sync"

Map ZIO constructors to Effect:
- `ZIO.succeed` → `Effect.succeed`
- `ZIO.fail` → `Effect.fail`
- `ZIO.attempt` → `Effect.try`, `Effect.tryPromise`
- `ZIO.async` → `Effect.async`
- `ZIO.suspend` → `Effect.suspend`

Cover side-effect handling differences (Effect.sync for thunks).

#### Step 3: Error Handling (~5 min)
**Title:** "Typed Errors and Defects"

Compare error models:
- Expected errors (E channel) - same concept
- Unexpected errors (defects) - same concept
- `catchAll`, `catchSome`, `mapError`, `orElse`
- `Effect.either` for converting to Either
- Defects: `Effect.die`, `Effect.dieMessage`

#### Step 4: Composition with Generators (~4 min)
**Title:** "Effect.gen vs for-comprehension"

Critical syntax difference:
- ZIO uses Scala's `for { ... } yield ...`
- Effect uses `Effect.gen(function* () { ... })`
- `yield*` unwraps effects (like `<-` in Scala)
- Control flow (if/else, loops) works naturally

Also cover pipe syntax as alternative.

---

### Section 2: Application Architecture (Steps 5-7)

#### Step 5: Services and Context.Tag (~6 min)
**Title:** "Context.Tag vs ZIO.service"

Dependency injection comparison:
- ZIO uses `ZIO.service[T]` with implicit Tag
- Effect uses `Context.Tag` classes explicitly
- Creating service interfaces
- Accessing services with `yield* Tag`
- Why Effect chose explicit tags

#### Step 6: Layers (~6 min)
**Title:** "Layer vs ZLayer"

Layer creation and composition:
- `Layer.succeed` vs `ZLayer.succeed`
- `Layer.effect` vs `ZLayer.fromEffect`
- `Layer.scoped` vs `ZLayer.scoped`
- Composition: `Layer.provide`, `Layer.merge`
- `Effect.provide` vs `provideLayer`

#### Step 7: Resource Management (~5 min)
**Title:** "Scope and acquireRelease"

Resource safety patterns:
- `Effect.acquireRelease` vs `ZIO.acquireRelease`
- `Effect.scoped` vs `ZIO.scoped`
- Scope service
- Finalizers and resource safety
- Combining with Layers for service lifecycle

---

### Section 3: Concurrency (Steps 8-10)

#### Step 8: Fibers and Forking (~5 min)
**Title:** "Fibers: fork, join, interrupt"

Concurrent execution model:
- Fiber concept (identical to ZIO)
- `Effect.fork` vs `ZIO.fork`
- `Fiber.join`, `Fiber.await`
- `Fiber.interrupt`
- Auto-supervision and daemon fibers

#### Step 9: Concurrent Combinators (~5 min)
**Title:** "Parallel Execution"

Parallel operations:
- `Effect.all` with concurrency options
- `Effect.race`, `Effect.raceAll`
- `Effect.forEach` with parallelism
- Timeout: `Effect.timeout`
- `Effect.zip` variants

#### Step 10: Ref and Concurrent State (~5 min)
**Title:** "Ref: Atomic State"

Shared mutable state:
- `Ref.make` - same API
- `Ref.get`, `Ref.set`, `Ref.update`
- `Ref.modify` for read-modify-write
- `SynchronizedRef` for effectful updates
- Comparison with ZIO Ref

---

### Section 4: Advanced Topics (Steps 11-12)

#### Step 11: STM (~5 min)
**Title:** "Software Transactional Memory"

Transactional state:
- `TRef` and `STM` type
- `STM.commit` vs `STM.atomically`
- `TRef.make`, `TRef.get`, `TRef.set`
- Composing transactions
- Retry semantics

#### Step 12: Streaming (~6 min)
**Title:** "Stream vs ZStream"

Streaming data:
- `Stream<A, E, R>` type signature
- Creating streams: `Stream.succeed`, `Stream.from`, `Stream.iterate`
- Transformations: `map`, `flatMap`, `filter`
- Consumption: `Stream.runCollect`, `Stream.runForEach`
- Sinks for aggregation
- Comparison with ZStream

---

### Section 5: Ecosystem (Steps 13-15)

#### Step 13: Schema (Validation) (~5 min)
**Title:** "Effect Schema vs zio-schema"

Data validation and transformation:
- `Schema<A, I, R>` type
- Decoding and encoding
- Schema composition
- Integration with services
- Comparison with zio-schema/Circe

#### Step 14: Platform & HTTP (~6 min)
**Title:** "HTTP with @effect/platform"

HTTP client and server:
- `@effect/platform` overview
- HttpClient service
- HTTP server (if applicable)
- Cross-platform abstractions
- Comparison with ZIO HTTP

#### Step 15: Database Access (~6 min)
**Title:** "SQL with @effect/sql"

Database integration:
- `@effect/sql` and `@effect/sql-pg`
- SqlClient service
- Queries and transactions
- Migrations
- Comparison with ZIO JDBC/Quill

---

## CrossLanguageBlock Component

### Requirements:
- Two code panels side by side (like ScalaComparisonBlock)
- Left panel: ZIO (Scala) with Scala syntax highlighting
- Right panel: Effect (TypeScript) with TypeScript syntax highlighting
- Labels: "ZIO (Scala)" and "Effect (TypeScript)"
- Optional comments below each panel
- Support for the `|` stripMargin format for proper indentation

### Props:
```typescript
interface CrossLanguageBlockProps {
  zioCode: string           // Scala code with | prefix
  effectCode: string        // TypeScript code with | prefix
  zioComment?: string       // Optional comment for ZIO panel
  effectComment?: string    // Optional comment for Effect panel
}
```

---

## File Structure

```
packages/web/content/comparisons/effect-zio/
├── index.mdx              # Landing page
├── config.yml             # Sandbox config (disabled)
├── 01-step.mdx            # Effect<A,E,R> vs ZIO[-R,+E,+A]
├── 02-step.mdx            # Creating Effects
├── 03-step.mdx            # Error Handling
├── 04-step.mdx            # Composition with Generators
├── 05-step.mdx            # Services and Context.Tag
├── 06-step.mdx            # Layers
├── 07-step.mdx            # Resource Management
├── 08-step.mdx            # Fibers and Forking
├── 09-step.mdx            # Concurrent Combinators
├── 10-step.mdx            # Ref and Concurrent State
├── 11-step.mdx            # STM
├── 12-step.mdx            # Streaming
├── 13-step.mdx            # Schema (Validation)
├── 14-step.mdx            # Platform & HTTP
└── 15-step.mdx            # Database Access

packages/web/content/glossary/effect-zio.ts  # Glossary entries
```

---

## Decisions Made

1. **Code playground**: Static code only (no embedded playgrounds), matching zio-cats approach

2. **Mobile layout**: Stacked vertically on mobile (both panels always visible)

3. **Syntax highlighting**: Need TypeScript highlighting alongside Scala
   - Use Shiki (already used in project)
   - Ensure both languages highlight correctly

4. **Effect version**: Target Effect 3.x (latest stable)

5. **Category & Branding**:
   - Category icon represents the **target** ("to") technology
   - effect-zio goes under TypeScript category (learning Effect.TS)
   - zio-cats stays under Scala category (learning ZIO)

6. **Searchable Tags**: Each pairing has tags for discoverability
   - effect-zio: `["typescript", "effect", "zio", "scala", "functional"]`
   - zio-cats: `["scala", "zio", "cats-effect", "functional"]`

7. **Language Colors** (official brand colors):
   - TypeScript: `#3178C6` (blue)
   - Scala: `#DC322F` (red)
   - Git: `#F05032` (orange-red)

8. **Search UX**: Sticky search bar in header (stays visible on scroll)

---

## Resources

- [Effect Documentation](https://effect.website/docs)
- [Effect Institute](https://www.effect.institute/)
- [Effect GitHub](https://github.com/Effect-TS/effect)
- [@effect/sql-pg](https://www.npmjs.com/package/@effect/sql-pg)
- [Effect Platform](https://effect.website/docs/platform/introduction)
- [Effect Schema](https://effect.website/docs/schema/introduction)
