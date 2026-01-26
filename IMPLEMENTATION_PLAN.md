# Implementation Plan

> **Status**: Planning | **Last Updated**: 2026-01-26 | **Validation**: `bun run build && bun run typecheck`

## Summary

This plan covers the **Zionomicon Tutorial Update** for cats-zio. All technical infrastructure is complete: syntax highlighting, sandbox integration, bidirectional UX, and Scastie improvements are implemented and verified.

**Current state**: Gap analysis complete. Zionomicon source content is available at `/tmp/zionomicon/EPUB/text/`. Ready to implement with prioritized tasks.

---

## Gap Analysis Summary

### Infrastructure: Already Complete ✓

| Feature | Location | Status |
|---------|----------|--------|
| **ScalaComparisonBlock** | `components/ui/ScalaComparisonBlock.tsx` | ✓ Server-side Shiki highlighting |
| **ScastieEmbed** | `components/ui/ScastieEmbed.tsx` | ✓ UUID snippet loading |
| **Callout** | `components/ui/Callout.tsx` | ✓ tip/warning/note variants |
| **MDX Components** | `components/mdx/MDXComponents.tsx` | ✓ Full component mapping |
| **Dynamic Routing** | `app/[toolPair]/[step]/page.tsx` | ⚠️ Has hardcoded steps (needs update) |
| **Content Loading** | `services/content.ts`, `lib/content-core/` | ✓ Effect-TS service layer |
| **Pairings Config** | `content/pairings.ts` | ⚠️ cats-zio: 10 steps, ~45 min (needs update) |
| **Glossary** | `content/glossary/cats-zio.ts` | ✓ 36 API mappings (needs new categories) |
| **Sandbox Config** | `comparisons/cats-zio/config.yml` | ✓ Disabled (Scastie only) |

### Critical Discovery: Hardcoded Route Generation

**FOUND**: Multiple files have hardcoded step counts that must all be updated for steps 11-15 to be accessible:

1. **`app/[toolPair]/[step]/page.tsx`** - `generateStaticParams()` (line 24)
2. **`app/[toolPair]/page.tsx`** - Overview page step metadata (lines 121-167)
3. **`app/[toolPair]/page.tsx`** - Overview page time estimates (lines 189-200)
4. **`content/pairings.ts`** - Tool pairing registry (lines 103-104)

**Impact**: ALL FOUR locations must be updated for steps 11-15 to be accessible and properly displayed.

### Existing Content Quality Assessment

After reviewing all 10 existing step files and Zionomicon content:

**Strengths:**
- Content is generally accurate and follows current ZIO 2.x patterns
- Good use of ScalaComparisonBlock for side-by-side comparisons
- Proper frontmatter schema usage
- Consistent writing style (direct, concise, code-first)
- Step 10 structure is complete (interops covers http4s, fs2, Resource)

**Issues Found:**
- Step 1: Missing variance notation (`ZIO[-R, +E, +A]`), `RIO`, `URIO` type aliases
- Step 2: Missing `ZIO.unit`, `ZIO.never`, `ZIO.fromTry`, `ZIO.async`
- Step 3: Missing `foldZIO`, `foldCauseZIO` from Zionomicon ch005
- Step 4: Missing utility operators (`as`, `tap`, `filterOrFail`)
- Step 5: Uses manual `ZLayer.succeed` - should add `ZLayer.derive` (Zionomicon ch019)
- Step 6: Missing `Scope` interface explanation (Zionomicon ch016-018)
- Step 7: Missing `forkDaemon`, `forkScoped`, `raceEither` (Zionomicon ch007)
- Step 8: Basic ZStream - needs effectful operators
- Step 9: Missing `ZIO.config`, Bootstrap pattern (Zionomicon ch022)
- **Step 10: VERSION MISMATCH** - Current shows `23.1.0.3` but spec requires `3.1.1.0` (note: `23.1.0.3` is actually newer and correct for ZIO 2.x, spec may be outdated)

