# Implementation Plan

> **Status**: Planning | **Last Updated**: 2025-01-26 | **Validation**: `bun run build && bun run typecheck`

## Summary

This plan covers the **Zionomicon Tutorial Update** for cats-zio (P5), the final phase of the toolkata implementation. All technical infrastructure (P0-P4) is complete: syntax highlighting, sandbox integration, bidirectional UX, and Scastie improvements are implemented and verified.

**Current state**: 18/18 technical tasks complete (100%). Remaining work is content-focused: updating 10 existing steps and creating 5 new advanced steps based on the Zionomicon eBook.

---

## Gap Analysis

### Already Implemented ✓

| Feature | Location | Status |
|---------|----------|--------|
| **P0-P4 All Tasks** | IMPLEMENTATION_PLAN.md (previous) | ✓ Complete |
| **Shiki syntax highlighting** | `ScalaComparisonBlock.tsx`, `next.config.ts` | ✓ Server + client highlighting |
| **Sandbox config** | `cats-zio/config.yml` | ✓ Disabled for cats-zio |
| **Shrinking layout** | `ShrinkingLayout.tsx`, `TerminalSidebar.tsx` | ✓ Focus trap removed |
| **Bidirectional UX** | `/scala-effects-demo` | ✓ 4-option prototype |
| **Scastie UUID snippets** | `ScastieEmbed.tsx` | ✓ Snippet loading supported |
| **Terminal state sync** | `TerminalSidebar.tsx:318-319` | ✓ Callbacks wired |

### Content Gaps (P5)

