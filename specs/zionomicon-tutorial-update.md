# Specification: Zionomicon Tutorial Update

## Overview

Update the cats-zio tutorial (10 existing steps) with accurate ZIO information from Zionomicon, then add 5 new advanced steps comparing Typelevel ecosystem libraries with ZIO equivalents.

## Requirements

### R1: Zionomicon Research

Read the Zionomicon ePub (`/Users/hmemcpy/Downloads/Zionomicon - 8.28.2025.ePub`) comprehensively to extract:
- Exact type signatures for ZIO types (ZIO[R, E, A], UIO, Task, IO, RIO, URIO)
- Effect constructors (succeed, fail, attempt, fromOption, fromEither, fromFuture, async)
- Error handling operators (catchAll, catchSome, mapError, fold, foldZIO, either)
- Resource management (acquireRelease, Scope, bracket, fromAutoCloseable)
- Dependency injection (ZLayer, service pattern, provideLayer)
- Fiber model (fork, join, await, interrupt, race, timeout)
- STM (TRef, TMap, TQueue, composable transactions)
- Concurrent structures (Ref, Promise, Queue, Hub, Semaphore)
- Application structure (ZIOAppDefault, Runtime, Bootstrap)

### R2: Update Existing Steps (1-10)

Compare current tutorial content with Zionomicon and fix:
- Incorrect type signatures
- Wrong constructor/operator names
- Outdated patterns
- Missing important concepts

**Current Steps:**
1. R/E/A Signature - Type signatures
2. Creating Effects - Effect constructors
3. Error Handling - Error handling patterns
4. Map/FlatMap Purity - Sequential composition
5. Dependency Injection - ZLayer vs Tagless Final
6. Resource Management - Resource lifecycle
7. Fiber Supervision - Concurrency
8. Streaming - ZStream vs fs2
9. Application Structure - ZIOAppDefault
10. Interop - zio-interop-cats

**Already Fixed:**
- Step 1: Changed `ZIO.attempt(42)` to proper side-effecting example
- Step 2: Changed `IO[Option[Nothing], Int]` to `IO[None.type, Int]`

### R3: Create New Advanced Steps (11-15)

Create 5 new MDX files comparing Typelevel and ZIO ecosystems:

| Step | Topic | ZIO Library | Typelevel Library |
|------|-------|-------------|-------------------|
| 11 | STM | ZIO STM (built-in) | cats-stm |
| 12 | Concurrent Structures | Ref, Queue, Hub, Promise | cats-effect-std |
| 13 | Configuration | ZIO Config | Ciris |
| 14 | HTTP | ZIO HTTP | http4s |
| 15 | Database | ZIO JDBC / Quill | Doobie / Skunk |

Each step must:
- Use `<ScalaComparisonBlock>` for side-by-side code comparisons
- Follow existing frontmatter schema (title, step, description, zioCommands, ceCommands)
- Include practical examples from real-world usage
- Link to next step in the series

### R4: Update Configuration

1. Update `packages/web/content/pairings.ts`:
   - Change `steps: 10` to `steps: 15`
   - Update `estimatedTime` to reflect additional content

2. Verify routing works for steps 11-15 (existing dynamic route should handle this)

3. Update `packages/web/content/comparisons/cats-zio/index.mdx`:
   - Add new "Advanced Topics" section listing steps 11-15

## Constraints

- **MDX Format**: All content in MDX with existing component imports
- **Frontmatter Schema**: Must include title, step, description, zioCommands (array), ceCommands (array)
- **No Terminal**: cats-zio has `sandbox.enabled: false` - no TryIt components
- **Content Style**: Direct, concise, code-first (per CLAUDE.md guidelines)
- **Validation**: `bun run build && bun run typecheck` must pass

## Edge Cases

- If Zionomicon content contradicts current ZIO 2.x docs, prefer Zionomicon (authoritative source)
- For new steps (HTTP, Database), research current library versions if Zionomicon doesn't cover
- Streaming (Step 8): Enhance from Zionomicon if applicable, otherwise keep as-is

### R5: ZIO Interop Reference

Use official ZIO interop documentation (https://zio.dev/guides/interop/with-cats-effect/) for Step 10:

**Key conversions:**
- `Resource#toManaged` — Cats Effect Resource → ZIO Managed
- `ZManaged#toResource` — ZIO Managed → Cats Effect Resource
- `Resource#toScoped` — Resource → ZIO scoped effects
- `fs2.Stream#toZStream()` — FS2 Stream → ZStream
- `ZStream#toFs2Stream` — ZStream → FS2 Stream

**Dependencies:**
```scala
// Cats Effect 3.x
libraryDependencies += "dev.zio" %% "zio-interop-cats" % "3.1.1.0"
```

**Imports:**
```scala
import zio.interop.catz._
import zio.stream.interop.fs2z._ // for stream conversions
```

**Constraint:** ZIO interop only works with `Throwable` error types (Task, RIO).

## Out of Scope

- Interactive sandbox for Scala (Scastie only)
- Video content or tutorials
- Cats Effect 2.x compatibility (CE3 only)
- ZIO 1.x compatibility (ZIO 2.x only)
- Translation to other languages

## Zionomicon Chapter Mapping

| Chapter | Topic | Size | Maps to Steps |
|---------|-------|------|---------------|
| ch003 | First Steps With ZIO | 157KB | 1, 2, 4 |
| ch005 | The ZIO Error Model | 78KB | 3 |
| ch006 | Integrating with ZIO | 78KB | 2 |
| ch007-010 | Concurrency/Fibers | 221KB | 7 |
| ch011-015 | Concurrent Structures | 286KB | Step 12 |
| ch016-018 | Resource Handling | 186KB | 6 |
| ch019-021 | Dependency Injection | 247KB | 5 |
| ch022 | Configuring ZIO Apps | 78KB | 9 |
| ch023-024 | STM | 182KB | Step 11 |