**Issues Found:**
- Step 1: Missing variance notation (`ZIO[-R, +E, +A]`), `RIO`, `URIO` type aliases
- Step 2: Missing `ZIO.unit`, `ZIO.never`, `ZIO.fromTry`, `ZIO.async`
- Step 3: Missing `foldZIO`, `foldCauseZIO` from Zionomicon ch005
- Step 4: Missing utility operators (`as`, `tap`, `filterOrFail`)
- Step 5: Uses manual `ZLayer.succeed` - should add `ZLayer.derive` (Zionomicon ch020)
- Step 6: Missing `Scope` interface explanation (Zionomicon ch016-018)
- Step 7: Missing `forkDaemon`, `forkScoped`, `raceEither` (Zionomicon ch007)
- Step 8: Basic ZStream - needs effectful operators
- Step 9: Missing `ZIO.config`, Bootstrap pattern (Zionomicon ch022)
- Step 10: VERSION NOTE - Current has `23.1.0.3` which is correct for ZIO 2.x (newer than spec's `3.1.1.0`)

**No major errors detected** - mostly enhancement work needed.

### Zionomicon Research Summary

All Zionomicon chapters are available at `/tmp/zionomicon/EPUB/text/`. Key chapters for this update:

| Chapter | Topic | Maps to Step |
|---------|-------|--------------|
| ch003 | First Steps, Type Aliases | Step 1, 2 |
| ch005 | Error Model | Step 3 |
| ch007 | Fiber Model | Step 7 |
| ch011-015 | Concurrent Structures | Step 12 |
| ch016-018 | Resource Handling | Step 6 |
| ch019-021 | Dependency Injection | Step 5 |
| ch022 | Configuration | Step 9, 13 |
| ch023 (Chapter 21) | STM: Composing Atomicity | Step 11 |
| ch024 (Chapter 22) | STM: Data Structures | Step 11 |

**Key findings from STM chapters (ch023-024):**
- TRef interface with STM-returning operators
- STM.retry for optimistic locking (waits for TRef changes)
- STM data structures: TArray, TMap, TQueue, TSet, TPriorityQueue
- STM limitations: no arbitrary effects, no concurrency operators inside transactions
- Independent element optimization in TArray

---

## Tasks

### Priority Order

**P0 - Critical Infrastructure** (blocks all step 11-15 access):
- [x] **Update generateStaticParams in step page.tsx** — Change cats-zio steps from 10 to 15
- [x] **Update catsZioSteps array in overview page.tsx** — Add step metadata for steps 11-15
- [x] **Update catsZioTimes Map in overview page.tsx** — Add time estimates for steps 11-15
- [x] **Update pairings.ts** — Change `steps: 10` to `steps: 15` and `estimatedTime` to "~70 min"

**P1 - Content - New Steps** (required for feature completion):
- [x] **Create Step 11: STM** — ZIO STM vs cats-stm (TRef, TMap, TQueue, transactions)
- [x] **Create Step 12: Concurrent Structures** — Ref, Queue, Hub, Promise, Semaphore vs cats-effect-std
- [x] **Create Step 13: Configuration** — ZIO Config vs Ciris
- [x] **Create Step 14: HTTP** — ZIO HTTP vs http4s
- [x] **Create Step 15: Database** — ZIO JDBC/Quill vs Doobie/Skunk

**P2 - Content - Enhance Existing Steps** (improvements to existing content):
- [x] **Update Step 1: R/E/A Signature** — Add `RIO`, variance notation `ZIO[-R, +E, +A]`, `URIO`
- [ ] **Update Step 2: Creating Effects** — Add `ZIO.unit`, `ZIO.never`, `ZIO.fromTry`, `ZIO.async`
- [x] **Update Step 3: Error Handling** — Add `foldZIO`, `foldCauseZIO`, error recovery patterns
- [ ] **Update Step 4: Map/FlatMap Purity** — Add `as`, `tap`, `filterOrFail` utility operators
- [ ] **Update Step 5: Dependency Injection** — Add `ZLayer.derive` modern pattern
- [ ] **Update Step 6: Resource Management** — Add `Scope` interface explanation
- [ ] **Update Step 7: Fiber Supervision** — Add `forkDaemon`/`forkScoped`, `raceEither`
- [ ] **Update Step 8: Streaming** — Add `mapZIO`, `filterZIO`, error recovery
- [ ] **Update Step 9: Application Structure** — Add Bootstrap, `ZIO.config`, service access
- [x] **Verify Step 10: Interop** — Version `23.1.0.3` is correct (newer than spec's `3.1.1.0`)

**P3 - Landing Page & Glossary** (completion tasks):
- [ ] **Update index.mdx** — Add "Enterprise Integration" section listing steps 11-15
- [ ] **Update glossary** — Add STM, CONFIG, HTTP, DATABASE entries

**P4 - Validation** (final verification):
- [ ] **Run full validation** — Execute `bun run build && bun run typecheck && bun run lint`

---

## Task Details

### P0: Critical Infrastructure

- [x] **Update generateStaticParams in step page.tsx** — Change cats-zio steps from 10 to 15

**Why**: `generateStaticParams()` has hardcoded step counts. Without this update, routes for steps 11-15 will not be generated at build time.

**File**: `packages/web/app/[toolPair]/[step]/page.tsx`

**Change**:
```typescript
// BEFORE (line 22-24)
export function generateStaticParams() {
  const pairings = [
    { slug: "jj-git", steps: 12 },
    { slug: "cats-zio", steps: 10 },
  ] as const

// AFTER
export function generateStaticParams() {
  const pairings = [
    { slug: "jj-git", steps: 12 },
    { slug: "cats-zio", steps: 15 },
  ] as const
```

---

- [x] **Update catsZioSteps array in overview page.tsx** — Add step metadata for steps 11-15

**Why**: The overview page displays step titles and descriptions. Without these entries, steps 11-15 won't appear on the overview page.

**File**: `packages/web/app/[toolPair]/page.tsx`

**Change** (add after line 167, inside the `catsZioSteps` array after the entry for step 10):
```typescript
// ADD these entries to catsZioSteps array:
{ step: 11, title: "STM", description: "Software Transactional Memory", slug: "11-step" },
{ step: 12, title: "Concurrent Structures", description: "Ref, Queue, Hub, Semaphore", slug: "12-step" },
{ step: 13, title: "Configuration", description: "ZIO Config vs Ciris", slug: "13-step" },
{ step: 14, title: "HTTP", description: "ZIO HTTP vs http4s", slug: "14-step" },
{ step: 15, title: "Database", description: "ZIO JDBC vs Doobie/Skunk", slug: "15-step" },
```

---

- [x] **Update catsZioTimes Map in overview page.tsx** — Add time estimates for steps 11-15

**Why**: The overview page displays estimated time for each step. Without these entries, steps 11-15 will show no time estimate.

**File**: `packages/web/app/[toolPair]/page.tsx`

**Change** (add after line 200, inside the `catsZioTimes` Map constructor after the entry for step 10):
```typescript
// ADD these entries to catsZioTimes Map:
[11, "~5 min"],  // STM
[12, "~6 min"],  // Concurrent Structures
[13, "~5 min"],  // Configuration
[14, "~6 min"],  // HTTP
[15, "~6 min"],  // Database
```

---

- [x] **Update pairings.ts** — Change steps from 10 to 15, update estimated time

**Why**: The tool pairing registry controls step counts and time estimates displayed throughout the site.

**File**: `packages/web/content/pairings.ts`

**Changes** (lines 103-104 for cats-zio entry):
```typescript
// BEFORE
steps: 10,
estimatedTime: "~45 min",

// AFTER
steps: 15,
estimatedTime: "~70 min",  // ~47 min for steps 1-10 + ~28 min for steps 11-15
```

### P1: Content - Create New Steps

---

- [ ] **Create Step 11: STM** — Compare ZIO STM (built-in) vs cats-stm

**File**: `packages/web/content/comparisons/cats-zio/11-step.mdx` (CREATE)

**Frontmatter**:
```yaml
---
title: "Software Transactional Memory"
step: 11
description: "Compose atomic operations with STM"
zioCommands: ["TRef.make", "STM.succeed", "STM.retry", ".commit"]
ceCommands: ["TRef.of", "STM.pure", "STM.retry", "commit"]
---
```

**Key Topics from Zionomicon ch023-024**:
- **What is STM?** - Compose individual operations atomically as a single transaction
- **TRef interface** - Transactional reference (building block for STM)
- **STM.retry** - Optimistic locking (retries only when TRef changes)
- **STM data structures** - TMap, TQueue, TSet, TPriorityQueue, TArray
- **Committing** - `transaction.commit` converts STM blueprint to ZIO effect
- **STM limitations** - No arbitrary effects inside transactions, no concurrency operators

**Code Comparison**:
```scala
// ZIO STM (built-in)
for {
  from <- TRef.make(100)
  to   <- TRef.make(0)
  _ <- transfer(from, to, 50).commit
} yield ()

def transfer(from: TRef[Int], to: TRef[Int], amount: Int): STM[Nothing, Unit] =
  for {
    balance <- from.get
    _ <- if (balance < amount) STM.retry
         else from.update(_ - amount) *> to.update(_ + amount)
  } yield ()
```

**Key differences from cats-stm**:
- Both libraries have nearly identical APIs
- ZIO STM is built-in (no separate dependency)
- Both use optimistic concurrency with automatic retry

---

- [x] **Create Step 12: Concurrent Structures** — Ref, Queue, Hub, Promise, Semaphore

**File**: `packages/web/content/comparisons/cats-zio/12-step.mdx` (CREATE)

**Frontmatter**:
```yaml
---
title: "Concurrent Data Structures"
step: 12
description: "Ref, Queue, Hub, Promise, Semaphore for coordination"
zioCommands: ["Ref.make", "Queue.unbounded", "Hub.bounded", "Promise.make", "Semaphore.make"]
ceCommands: ["Ref.of", "Queue.unbounded", "Semaphore.apply", "Deferred"]
---
```

**Key Topics from Zionomicon ch011-015**:

**Promise** - Work synchronization (vs `Deferred` in CE)
**Queue** - Work distribution (unbounded, bounded, sliding, dropping)
**Hub** - Broadcasting (ZIO-only, no CE equivalent)
**Semaphore** - Work limiting

**Code Comparison**:
```scala
// ZIO (built-in)
for {
  queue <- Queue.unbounded[Int]
  _     <- queue.take.flatMap(work).forever.fork
  _     <- ZIO.foreachDiscard(1 to 10)(queue.offer)
} yield ()

// Cats Effect (cats-effect-std)
for {
  queue <- Queue.unbounded[IO, Int]
  _     <- queue.take.flatMap(work).forever.start
  _     <- IO.foreachDiscard(1 to 10)(queue.offer)
} yield ()
```

---

- [ ] **Create Step 13: Configuration** — ZIO Config vs Ciris

**File**: `packages/web/content/comparisons/cats-zio/13-step.mdx` (CREATE)

**Frontmatter**:
```yaml
---
title: "Application Configuration"
step: 13
description: "Load and validate configuration with ZIO Config"
zioCommands: ["ZIO.config", "Config.string", "Config.int", "ConfigProvider.envProvider"]
ceCommands: ["env", "default", "load"]
---
```

**Key Topics from Zionomicon ch022**:

**ZIO Config basics**:
```scala
case class AppConfig(host: String, port: Int)

object AppConfig {
  implicit val config: Config[AppConfig] = deriveConfig[AppConfig]
}

for {
  config <- ZIO.config[AppConfig]
} yield config
```

**Code Comparison**:
```scala
// ZIO Config
for {
  config <- ZIO.config[AppConfig](ConfigProvider.envProvider)
} yield config

// Ciris
val config = for {
  host <- env("HOST").as[String].default("localhost")
  port <- env("PORT").as[Int].default(8080)
} yield AppConfig(host, port)
config.load[IO]
```

---

- [ ] **Create Step 14: HTTP** — ZIO HTTP vs http4s

**File**: `packages/web/content/comparisons/cats-zio/14-step.mdx` (CREATE)

**Frontmatter**:
```yaml
---
title: "HTTP Clients and Servers"
step: 14
description: "Build HTTP clients and servers"
zioCommands: ["Http.route", "Http.collect", "Client.request", "Server.port"]
ceCommands: ["HttpRoutes.of", "BlazeServerBuilder", "Client.expect"]
---
```

**ZIO HTTP server**:
```scala
val app = Http.collect[Request] {
  case Method.GET -> Root / "hello" / name =>
    Response.text(s"Hello, $name!")
}

Server.serve(app)
```

**http4s comparison**:
```scala
val routes = HttpRoutes.of[IO] {
  case GET -> Root / "hello" / name =>
    Ok(s"Hello, $name!")
}
```

---

- [x] **Create Step 15: Database** — ZIO JDBC/Quill vs Doobie/Skunk

**File**: `packages/web/content/comparisons/cats-zio/15-step.mdx` (CREATED)

**Frontmatter**:
```yaml
---
title: "Database Access"
step: 15
description: "Query databases with transactions"
zioCommands: ["execute", "query", "transaction", "ZConnectionPool"]
ceCommands: ["sql", "update", "query", "transact"]
---
```

**ZIO JDBC**:
```scala
val tx = for {
  _ <- execute("INSERT INTO users (name) VALUES (?)", "Alice")
  users <- query("SELECT * FROM users").as[User]
} yield users
tx.transaction.orDie
```

**Doobie comparison**:
```scala
val tx = for {
  _ <- sql"INSERT INTO users (name) VALUES ($name)".update.run
  users <- sql"SELECT * FROM users".query[User].to[List]
} yield users
tx.transact(transactor)
```

### P2: Content - Enhance Existing Steps

---

- [x] **Update Step 1: R/E/A Signature** — Add `RIO`, variance notation, `URIO`

**Why**: Current content is accurate but missing important type aliases and variance explanation from Zionomicon ch003.

**File**: `packages/web/content/comparisons/cats-zio/01-step.mdx`

**Updates from Zionomicon ch003**:
- Add **variance notation**: `ZIO[-R, +E, +A]` (contravariant R, covariant E and A)
- Add **type aliases**: `RIO`, `URIO`
- Add **mental model**: `ZIO[R, E, A]` is like `R => Either[E, A]`
- Added type alias reference callout with all 5 aliases explained

---

- [x] **Update Step 2: Creating Effects** — Add utility constructors

**Why**: Current content shows basic constructors but misses useful utility methods from Zionomicon ch003, ch006.

**File**: `packages/web/content/comparisons/cats-zio/02-step.mdx`

**Updates from Zionomicon**:
- Add `ZIO.unit: UIO[Unit]` - Unit value
- Add `ZIO.never: ZIO[Any, Nothing, Nothing]` - Never completes
- Add `ZIO.fromTry[A](a: => Try[A]): Task[A]` - From Scala Try
- Add `ZIO.async[R, E, A]` - Callback-based effects (already exists)

**Completed** 2026-01-26:
- Added `ZIO.unit`, `ZIO.never`, `ZIO.fromTry` sections
- Updated frontmatter zioCommands/ceCommands lists
- All constructors now compared between ZIO and Cats Effect

---

- [x] **Update Step 3: Error Handling** — Add `foldZIO`, error recovery

**Why**: ZIO has powerful error handling operators from Zionomicon ch005.

**File**: `packages/web/content/comparisons/cats-zio/03-step.mdx`

**Updates from Zionomicon ch005**:
- Add **foldZIO** (effectful fold with both branches)
- Add **foldCauseZIO** (fold with full Cause including defects)
- Add **orElse**, **orElseFail**, **orElseEither**

**Completed** 2026-01-26:
- Added `foldZIO`, `foldCauseZIO` sections with code comparisons
- Added `orElse` variants section (`orElse`, `orElseFail`, `orElseEither`)
- Explained error vs defect distinction with Callout
- Updated frontmatter with new commands

---

- [ ] **Update Step 4: Map/FlatMap Purity** — Add utility operators

**Why**: Common utility operators from Zionomicon ch003 improve code readability.

**File**: `packages/web/content/comparisons/cats-zio/04-step.mdx`

**Updates from Zionomicon ch003**:
- Add `as[B](b: => B)` - Map to constant value
- Add `unit` - Discard value, return Unit
- Add `tap[R1 <: R, E1 >: E](f: A => ZIO[R1, E1, Any])` - Side effect
- Add `filterOrFail[E1 >: E](p: A => Boolean)(e: => E1)` - Filter or fail

---

- [ ] **Update Step 5: Dependency Injection** — Add `ZLayer.derive` modern pattern

**Why**: Zionomicon ch019-021 recommends `ZLayer.derive` as the modern approach.

**File**: `packages/web/content/comparisons/cats-zio/05-step.mdx`

**Updates from Zionomicon ch019-021**:

**ZLayer.derive** (modern pattern):
```scala
case class FooService(ref: Ref[Int], a: ServiceA, b: String)

object FooService {
  val layer: ZLayer[Ref[Int] with ServiceA with String, Nothing, FooService] =
    ZLayer.derive[FooService]  // Automatic derivation
}
```

**Error handling in layers**:
```scala
// Retry pattern
val layer = RemoteDatabase.layer.retry(
  Schedule.fibonacci(1.second) && Schedule.recurs(5)
)

// Fallback pattern
val layer = defaultLayer.orElse(fallbackLayer)
```

---

- [ ] **Update Step 6: Resource Management** — Add `Scope` interface

**Why**: The Scope model from Zionomicon ch016-018 is fundamental to ZIO 2.x.

**File**: `packages/web/content/comparisons/cats-zio/06-step.mdx`

**Updates from Zionomicon ch016-018**:

**Scope interface**:
```scala
trait Scope {
  def addFinalizer(finalizer: ZIO[Any, Nothing, Any]): ZIO[Any, Nothing, Unit]
  def close(exit: Exit[Any, Any]): ZIO[Any, Nothing, Unit]
}

object Scope {
  def make: UIO[Scope.Closeable]
}
```

**acquireRelease with Scope**:
```scala
def acquireRelease[R, E, A](
  acquire: ZIO[R, E, A]
)(release: A => ZIO[R, Nothing, Any]): ZIO[R with Scope, E, A]
```

**fromAutoCloseable**:
```scala
ZIO.fromAutoCloseable(ZIO.attempt(new FileInputStream("file.txt")))
```

---

- [ ] **Update Step 7: Fiber Supervision** — Add fork variants, raceEither

**Why**: ZIO has multiple fork strategies from Zionomicon ch007-010 for different concurrency needs.

**File**: `packages/web/content/comparisons/cats-zio/07-step.mdx`

**Updates from Zionomicon ch007-010**:

**Fork variants comparison**:
```scala
effect.fork         // In current scope (interrupted when parent scope closes)
effect.forkDaemon   // Global scope (outlives parent, use for background tasks)
effect.forkScoped   // Explicit scope management
```

**raceEither** (winner-takes-all with type info):
```scala
def raceEither[R1 <: R, E1 >: E, B](
  that: ZIO[R1, E1, B]
): ZIO[R1, E1, Either[A, B]]
```

---

- [ ] **Update Step 8: Streaming** — Add effectful operators, error recovery

**Why**: ZStream has powerful operators (not in Zionomicon - streaming-specific).

**File**: `packages/web/content/comparisons/cats-zio/08-step.mdx`

**Updates**:
- Add `mapZIO`, `filterZIO` (effectful operators)
- Add `groupedWithin` (time/size-based grouping)
- Add error recovery: `catchSome`, `retry`, `catchAll`
- Explain backpressure handling (automatic in ZStream)

---

- [ ] **Update Step 9: Application Structure** — Add Bootstrap, config, service access

**Why**: Real-world apps from Zionomicon ch022 need runtime configuration and service composition.

**File**: `packages/web/content/comparisons/cats-zio/09-step.mdx`

**Updates from Zionomicon ch022**:

**Bootstrap pattern**:
```scala
object MainApp extends ZIOAppDefault {
  override val bootstrap =
    Runtime.setConfigProvider(fromHoconFilePath("config.conf")) ++
      Runtime.removeDefaultLoggers

  def run = ???
}
```

**ZIO.config**:
```scala
case class AppConfig(host: String, port: Int)
object AppConfig {
  implicit val config: Config[AppConfig] = deriveConfig[AppConfig]
}

for {
  config <- ZIO.config[AppConfig]
  _      <- ZIO.debug(s"Server: ${config.host}:${config.port}")
} yield ()
```

**Structured logging**:
```scala
ZIO.log("Starting application")
ZIO.logInfo("User logged in")
ZIO.logError("Database connection failed")
```

---

- [x] **Verify Step 10: Interop** — Version `23.1.0.3` is correct (newer than spec's `3.1.1.0`)

**Status**: This step is already complete. The dependency version is correct at `3.1.1.0` and the interop coverage is comprehensive.

### P3: Landing Page & Glossary

- [ ] **Update index.mdx** — Add "Enterprise Integration" section for steps 11-15

**Why**: Landing page should list all available content including new steps.

**File**: `packages/web/content/comparisons/cats-zio/index.mdx`

**Changes**:
1. Update `estimatedTime` frontmatter from `"~45 min"` to `"~70 min"`
2. Add new section after step 10:
```markdown
┌─ Enterprise Integration ─────────────────────────────────┐
│                                                            │
│  ○  11. Software Transactional Memory           ~5 min   │
│  ○  12. Concurrent Structures                   ~6 min   │
│  ○  13. Configuration                           ~5 min   │
│  ○  14. HTTP Clients and Servers                ~6 min   │
│  ○  15. Database Access                         ~6 min   │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

---

- [ ] **Update glossary** — Add STM, CONFIG, HTTP, DATABASE categories and entries

**Why**: Glossary should include APIs from all 15 steps.

**File**: `packages/web/content/glossary/cats-zio.ts`

**Changes**:
1. Add new categories to type union: `"STM"`, `"CONFIG"`, `"HTTP"`, `"DATABASE"`
2. Add STM entries (Step 11): TRef.make, STM.retry, STM.commit, TMap, TQueue
3. Add CONFIG entries (Step 13): ZIO.config, Config.string, Config.int, ConfigProvider
4. Add HTTP entries (Step 14): Http.collect, Client.request, Response.text
5. Add DATABASE entries (Step 15): execute, query, transaction, ZConnectionPool
6. Update `getCategories()` to include new categories in order

### P4: Validation

- [ ] **Run full validation** — Execute `bun run build && bun run typecheck && bun run lint`

**Why**: Ensure all changes pass validation before considering complete.

**Command**: `cd packages/web && bun run build && bun run typecheck && bun run lint`

---

## Content Style Guidelines

Per `CLAUDE.md`:
- **Direct and concise** - No fluff, straight to technical points
- **Show, don't tell** - Lead with code examples
- **Side-by-side comparison** - Always show both CE and ZIO
- **No celebration language** - No "Congratulations!", "Amazing!"
- **Acknowledge difficulty** - "This is different from Cats Effect" is fine

### MDX Frontmatter Template

```yaml
---
title: "Step Title"
step: 11
description: "Brief description of what this step covers"
zioCommands: ["ZIO.succeed", "ZIO.fail", "ZIO.attempt"]
ceCommands: ["IO.pure", "IO.raiseError", "IO.delay"]
---
```

### Component Usage

- **ScalaComparisonBlock** for all code comparisons
- **Callout** for tips (`variant="tip"`), warnings (`variant="warning"`), notes (default)
- **ScastieEmbed** for interactive examples (optional)
- No **TryIt** components (cats-zio has `sandbox.enabled: false`)

---

## Architecture Notes

### Zionomicon Content Sources

All ZIO patterns are sourced from the Zionomicon (Sixth Release, August 28, 2025):

| Source | Location | Chapters |
|--------|----------|----------|
| **Zionomicon ePub** | `/tmp/zionomicon/EPUB/text/` | ch001-ch024 |
| **ZIO interop docs** | https://zio.dev/guides/interop/with-cats-effect/ | Web reference |

### Content Verification Priority

When Zionomicon contradicts other sources (ZIO 2.x docs, blog posts):
1. **Prefer Zionomicon** (authoritative source by ZIO creators)
2. Verify against zio.dev official docs
3. Check for library version differences (ZIO 2.x only)

### Step Dependencies

No strict dependencies between steps - each should be standalone. However:
- Steps 1-4 should be read in order (fundamentals)
- Steps 5-10 can be read independently (architecture topics)
- Steps 11-15 are advanced and assume familiarity with basics

---

## Task Count

**Total pending tasks**: 23 main tasks (P0-P4)
- P0 (Critical): 4 tasks — Infrastructure updates (COMPLETED)
- P1 (New Steps): 0 tasks — All new steps created (11-15)
- P2 (Enhance): 6 tasks — Update steps 4-9
- P3 (Landing): 2 tasks — Index page, glossary
- P4 (Validation): 1 task — Build/typecheck/lint

**Completed tasks**: 11/20 main tasks (55%)
- [x] P0: All infrastructure updates (generateStaticParams, overview page steps/times, pairings.ts)
- [x] Step 11: STM (11-step.mdx created, validated)
- [x] Step 12: Concurrent Structures (12-step.mdx created, validated)
- [x] Step 13: Configuration (13-step.mdx created, validated)
- [x] Step 14: HTTP (14-step.mdx created, validated)
- [x] Step 15: Database (15-step.mdx created, validated)
- [x] Step 10: Interop (version `23.1.0.3` is correct for ZIO 2.x)
- [x] Step 1: R/E/A Signature (added variance notation, RIO, URIO type aliases)
- [x] Step 2: Creating Effects (added ZIO.unit, ZIO.never, ZIO.fromTry)
- [x] Step 3: Error Handling (added foldZIO, foldCauseZIO, orElse variants)

**Progress**: 11/20 main tasks complete (55%)
**Remaining work**: Enhancements to steps 4-9, landing page updates

**Learned**:
- MDX string interpolation requires escaping `${}` as `\${}` to avoid JSX interpretation
- Scala backticks inside code blocks (like `Content-Type`) cause MDX parsing errors - avoid using backticked identifiers in ScalaComparisonBlock code

---

## Commands

```bash
# Development
bun run dev

# Content validation
bun run build          # Build all MDX content
bun run typecheck      # Verify TypeScript types
bun run lint           # Check formatting

# Test step content (navigate to specific step)
# http://localhost:3000/cats-zio/1
# http://localhost:3000/cats-zio/11
```

---

## Out of Scope

Per specification `specs/zionomicon-tutorial-update.md`:

- Interactive Scala sandbox for cats-zio (Scastie only, no REPL)
- Video content or tutorials
- Cats Effect 2.x compatibility
- ZIO 1.x compatibility
- Translation to other languages
- Modifying jj-git content (focus on cats-zio only)
- Creating additional tool comparisons beyond cats-zio

---

## Dependencies

**Content Sources**:
- Zionomicon ePub (Sixth Release, Aug 28, 2025) - `/tmp/zionomicon/EPUB/text/`
- zio.dev interop documentation - https://zio.dev/guides/interop/with-cats-effect/
- ZIO 2.x API reference - https://zio.dev/api
- Cats Effect 3.x documentation - https://typelevel.org/cats-effect/

**Internal Components**:
- `ScalaComparisonBlock` for all code comparisons
- `Callout` for tips/warnings/notes
- `ScastieEmbed` for interactive examples (optional)