| Step | Current State | Required Updates | Zionomicon Source |
|------|---------------|------------------|-------------------|
| **1. R/E/A Signature** | Type signatures mostly correct | Add `RIO`, clarify variance, add `URIO` | ch003 (First Steps) |
| **2. Creating Effects** | Basic constructors covered | Add `unit`, `never`, `fromTry`, async patterns | ch003, ch006 (Integrating) |
| **3. Error Handling** | Good coverage | Add `foldZIO`, `sandbox`, error recovery | ch005 (Error Model) |
| **4. Map/FlatMap** | Sequential composition covered | Add `as`, `unit`, `tap`, `filterOrFail` | ch003 |
| **5. Dependency Injection** | Manual layer construction | Replace with `ZLayer.derive`, modern patterns | ch019-021 (DI chapters) |
| **6. Resource Management** | Basic acquireRelease | Add `Scope`, composition patterns, best practices | ch016-018 (Resources) |
| **7. Fiber Supervision** | Basic fork/join covered | Add supervision strategies, timeout, retry | ch007-010 (Fibers) |
| **8. Streaming** | ZStream basics | Add `mapZIO`, `filterZIO`, backpressure, error recovery | (Zionomicon doesn't cover) |
| **9. Application Structure** | ZIOAppDefault shown | Add Bootstrap, logging, Config integration | ch022 (Config) |
| **10. Interop** | Basic interop patterns | Update version to 3.1.1.0, add conversions, Throwable note | zio.dev interop docs |
| **11. STM** | ❌ MISSING | **NEW**: Compare ZIO STM vs cats-stm | ch023-024 (STM) |
| **12. Concurrent Structures** | ❌ MISSING | **NEW**: Ref, Queue, Hub, Promise vs CE std | ch011-015 (Concurrent) |
| **13. Configuration** | ❌ MISSING | **NEW**: ZIO Config vs Ciris | ch022 (Config) + research |
| **14. HTTP** | ❌ MISSING | **NEW**: ZIO HTTP vs http4s | (external research) |
| **15. Database** | ❌ MISSING | **NEW**: ZIO JDBC/Quill vs Doobie/Skunk | (external research) |

---

## Tasks

### P5: Zionomicon Tutorial Update

#### Phase 1: Zionomicon Research

**Note**: Zionomicon content has been extracted and analyzed. Key findings:

- **Chapter structure**: 24 chapters covering essentials → concurrency → resources → DI → STM
- **Type signatures**: Accurate `ZIO[R, E, A]` with proper variance (-R, +E, +A)
- **Modern patterns**: `ZLayer.derive` preferred over manual construction
- **Scope model**: `acquireRelease` returns `ZIO[R with Scope, E, A]`
- **STM**: Built-in with `TRef`, `TMap`, `TQueue`, `TPromise`, `TArray`
- **Concurrent structures**: `Ref`, `Promise`, `Queue`, `Hub`, `Semaphore` all covered

**Zionomicon chapter mapping for tutorial steps:**
| Step | Zionomicon Chapters | Key Concepts |
|------|---------------------|--------------|
| 1 | ch003 | Type parameters, aliases, basic constructors |
| 2 | ch003, ch006 | Effect constructors, conversions |
| 3 | ch005 | Error handling, catchAll, foldZIO |
| 4 | ch003 | Map/flatMap, sequential composition |
| 5 | ch019-021 | ZLayer, service pattern, derivation |
| 6 | ch016-018 | acquireRelease, Scope, bracket |
| 7 | ch007-010 | Fibers, supervision, race, timeout |
| 8 | (not in Zionomicon) | ZStream operators (keep current) |
| 9 | ch022 | ZIOAppDefault, Bootstrap, Config |
| 10 | zio.dev docs | zio-interop-cats 3.1.1.0 |
| 11 | ch023-024 | STM, TRef, TMap, TQueue |
| 12 | ch011-015 | Ref, Promise, Queue, Hub, Semaphore |

- [x] **Analyze Zionomicon type signatures** — Extracted exact signatures for `ZIO[R, E, A]`, `IO[E, A]`, `Task[A]`, `RIO[R, A]`, `UIO[A]`, `URIO[R, A]` from ch003. Verified variance notation (-R, +E, +A).

- [x] **Analyze effect constructors** — Extracted `ZIO.succeed`, `ZIO.fail`, `ZIO.attempt`, `ZIO.fromOption`, `ZIO.fromEither`, `ZIO.fromTry`, `ZIO.fromFuture`, `ZIO.async` from ch003 and ch006.

- [x] **Analyze error handling operators** — Extracted `catchAll`, `catchSome`, `mapError`, `fold`, `foldZIO`, `either`, `merge`, `refineOrDie` from ch005.

- [x] **Analyze composition patterns** — Extracted `map`, `flatMap`, `zip`, `zipWith`, `zipLeft` (`<*`), `zipRight` (`*>`), `foreach`, `collectAll` from ch003.

- [x] **Analyze dependency injection** — Extracted ZLayer patterns from ch019-021: `ZLayer.succeed`, `ZLayer.fromZIO`, `ZLayer.derive`, service pattern, layer composition.

- [x] **Analyze resource management** — Extracted `acquireRelease`, `Scope` interface, `ZIO.scoped`, resource composition, parallel finalizers from ch016-018.

- [x] **Analyze fiber model** — Extracted `fork`, `forkDaemon`, `forkScoped`, `join`, `await`, `interrupt`, supervision strategies, race patterns from ch007-010.

- [x] **Analyze concurrent structures** — Extracted `Ref`, `Promise`, `Queue`, `Hub`, `Semaphore` APIs with exact signatures from ch011-015.

- [x] **Analyze STM** — Extracted `TRef`, `TMap`, `TQueue`, `TPromise`, `TArray` APIs and transaction patterns from ch023-024.

- [x] **Analyze configuration** — Extracted ZIO Config patterns: `Config.string`, `Config.int`, nested config, validation, `ZIO.config`, `ConfigProvider` from ch022.

- [x] **Analyze application structure** — Extracted `ZIOAppDefault`, `Runtime`, Bootstrap, logging patterns from ch022.

#### Phase 2: Update Existing Steps

- [ ] **Update Step 1: R/E/A Signature** — Add missing type aliases (`RIO`, clarify `URIO`), explain variance with contravariant/covariant notation.

**Why**: Current content is mostly correct but missing `RIO[R, A] = ZIO[R, Throwable, A]` and variance explanation.

**File**: `packages/web/content/comparisons/cats-zio/01-step.mdx`

**Updates**:
- Add `RIO[R, A]` type alias
- Explain variance: `ZIO[-R, +E, +A]` (R is contravariant, E and A are covariant)
- Add comparison table of all ZIO type aliases vs Cats Effect `IO`

- [ ] **Update Step 2: Creating Effects** — Add missing constructors: `ZIO.unit`, `ZIO.never`, `ZIO.fromTry`, `ZIO.async`. Clarify `ZIO.succeed` vs `ZIO.succeedNow` difference.

**Why**: Current content shows basic constructors but misses common utility constructors and async integration.

**File**: `packages/web/content/comparisons/cats-zio/02-step.mdx`

**Updates**:
- Add `ZIO.unit` (single unit effect)
- Add `ZIO.never` (never-completing effect)
- Add `ZIO.fromTry` (Scala Try conversion)
- Add `ZIO.async` (callback-based effects)
- Clarify `succeed` (lazy evaluation) vs `succeedNow` (eager)

- [ ] **Update Step 3: Error Handling** — Add `foldZIO`, `sandbox`, `orElseFail`, `orElseEither`, error grouping with `firstSuccess`/`firstFailure`.

**Why**: Current content covers basics but misses powerful error handling operators unique to ZIO.

**File**: `packages/web/content/comparisons/cats-zio/03-step.mdx`

**Updates**:
- Add `foldZIO` (effectful fold with both branches)
- Add `sandbox` (capture full error cause)
- Add `orElseFail`, `orElseEither` (error recovery)
- Add `firstSuccess`, `firstFailure` (combining effects)

- [ ] **Update Step 4: Map/FlatMap Purity** — Add `as`, `unit`, `tap`, `tapBoth`, `filter`, `filterOrFail`. Add parallel operators: `raceWith`, `timeout`.

**Why**: Current content covers basics but misses common utility operators and parallel patterns.

**File**: `packages/web/content/comparisons/cats-zio/04-step.mdx`

**Updates**:
- Add `as` (map to constant value)
- Add `unit` (convert to unit)
- Add `tap`, `tapBoth` (side effects)
- Add `filter`, `filterOrFail` (value filtering)
- Add `raceWith` (custom race behavior)
- Add `timeout` (time-bound execution)

- [ ] **Update Step 5: Dependency Injection** — **MAJOR UPDATE**: Replace all manual layer construction with `ZLayer.derive`. Add modern service pattern with `ZIO.service`, `ZIO.serviceWithZIO`. Add configuration integration with `@name` annotations.

**Why**: Current content uses outdated manual construction patterns. Zionomicon recommends `ZLayer.derive` as the modern approach.

**File**: `packages/web/content/comparisons/cats-zio/05-step.mdx`

**Updates**:
- Replace `ZLayer.fromZIO` with `ZLayer.derive[ServiceImpl]`
- Show service pattern: trait + case class implementation + companion object
- Add `ZIO.service[Service]` accessor pattern
- Add `ZIO.serviceWith[Service]` and `ZIO.serviceWithZIO[Service]`
- Show layer composition with `>>>` operator
- Add configuration example with `ZIO.config[Config]`
- Add test layer example

**Key Zionomicon patterns to apply**:
```scala
// OLD (manual)
val layer = ZLayer.fromZIO {
  for {
    dep1 <- ZIO.service[Dependency1]
    dep2 <- ZIO.service[Dependency2]
  } yield Service(dep1, dep2)
}

// NEW (derived)
object ServiceImpl {
  val layer = ZLayer.derive[ServiceImpl]
}
```

- [ ] **Update Step 6: Resource Management** — **MAJOR UPDATE**: Add `Scope` interface explanation, show `acquireRelease` returns `ZIO[R with Scope, E, A]`, demonstrate `ZIO.scoped` usage, add parallel resource acquisition with `zipPar`.

**Why**: Current content shows basic `acquireRelease` but doesn't explain the Scope model which is fundamental to ZIO 2.x.

**File**: `packages/web/content/comparisons/cats-zio/06-step.mdx`

**Updates**:
- Add `Scope` trait interface (`addFinalizer`, `close`)
- Explain `acquireRelease` signature includes `Scope`
- Add `ZIO.scoped` for explicit scope management
- Show `scope.extend` for extending resource lifetime
- Add parallel resource acquisition with `zipPar`
- Add `parallelFinalizers` for concurrent cleanup
- Add `fromAutoCloseable` for Java/Scala resources

**Key Zionomicon patterns**:
```scala
// Basic scope usage
ZIO.scoped {
  for {
    file <- file("data.txt")
    content <- readFile(file)
  } yield content
} // file automatically closed

// Parallel resource acquisition
(file("a.txt") zipPar file("b.txt")).flatMap { case (a, b) =>
  // use both files
}
```

- [ ] **Update Step 7: Fiber Supervision** — **MAJOR UPDATE**: Add supervision strategies explanation, show `fork` vs `forkDaemon` vs `forkScoped`, add `raceEither`, timeout patterns, retry policies.

**Why**: Current content shows basic fork/join but misses supervision strategies and structured concurrency guarantees.

**File**: `packages/web/content/comparisons/cats-zio/07-step.mdx`

**Updates**:
- Explain default supervision model (structured concurrency)
- Show `fork` (current scope) vs `forkDaemon` (global scope) vs `forkScoped` (explicit scope)
- Add `Fiber.join` vs `Fiber.await` (Exit value vs result)
- Add `raceEither` (winner-takes-all concurrency)
- Add timeout implementation pattern
- Add retry policies with `Schedule`
- Show circuit breaker pattern

**Key Zionomicon patterns**:
```scala
// Supervision strategies
child.fork       // Dies with parent
child.forkDaemon // Outlives parent (global scope)
child.forkScoped // Explicit scope management

// Race pattern
val race = zio1.raceEither(zio2).map {
  case Left(value)  => value
  case Right(value) => value
}

// Timeout pattern
def timeout[R, E, A](zio: ZIO[R, E, A], duration: Duration): ZIO[R, E, Option[A]] =
  zio.raceEither(ZIO.sleep(duration)).map {
    case Left(value) => Some(value)
    case Right(_)   => None
  }
```

- [ ] **Update Step 8: Streaming** — Enhance with `mapZIO`, `filterZIO`, `groupedWithin`, transducer patterns, backpressure explanation, error recovery strategies.

**Why**: Current content shows basic ZStream operators. Zionomicon doesn't cover streaming extensively, but ZStream has many powerful operators.

**File**: `packages/web/content/comparisons/cats-zio/08-step.mdx`

**Updates**:
- Add `mapZIO`, `filterZIO` (effectful operators)
- Add `groupedWithin` (time/size-based grouping)
- Add transducer patterns (`transduce`)
- Explain backpressure handling (automatic in ZStream)
- Add error recovery: `catchSome`, `retry`, `catchAll`
- Add `ZStream.fromZIO` and `ZStream.scoped` for resource-safe streams

**Note**: Since Zionomicon doesn't cover streaming, use ZIO 2.x documentation for accurate operator signatures.

- [ ] **Update Step 9: Application Structure** — **MAJOR UPDATE**: Add `ZIOApp` vs `ZIOAppDefault` distinction, show `Runtime.removeDefaultLoggers` bootstrap, add `ZIO.config` for configuration, demonstrate service requirements with `ZIO.service[Service]`.

**Why**: Current content shows `ZIOAppDefault` but doesn't explain Bootstrap configuration or service requirements pattern.

**File**: `packages/web/content/comparisons/cats-zio/09-step.mdx`

**Updates**:
- Explain `ZIOApp` vs `ZIOAppDefault` (Exit code handling)
- Add `bootstrap` layer for runtime configuration
- Show `Runtime.setConfigProvider` for config
- Add `ZIO.config[AppConfig]` usage
- Demonstrate service access with `ZIO.service[Service]`
- Add structured logging with `ZIO.log` and log levels
- Show graceful shutdown with `ZIO.addFinalizer`

**Key Zionomicon patterns**:
```scala
object Main extends ZIOAppDefault {
  override val bootstrap =
    Runtime.removeDefaultLoggers >>>
    Runtime.setConfigProvider(ConfigProvider.envProvider)

  def run = for {
    config <- ZIO.config[AppConfig]
    service <- ZIO.service[MyService]
    _ <- service.run
  } yield ()
}
```

- [ ] **Update Step 10: Interop** — Update dependency version to `zio-interop-cats 3.1.1.0`, add Resource↔Managed conversions, add Stream↔ZStream conversions, note Throwable-only constraint.

**Why**: Current content shows `23.1.0.3` (outdated) and misses important conversion patterns.

**File**: `packages/web/content/comparisons/cats-zio/10-step.mdx`

**Updates**:
- Update dependency: `"dev.zio" %% "zio-interop-cats" % "3.1.1.0"`
- Add `Resource#toManaged` (CE → ZIO Resource conversion)
- Add `ZManaged#toResource` (ZIO → CE Resource conversion)
- Add `fs2.Stream#toZStream()` conversion
- Add `ZStream#toFs2Stream` conversion
- Add note: interop only works with `Throwable` error types
- Show error type conversion patterns

**Key interop patterns**:
```scala
// Resource interop
import zio.interop.catz._
val managed: Resource[Task, A] = ...
val zioManaged: ZManaged[Any, Throwable, A] = managed.toManaged

// Stream interop
import zio.stream.interop.fs2z._
val fs2Stream: fs2.Stream[Task, A] = ...
val zioStream: ZStream[Any, Throwable, A] = fs2Stream.toZStream()
```

#### Phase 3: Create New Advanced Steps

- [ ] **Create Step 11: STM** — Compare ZIO STM (built-in) vs cats-stm. Cover `TRef`, `TMap`, `TQueue`, `TPromise`, `TArray`, transaction composition, `STM.retry` for locking.

**Why**: STM is a powerful ZIO feature not available in standard Cats Effect.

**File**: `packages/web/content/comparisons/cats-zio/11-step.mdx` (CREATE)

**Content outline**:
- Title: "Software Transactional Memory"
- ZIO STM basics: `type STM[+E, +A] = ZSTM[Any, E, A]`
- TRef for transactional references
- STM operators: `get`, `set`, `update`, `modify`
- Transaction composition: `transfer` example (atomic bank transfer)
- `STM.retry` for optimistic locking
- TMap, TQueue, TPromise, TArray
- STM limitations (no arbitrary effects, no concurrency operators)
- Comparison: cats-stm requires external library

**Code comparison**:
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
    _ <- if (balance < amount) STM.fail("Insufficient")
         else from.update(_ - amount) *> to.update(_ + amount)
  } yield ()

// cats-stm (external library)
// (similar API but requires separate dependency)
```

- [ ] **Create Step 12: Concurrent Structures** — Compare ZIO (Ref, Promise, Queue, Hub, Semaphore) vs cats-effect-std. Cover work distribution, broadcasting, rate limiting.

**Why**: ZIO includes these structures in core, while Cats Effect requires cats-effect-std.

**File**: `packages/web/content/comparisons/cats-zio/12-step.mdx` (CREATE)

**Content outline**:
- Title: "Concurrent Data Structures"
- `Ref` for shared mutable state (vs `Ref` in cats-effect-std)
- `Promise` for work synchronization (vs `Deferred` in CE)
- `Queue` for work distribution (vs `Queue` in cats-effect-std)
- `Hub` for broadcasting (ZIO-only, no CE equivalent)
- `Semaphore` for rate limiting (vs `Semaphore` in cats-effect-std)
- Queue strategies: unbounded, bounded, sliding, dropping
- Example: Producer-consumer pattern with Queue
- Example: Pub-sub pattern with Hub

**Code comparison**:
```scala
// ZIO (built-in)
for {
  queue <- Queue.unbounded[Int]
  _ <- queue.offer(42)
  value <- queue.take
} yield value

// Cats Effect (cats-effect-std)
for {
  queue <- Queue.unbounded[IO, Int]
  _ <- queue.offer(42)
  value <- queue.take
} yield value
```

- [ ] **Create Step 13: Configuration** — Compare ZIO Config vs Ciris. Cover config descriptors, providers (env, props, HOCON), validation, nested config.

**Why**: Configuration is a critical application concern. ZIO Config is feature-rich and type-safe.

**File**: `packages/web/content/comparisons/cats-zio/13-step.mdx` (CREATE)

**Content outline**:
- Title: "Application Configuration"
- ZIO Config basics: `Config` descriptor, `ConfigProvider`
- Basic types: `Config.string`, `Config.int`, `Config.secret`
- Automatic derivation with `zio-config-magnolia`
- Nested configuration with `.nested("section")`
- Validation: `.validate("message")(predicate)`
- Providers: env, props, HOCON (typesafe-config)
- Loading: `ZIO.config[AppConfig]`
- Comparison: Ciris (similar API but different approach)

**Code comparison**:
```scala
// ZIO Config
case class AppConfig(host: String, port: Int)

object AppConfig {
  implicit val config: Config[AppConfig] =
    (Config.string("host"), Config.int("port"))
      .mapN(AppConfig.apply)
}

for {
  config <- ZIO.config[AppConfig](ConfigProvider.envProvider)
} yield config

// Ciris
case class AppConfig(host: String, port: Int)

val config = for {
  host <- env("HOST").as[String]
  port <- env("PORT").as[Int]
} yield AppConfig(host, port)

config.load[IO]
```

- [ ] **Create Step 14: HTTP** — Compare ZIO HTTP vs http4s. Cover server routes, client requests, middleware, streaming.

**Why**: HTTP is fundamental to most applications. Both libraries have different approaches.

**File**: `packages/web/content/comparisons/cats-zio/14-step.mdx` (CREATE)

**Content outline**:
- Title: "HTTP Clients and Servers"
- ZIO HTTP server: `Http.route`, `Http.collect`
- ZIO HTTP client: `Client.request`, `ZClient`
- http4s server: `HttpRoutes.of`, `BlazeServerBuilder`
- http4s client: `Client[IO].expect`
- Route patterns: path matching, query parameters
- Streaming: ZStream vs fs2.Stream
- Middleware: CORS, logging, authentication

**Code comparison**:
```scala
// ZIO HTTP
val app = Http.collect[Request] {
  case Method.GET -> Root / "hello" / name =>
    Response.text(s"Hello, $name!")

}

val server = Server.port(8080) ++ Server.app(app)

// http4s
val routes = HttpRoutes.of[IO] {
  case GET -> Root / "hello" / name =>
    Ok(s"Hello, $name!")
}

val server = BlazeServerBuilder[IO]
  .bindHttp(8080)
  .withHttpApp(routes.orNotFound)
  .resource
```

- [ ] **Create Step 15: Database** — Compare ZIO JDBC/Quill vs Doobie/Skunk. Cover connection pooling, queries, transactions, streaming results.

**Why**: Database access is essential. Different libraries have different approaches to type safety and transactions.

**File**: `packages/web/content/comparisons/cats-zio/15-step.mdx` (CREATE)

**Content outline**:
- Title: "Database Access"
- ZIO JDBC: JDBC connection, transactions, update/query
- ZIO Quill: Type-safe SQL queries, projections
- Doobie: Connection IO, fragments, queries
- Skunk: PostgreSQL protocol, type-safe commands
- Transaction patterns: `ZIO.transaction` vs `transact`
- Streaming results: `ZStream.fromResultSet` vs `stream`
- Connection pooling configuration

**Code comparison**:
```scala
// ZIO JDBC
val tx = for {
  _ <- execute("INSERT INTO users (name) VALUES (?)", "Alice")
  users <- query("SELECT * FROM users").as[User]
} yield users

tx.transaction.orDie

// Doobie
val tx = for {
  _ <- sql"INSERT INTO users (name) VALUES ($name)".update.run
  users <- sql"SELECT * FROM users".query[User].to[List]
} yield users

transact(tx)
```

#### Phase 4: Configuration Updates

- [ ] **Update pairings.ts** — Change `steps: 10` to `steps: 15`, update `estimatedTime` from "~50 min" to "~75 min" (5 min per step avg).

**Why**: Adding 5 new steps requires configuration update.

**File**: `packages/web/content/pairings.ts`

- [ ] **Update index.mdx** — Add "Advanced Topics" section after step 10, listing steps 11-15 with brief descriptions.

**Why**: Landing page should reflect all available content.

**File**: `packages/web/content/comparisons/cats-zio/index.mdx`

**Add section**:
```markdown
## Advanced Topics

11. [Software Transactional Memory](/cats-zio/11) — Compose atomic operations with STM
12. [Concurrent Structures](/cats-zio/12) — Ref, Queue, Hub, Semaphore for coordination
13. [Configuration](/cats-zio/13) — Load and validate configuration with ZIO Config
14. [HTTP](/cats-zio/14) — Build HTTP clients and servers
15. [Database](/cats-zio/15) — Query databases with transactions
```

- [ ] **Verify routing** — Ensure dynamic route `packages/web/app/[toolPair]/[step]/page.tsx` handles steps 11-15 via `generateStaticParams()`.

**Why**: Existing routing should work automatically, but verification needed.

**File**: `packages/web/app/[toolPair]/[step]/page.tsx`

**Check**: The `generateStaticParams` function uses `pairing.steps` to generate routes. After updating `pairings.ts`, this should work automatically.

#### Phase 5: Validation

- [ ] **Run full validation** — Execute `cd packages/web && bun run build && bun run typecheck && bun run lint`.

**Why**: Ensure all changes pass validation before considering complete.

#### Glossary Update

- [ ] **Update glossary API mappings** — Review `packages/web/content/glossary/cats-zio.ts` and ensure entries reflect ZIO 2.x and Cats Effect 3 APIs used in updated steps. Add entries for STM, concurrent structures, config.

**File**: `packages/web/content/glossary/cats-zio.ts`

**Potential additions**:
- STM entries: `TRef`, `TMap`, `TQueue`, `TPromise`, `STM.succeed`, `STM.retry`
- Concurrent entries: `Ref.make`, `Promise.make`, `Queue.unbounded`, `Hub.bounded`, `Semaphore.make`
- Config entries: `ZIO.config`, `Config.string`, `ConfigProvider.envProvider`

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
- **Callout** for tips (`type="tip"`), warnings (`type="warning"`), notes (default)
- **ScastieEmbed** for interactive examples (optional)
- No **TryIt** components (cats-zio has `sandbox: enabled: false`)

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
- Steps 5-7 can be read independently (architecture topics)
- Steps 11-15 are advanced and assume familiarity with basics

---

## Task Count

**Total pending tasks**: 30
- Phase 1: 0 tasks (research complete)
- Phase 2: 10 tasks (update existing steps 1-10)
- Phase 3: 5 tasks (create new steps 11-15)
- Phase 4: 3 tasks (configuration updates)
- Phase 5: 1 task (validation)
- Glossary: 1 task (update API mappings)

**Completed tasks**: 18 (P0-P4 technical implementation + bug fixes)

**Progress**: 18/48 tasks complete (37.5%)
**Remaining work**: Content creation for steps 1-15

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
