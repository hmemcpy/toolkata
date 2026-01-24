# Cats Effect 3 ↔ ZIO 2.x: Concept Mapping Reference

This document provides a comprehensive mapping between Cats Effect 3 and ZIO 2.x concepts, APIs, and mental models. It serves as a reference for developers transitioning between these two effect systems.

---

## Table of Contents

1. [Type Equivalence](#1-type-equivalence)
2. [Operation Equivalence](#2-operation-equivalence)
3. [Semantic Differences](#3-semantic-differences)
4. [Mental Model Differences](#4-mental-model-differences)
5. [Common Gotchas](#5-common-gotchas)
6. [Quick Reference Card](#6-quick-reference-card)

---

## 1. Type Equivalence

### Core Effect Types

| Cats Effect 3 | ZIO 2.x | Notes |
|---------------|---------|-------|
| `IO[A]` | `UIO[A]` (alias for `ZIO[Any, Nothing, A]`) | Simple effect that cannot fail |
| `IO[E, A]` (not common) | `ZIO[Any, E, A]` | Effect that can fail with error type E |
| N/A (use Throwable) | `ZIO[R, E, A]` | ZIO has an additional environment parameter R |
| `IO[Nothing, A]` | `URIO[R, A]` | Unlifted effect with environment R |
| `Resource.IO[IO, A]` | `ZManaged[R, E, A]` | Resource management with automatic cleanup |
| `Fiber[IO, Throwable, A]` | `Fiber[E, A]` | Handle to a running computation |
| `IO[_]` (any error) | `Task[A]` (alias for `ZIO[Any, Throwable, A]`) | Effect that can fail with Throwable |
| N/A | `RIO[R, A]` (alias for `ZIO[R, Throwable, A]`) | Effect with environment that can fail |
| N/A | `IO[E, A]` (lowercase i, deprecated) | **Note:** ZIO 2.x deprecated lowercase `io` package |

**Key Difference:** ZIO's type signature includes three parameters `[R, E, A]` where:
- **R**: Environment (dependencies/context)
- **E**: Error type
- **A**: Success type

Cats Effect's `IO` only has `IO[E, A]` where E is almost always `Throwable` (or omitted for infallible effects).

### Runtime Types

| Cats Effect 3 | ZIO 2.x | Notes |
|---------------|---------|-------|
| `IORuntime` | `Runtime[R]` | Execution engine for effects |
| `IORuntime.Config` | `RuntimeConfig` | Runtime configuration |
| `unsafe.IORuntime` | `defaultRuntime` | Default/global runtime instance |
| `IOApp` | `ZIOAppDefault` | Application entry point |
| `unsafe.FiberMonitor` | `FiberRuntime` | Fiber monitoring/internal runtime |

### Concurrency Primitives

| Cats Effect 3 | ZIO 2.x | Purpose |
|---------------|---------|---------|
| `Ref[IO, A]` | `Ref[A]` | Atomic mutable reference |
| `Deferred[IO, A]` | `Promise[E, A]` | One-time coordination primitive |
| `MVar[IO, A]` | `Queue[A]` (with capacity 1) | Mutable variable with blocking |
| N/A | `Hub[A]` | Broadcast queue (publish-subscribe) |
| N/A | `TRef[A]` (STM) | Transactional reference |
| `Semaphore[IO]` | `Semaphore` | Counting semaphore |
| `Console[IO]` | `Console` | Console I/O operations |

---

## 2. Operation Equivalence

### Creating Effects

| Purpose | Cats Effect 3 | ZIO 2.x | Notes |
|---------|---------------|---------|-------|
| Pure value | `IO.pure(a)` or `IO(a)` | `ZIO.succeed(a)` | CE3 also has `IO.delay` for laziness |
| Lazy evaluation | `IO.delay(expr)` or `IO { expr }` | `ZIO.suspend(expr)` | Both defer evaluation |
| Failed effect | `IO.raiseError(e)` | `ZIO.fail(e)` | Explicit error in error channel |
| Wrap side effect | `IO.blocking { ... }` | `ZIO.attemptBlocking { ... }` | Blocking operation |
| Wrap throwable | `IO { throwableCode }` | `ZIO.attempt { throwableCode }` | CE3: defer + catch, ZIO: attempt |
| Async callback | `IO.async { cb => ... }` | `ZIO.async { cb => ... }` | Similar callback signature |
| Async cancellation | `IO.async_ { cb => ... }` | `ZIO.asyncInterrupt { ... }` | ZIO exposes cancellation explicitly |
| Never completes | `IO.never` | `ZIO.never` | Hangs forever |
| Unit/void | `IO.unit` | `ZIO.unit` | Successful effect with no value |
| Die/defect | `IO.deferred { throw new Exception }` | `ZIO.die(new Exception)` | Unrecoverable failure (defect) |

### Sequencing Effects

| Purpose | Cats Effect 3 | ZIO 2.x | Notes |
|---------|---------------|---------|-------|
| Sequence (map) | `io.map(f)` | `zio.map(f)` | Same semantics |
| Sequence (flatMap) | `io.flatMap(f)` | `zio.flatMap(f)` | Monadic binding |
| Sequence (both, discard second) | `io1 *> io2` or `io1 >> io2` | `zio1 *> zio2` or `zio1 >> zio2` | Right-biased composition |
| Sequence (both, discard first) | `io1 <* io2` or `io1 << io2` | `zio1 <* zio2` or `zio1 << zio2` | Left-biased composition |
| Sequence (both, keep both) | `io1.product(io2)` or `(io1, io2).tupled` | `zio1.zip(zio2)` | Combine as tuple |
| Parallel both | `io1.parZip2(io2)` or `(io1, io2).parTupled` | `zio1.zipPar(zio2)` | Run both concurrently |
| Parallel first wins | `IO.race(io1, io2)` | `zio1.race(zio2)` | First to succeed wins |
| Parallel both succeed | `IO.both(io1, io2)` | `zio1.zipPar(zio2)` | Both must succeed |
| Parallel either | `IO.racePair(io1, io2)` | `zio1.raceFirst(zio2)` | ZIO: first to complete (success or failure) |

### Error Handling

| Purpose | Cats Effect 3 | ZIO 2.x | Notes |
|---------|---------------|---------|-------|
| Catch all errors | `io.handleErrorWith(f)` | `zio.catchAll(f)` | Recover from any error |
| Catch specific error | `io.handleErrorWith { case e => ... }` | `zio.catchSome { case e => ... }` | Pattern matching on errors |
| Catch specific error (typed) | No built-in (use pattern matching) | `zio.catchSomeSpecific { case e => ... }` | Typed error handling in ZIO |
| Recover with value | `io.handleError(_ => a)` | `zio.orElse(a)` or `zio.catchAll(_ => ZIO.succeed(a))` | Provide fallback value |
| Recover with effect | `io.handleErrorWith(e => io2)` | `zio.catchAll(e => zio2)` | Provide fallback effect |
| Attempt to Either | `io.attempt` | `zio.either` | `IO[Either[Throwable, A]]` ↔ `ZIO[R, Nothing, Either[E, A]]` |
| Tap error | `io.onError(e => ...)` | `zio.tapError(e => ...)` | Side effect on error |
| Retrying | `io.retry(Schedule...)` | `zio.retry(Schedule...)` | Both use retry policies |
| Fallback effect | `io.orElse(io2)` | `zio.orElse(zio2)` | Try alternative on failure |
| Fallback to value | `io.getOrElse(a)` | `zio.getOrElse(a)` | Provide default value |
| Convert error to defect | No built-in (use `IO.deferred`) | `zio.orDie` | Treat error as unrecoverable |
| Convert specific error to defect | No built-in | `zio.orDieSpecific` | Typed error to defect |

### Resource Management

| Purpose | Cats Effect 3 | ZIO 2.x | Notes |
|---------|---------------|---------|-------|
| Bracket pattern | `IO.bracket(acquire)(use)(release)` | `ZIO.acquireRelease(acquire)(release).flatMap(use)` | CE3: bracket, ZIO: acquireRelease |
| Resource composable | `Resource[IO, A]` | `ZManaged[R, E, A]` | Reusable resource abstraction |
| Use resource | `resource.use(a => io)` | `managed.use(a => zio)` | Auto-release after use |
| Guaranteed finalizer | `IO.onCancel(finalizer)` | `zio.onExit(exit => ...)` or `zio.ensuring(zio2)` | CE3: on cancel only, ZIO: on any exit |
| Finalizer on success | `IO.guaranteeCase { case Outcome.Succeeded => ... }` | `zio.onExit { case Exit.Success => ... }` | Pattern match on outcome |
| Scope-based cleanup (CE3) | `Resource.eval(...)` with `Kleisli` scope | `ZIO.scoped { ... }` | ZIO 2.0+ has explicit scopes |

### Concurrent Operations

| Purpose | Cats Effect 3 | ZIO 2.x | Notes |
|---------|---------------|---------|-------|
| Parallel N | `io.parSequenceN(n)(list)` | `ZIO.foreachPar(list)(f).withParallelism(n)` | Limit concurrency |
| Parallel unlimited | `io.parSequence(list)` or `list.parSequence` | `ZIO.foreachPar(list)(f)` | Parallel traverse |
| Parallel map | `list.parMap(f)` | `ZIO.collectAllPar(list.map(f))` | Transform in parallel |
| Race (first success) | `IO.race(io1, io2)` | `zio1.race(zio2)` | First to succeed wins |
| Race (first complete) | `IO.racePair(io1, io2)` | `zio1.raceFirst(zio2)` | First to complete (even failure) |
| Race (either) | `IO.racePair(io1, io2).map { ... }` | `zio1.raceEither(zio2)` | Get winner as Either |
| Fork background | `io.start` | `zio.fork` | Start fiber, get handle |
| Fork daemon | `io.background.use` | `zio.forkDaemon` | Daemon fiber (auto-daemon in ZIO) |
| Join fiber | `fiber.join` | `fiber.join` | Wait for completion |
| Interrupt fiber | `fiber.cancel` | `fiber.interrupt` | Cancel/interrupt fiber |
| Wait for both | `fiber1.join.flatMap(_ => fiber2.join)` | `fiber1.zip(fiber2)` or use `ZIO.collectAll` | Combine fibers |
| Race fibers | `io1.race(io2).void` | `zio1.raceFirst(zio2)` | Race forked fibers |

### Scheduling and Time

| Purpose | Cats Effect 3 | ZIO 2.x | Notes |
|---------|---------------|---------|-------|
| Sleep | `IO.sleep(duration)` | `ZIO.sleep(duration)` | Same semantics |
| Delay execution | `io.delayBy(duration)` or `io.sleep(duration) *> io` | `zio.delay(duration)` or `ZIO.sleep(duration) *> zio` | Defer effect |
| Timeout | `io.timeout(duration)` | `zio.timeout(duration)` | `IO[Option[A]]` ↔ `ZIO[R, E, Option[A]]` |
| Timeout to error | `io.timeoutTo(duration, fallback)` | `zio.timeoutTo(duration, fallback)` | Custom timeout behavior |
| Schedule (repeat) | `io.andThen(io).repeat` | `zio.repeat(Schedule...)` | ZIO has rich Schedule DSL |
| Schedule (fixed rate) | Use `IO.race` with `IO.sleep` | `zio.repeat(Schedule.spaced(duration))` | Fixed delay |
| Schedule (exponential backoff) | Manual with `IO.sleep` | `zio.repeat(Schedule.exponential(duration))` | Built-in strategies |

### Fiber Operations

| Purpose | Cats Effect 3 | ZIO 2.x | Notes |
|---------|---------------|---------|-------|
| Get fiber ID | `fiber.id` | `fiber.id` | Unique identifier |
| Poll fiber status | `fiber.join` (blocks) | `fiber.status` (immediate) | ZIO can check without blocking |
| Join fiber | `fiber.join` | `fiber.join` | Wait for result |
| Cancel fiber | `fiber.cancel` | `fiber.interrupt` | Interrupt execution |
| Race fibers | `IO.race(io1, io2)` (forks internally) | `zio1.race(zio2)` | Race creates fibers |
| Parallel fibers | `io1.parZip2(io2)` | `zio1.zipPar(zio2)` | Run both in parallel |
| Fiber ref (local) | `FiberRef[IO, A]` | `FiberRef[A]` | Fiber-local storage |
| Fiber dump | No built-in | `fiber.dump` | Debug fiber state (ZIO) |

---

## 3. Semantic Differences

### 3.1 Error Channel Behavior

#### Fatal vs Non-Fatal Errors

**Cats Effect 3:**
- All errors in the error channel are **recoverable** by default
- **Fatal errors** (like `VirtualMachineError`, `ThreadDeath`, `InterruptedException`) are NOT caught in the error channel
- Fatal errors directly propagate and crash the runtime
- Use `IO.deferred` or `IO.blocking` for code that might throw fatal errors

```scala
// Cats Effect 3
val io = IO.raiseError(new Exception("recoverable"))
  .handleErrorWith(e => IO.println(s"Caught: $e"))

val fatalIO = IO.delay {
  throw new OutOfMemoryError("fatal") // Not caught by handleErrorWith
}
```

**ZIO 2.x:**
- All errors in the error channel are **non-fatal** by default
- **Defects** (fatal errors) are represented separately via `ZIO.die` or `ZIO.dieMessage`
- Defects cannot be recovered with `catchAll` - they must use `catchSomeCause` or `catchAllCause`
- Use `ZIO.attempt` for code that might throw (catches non-fatal only)
- Use `ZIO.attemptBlocking` for blocking code

```scala
// ZIO 2.x
val zio = ZIO.fail(new Exception("recoverable"))
  .catchAll(e => ZIO.logError(s"Caught: $e"))

val defectZIO = ZIO.attempt {
  throw new OutOfMemoryError("fatal") // Becomes a defect
}.catchAllCause(cause => ZIO.logError(s"Caught defect: $cause"))
```

**Key Difference:**
- **CE3**: Fatal errors bypass error channel entirely (implicit)
- **ZIO**: Defects are explicit in type system via `Cause` type

#### Error Types

| Aspect | Cats Effect 3 | ZIO 2.x |
|--------|---------------|---------|
| Error type | Fixed to `Throwable` in `IO` | Polymorphic error type `E` |
| Typed errors | Possible with `IO[E, A]` but uncommon | Built-in with `ZIO[R, E, A]` |
| Error union | No built-in support | Use `ZIO[R, E1 \| E2, A]` (union types) |
| Error refinement | Manual pattern matching | Built-in `ZIO#mapError`, `#orDie`, `#orDieSpecific` |
| Defect tracking | No separate defect type | `Cause` type tracks failures + defects + interruptions |

### 3.2 Environment Pattern

**Cats Effect 3:**
- **No built-in dependency injection** in IO
- Relies on **external DI frameworks** (Macwire, Guice, manual constructor injection)
- Uses **Kleisli** or **ReaderT** pattern for environment passing
- Typeclass constraints (`Sync[F]`, `Async[F]`) encode capabilities, not dependencies

```scala
// Cats Effect 3 - Manual DI
class UserRepository(db: Database)
class UserService(repo: UserRepository)

// Must wire manually:
val db = new Database()
val repo = new UserRepository(db)
val service = new UserService(repo)

// Or use Kleisli for environment
type Env[A] = Kleisli[IO, AppConfig, A]
val envProgram: Env[Unit] = Kleisli { config =>
  config.db.queryUser(1)
}
```

**ZIO 2.x:**
- **Built-in environment** via `R` parameter in `ZIO[R, E, A]`
- **ZLayer** for dependency graph construction and composition
- **ZIO.access** and **ZIO.service** for dependency access
- Compile-time dependency checking with ZLayer

```scala
// ZIO 2.x - Built-in DI
type UserRepo = Has[UserRepository.Service]
type UserService = Has[UserService.Service]

val userRepoLayer: ZLayer[Database, Nothing, UserRepo] = ZLayer { ... }
val userServiceLayer: ZLayer[UserRepo, Nothing, UserService] = ZLayer { ... }

val program: ZIO[UserService, Throwable, User] =
  ZIO.service[UserService.Service].flatMap(_.getUser(1))

// Compose layers and provide
val app = program.provideSomeLayer[Database](userRepoLayer >>> userServiceLayer)
```

**Key Difference:**
- **CE3**: Environment is a pattern you implement yourself (external DI)
- **ZIO**: Environment is built into the type system (ZLayer, ZIO.access)

### 3.3 Typeclass Approach vs Direct Operations

**Cats Effect 3:**
- **Tagless final style**: Write code against typeclasses (`Sync[F]`, `Async[F]`, `Concurrent[F]`)
- Operations are **extension methods** on typeclass instances
- **Polymorphic** code: Write once, run on any effect type
- Requires `cats-core` for base typeclasses (`Functor`, `Monad`, `Applicative`)

```scala
// Cats Effect 3 - Tagless Final
class MyService[F[_]: Sync: Clock] {
  def doThing: F[Unit] = Sync[F].delay {
    println("Doing thing")
  }
}

// Can instantiate with IO, Task, Resource-backed IO, etc.
val ioService = new MyService[IO]
val taskService = new MyService[Task]
```

**ZIO 2.x:**
- **Direct operations**: Most methods are on `ZIO` object or class
- **Concrete types**: Typically use `ZIO` directly, not polymorphic
- ZIO **can** implement typeclasses (via `zio-interop-cats`) but not idiomatic
- Typeclasses in ZIO ecosystem (e.g., `zio-prelude`) are less common

```scala
// ZIO 2.x - Direct Operations
class MyService {
  def doThing: ZIO[Any, Nothing, Unit] = ZIO.succeed {
    println("Doing thing")
  }
}

// Always returns ZIO, no polymorphism
val service = new MyService
```

**Key Difference:**
- **CE3**: Encourage polymorphic code via typeclasses (tagless final)
- **ZIO**: Encourage concrete ZIO types, use ZLayer for polymorphism

### 3.4 Interruption and Cancellation

**Cats Effect 3:**
- **Opt-in cancellation**: Effects are **uncancellable** by default
- Must use `IO.uncancelable` to mark regions
- Cancellation is **cooperative**: Library authors must opt-in
- `MonadCancel` typeclass encodes cancellation behavior
- Use `IO.onCancel` to register cancellation handlers

```scala
// Cats Effect 3 - Cancellation
val io = IO.uncancelable { poll =>
  poll(IO.sleep(1.second)).onCancel(IO.println("Cancelled!"))
}

// Outer IO is uncancelable, but poll makes inner cancelable
```

**ZIO 2.x:**
- **Opt-out cancellation**: Effects are **interruptible** by default
- Must use `ZIO.uninterruptible` to mark regions
- Cancellation is **automatic** in most cases
- Use `ZIO.onInterrupt` or `ZIO.onExit` for handlers
- Interruption status is tracked in `Cause` type

```scala
// ZIO 2.x - Interruption
val zio = ZIO.uninterruptibleMask { poll =>
  poll(ZIO.sleep(1.second)).onInterrupt(ZIO.logError("Interrupted!"))
}

// Outer ZIO is uninterruptible, but poll makes inner interruptible
```

**Key Difference:**
- **CE3**: Default = uncancellable, must explicitly allow cancellation
- **ZIO**: Default = interruptible, must explicitly disable interruption

#### Interruption Propagation

| Scenario | Cats Effect 3 | ZIO 2.x |
|----------|---------------|---------|
| Parent canceled | Child fibers auto-canceled (if cancelable) | Child fibers auto-interrupted |
| Child fails | Parent sees error in `join` | Parent sees error in `join` |
| Child canceled | Parent continues (if handled) | Parent sees interruption in `join` |
| `race` behavior | Loser is auto-canceled | Loser is auto-interrupted |
| `parZip2` behavior | Both run to completion or both canceled | Both run to completion or both interrupted |

### 3.5 Runtime and Execution

#### Blocking Operations

**Cats Effect 3:**
- Use `IO.blocking` for blocking I/O (shifts to blocking thread pool)
- Use `IO.interruptible` for interruptible blocking (e.g., `Thread.sleep`)
- Runtime has separate compute and blocking pools
- No automatic detection of blocking operations

```scala
// Cats Effect 3
val blockingIO = IO.blocking {
  Thread.sleep(1000) // Runs on blocking pool
}

val interruptibleIO = IO.interruptible {
  Thread.sleep(1000) // Can be canceled
}
```

**ZIO 2.x:**
- Use `ZIO.attemptBlocking` for blocking I/O (shifts to blocking pool)
- Use `ZIO.attemptBlockingInterruptible` for interruptible blocking
- Runtime has separate compute and blocking pools
- **ZIO 2.x has blocking operation detection** (monitoring)

```scala
// ZIO 2.x
val blockingZIO = ZIO.attemptBlocking {
  Thread.sleep(1000) // Runs on blocking pool
}

val interruptibleZIO = ZIO.attemptBlockingInterruptible {
  Thread.sleep(1000) // Can be interrupted
}
```

**Key Difference:**
- Both have similar APIs (`blocking` vs `attemptBlocking`)
- ZIO 2.x has **runtime monitoring** that detects blocking operations

#### Thread Pooling

| Aspect | Cats Effect 3 | ZIO 2.x |
|--------|---------------|---------|
| Default pools | Compute + Blocking + Scheduler | Compute + Blocking + Scheduler |
| Custom runtime | `IORuntime(...)` | `Runtime(...)` |
| Thread shifting | Manual via `IO.executionContext` | Manual via `ZIO.onExecutionContext` |
| Blocking detection | None (must use `IO.blocking`) | **Automatic** (monitors for blocking) |

### 3.6 Testing Approaches

**Cats Effect 3:**
- Use `cats-effect-testing` suite (`ScalaCheckEffect`, `TestContext`)
- `IO.parMap` tests use real parallelism
- **No built-in test clock** - use external libraries (`cats-time`)
- Testing async effects is straightforward but requires real time (or `TestContext`)

```scala
// Cats Effect 3 Testing
import cats.effect.testing.scalatest.AsyncIOSpec
import org.scalatest.freespec.AsyncFreeSpec

class MySpec extends AsyncFreeSpec with AsyncIOSpec {
  "test" in {
    IO.pure(1).asserting(_ shouldBe 1)
  }
}
```

**ZIO 2.x:**
- Use **ZIO Test** (`zio-test`) with rich test features
- **Test clock** built-in: `TestClock` - adjust time deterministically
- **Test console** built-in: capture input/output
- **Test environment** built-in: mock services, test layers
- **Parallel tests** run deterministically with test clock

```scala
// ZIO 2.x Testing
import zio.test._
import zio.test.Assertion._

object MySpec extends ZIOSpecDefault {
  def spec = suite("test")(
    test("test") {
      ZIO.succeed(1).assert(equalTo(1))
    }
  )
}

// Test clock example
test("timeout") {
  (ZIO.sleep(5.seconds) *> ZIO.succeed(1))
    .timeout(3.seconds)
    .provide(TestClock.default)
}
```

**Key Difference:**
- **CE3**: Relies on external testing libs, real-time or `TestContext`
- **ZIO**: Built-in test utilities with **deterministic time control**

---

## 4. Mental Model Differences

### 4.1 Philosophical Approach

**Cats Effect 3:**
- **"Effect as a typeclass"**: Emphasizes polymorphic, capability-based encoding
- **"Typelevel ecosystem"**: Integrates with Cats, Cats-tagless, etc.
- **"Haskell-inspired"**: Follows Haskell's IO and typeclass traditions
- **"Minimal but composable"**: Small core, build combinators on top
- **"Community-driven"**: Decentralized design, many extension libraries
- **"Purity through typeclasses"**: Encode effects via typeclass constraints

**ZIO 2.x:**
- **"Effect as a concrete type"**: Emphasizes concrete `ZIO` type with built-in features
- **"Batteries included"**: Comprehensive library (console, clock, config, etc.)
- **"Pragmatic productivity"**: Prioritize developer ergonomics and productivity
- **"Opinionated"**: Strong conventions (ZLayer, ZIO App, Test utilities)
- **"ZIO ecosystem"**: Centralized design with official libraries (zio-http, zio-logging, etc.)
- **"Purity through types"**: Encode effects directly in `ZIO[R, E, A]` signature

**Trade-offs:**
- **CE3**: More flexible, requires more libraries, steeper learning curve for ecosystem
- **ZIO**: More opinionated, includes everything you need, easier for beginners

### 4.2 Ecosystem Integration

| Aspect | Cats Effect 3 | ZIO 2.x |
|--------|---------------|---------|
| **HTTP clients** | http4s, sttp, fetch | zio-http, sttp (ZIO backend) |
| **HTTP servers** | http4s, ember-server | zio-http, tapir-zio |
| **Database** | Doobie, Skunk, Quill | Quill-ZIO, Doobie (via interop) |
| **Logging** | log4cats, scribe | zio-logging, zio-telemetry |
| **Configuration** | ciris, pureconfig | zio-config |
| **Testing** | cats-effect-testing, scalatest | zio-test |
| **Scheduling** | cats-cron, fs2-cron | zio-schedules, zio-cron |
| **Streams** | fs2 | zio-streams |
| **Messaging** | fs2-kafka, http4s-ember | zio-kafka, zio-queue |
| **Tracing** | natchi, otel4s | zio-telemetry |

**Key Insight:**
- **CE3**: Mix-and-match libraries, most are framework-agnostic
- **ZIO**: Prefer ZIO-native libraries, but interop exists

### 4.3 Learning Curve

| Topic | Cats Effect 3 | ZIO 2.x |
|-------|---------------|---------|
| **Getting started** | Steeper (learn Cats, typeclasses, then CE3) | Easier (concrete types, direct ops) |
| **Error handling** | Simpler (only Throwable) | More complex (defects vs errors vs typed errors) |
| **Dependency injection** | Harder (DI frameworks, manual wiring) | Easier (built-in ZLayer) |
| **Testing** | Moderate (external libs, real-time or TestContext) | Easier (built-in test clock, mocking) |
| **Concurrency** | Similar complexity | Similar complexity |
| **Ecosystem** | Overwhelming (many choices) | Opinionated (fewer choices, more guidance) |
| **Type safety** | Higher (polymorphic code, typeclasses) | Moderate (concrete types, typed errors) |

### 4.4 Configuration Patterns

**Cats Effect 3:**
- Use external libraries: `ciris`, `pureconfig`, `cats-config`
- Configuration is loaded into **case classes** or **types**
- Integrate with `IOApp.Simple` or custom `IOApp`

```scala
// Cats Effect 3 - ciris example
import ciris._

case class Config(port: Int, host: String)

val config: IO[Config] =
  env("PORT").as[Int].default(8080).product(
    env("HOST").default("localhost")
  ).map { case (port, host) => Config(port, host) }
```

**ZIO 2.x:**
- Use **zio-config**: Type-safe, composable configuration
- Configuration integrates with **ZLayer**
- Automatic derivation, HOCON/JSON/YAML support

```scala
// ZIO 2.x - zio-config example
import zio.config._

case class Config(port: Int, host: String)

object Config {
  val layer: ZLayer[Any, Config.Error, Config] =
    ZConfig.fromCodecs(
      int("PORT").default(8080),
      string("HOST").default("localhost")
    )(Config.apply, Config.unapply)
}

// Use in app
val program = ZIO.service[Config].flatMap { config =>
  ZIO.logInfo(s"Port: ${config.port}")
}.provide(Config.layer)
```

**Key Difference:**
- **CE3**: Configuration is loaded into plain Scala types
- **ZIO**: Configuration is integrated with dependency injection (ZLayer)

---

## 5. Common Gotchas

### 5.1 Error Handling Pitfalls

#### 1. Uncaught Fatal Errors (CE3)

```scala
// BAD: Fatal errors bypass error handling in CE3
val io = IO.delay {
  throw new OutOfMemoryError("crash")
}.handleErrorWith(_ => IO.println("This won't run!"))

// GOOD: Use IO.blocking for code that might throw fatal errors
val io = IO.blocking {
  throw new OutOfMemoryError("crash")
}.handleErrorWith(_ => IO.println("Still won't run, but documented"))
```

#### 2. Defect Recovery (ZIO)

```scala
// BAD: catchAll doesn't catch defects in ZIO
val zio = ZIO.die(new Exception("defect"))
  .catchAll(_ => ZIO.unit) // Won't catch!

// GOOD: Use catchAllCause or catchSomeCause
val zio = ZIO.die(new Exception("defect"))
  .catchAllCause(cause => ZIO.logError(s"Caught: $cause"))
```

#### 3. Error Type Mismatch (ZIO)

```scala
// BAD: Error type mismatch
val zio: ZIO[Any, String, Int] = ZIO.succeed(1)
val zio2: ZIO[Any, Throwable, Int] = zio // Compile error!

// GOOD: Use mapError or orDie
val zio2: ZIO[Any, Throwable, Int] =
  zio.mapError(new Exception(_)) // Convert String to Throwable
```

### 5.2 Concurrency Pitfalls

#### 1. Unintended Sequential Execution

```scala
// BAD: Runs sequentially (not parallel!)
val io = List(IO(1), IO(2), IO(3))
  .traverse(identity) // Sequential

// GOOD: Use parSequence or parTupled
val io = List(IO(1), IO(2), IO(3))
  .parSequence // Parallel

val zio = ZIO.foreachPar(List(1, 2, 3))(n => ZIO.succeed(n)) // Parallel
```

#### 2. Race Condition with Ref

```scala
// BAD: Check-then-act race condition
val io = ref.get.flatMap { value =>
  if (value < 10) ref.set(value + 1)
  else IO.unit
}

// GOOD: Use atomic update
val io = ref.updateAndGet(v => v + 1)

val zio = ref.modify(v => (v, v + 1)) // Get and set atomically
```

#### 3. Fiber Leak (Forgetting to Join/Cancel)

```scala
// BAD: Fiber never joined or canceled
val io = fiber.start.flatMap { fiber =>
  IO.println("Fiber started, but never joined")
}

// GOOD: Always join or cancel
val io = fiber.start.flatMap { fiber =>
  fiber.join.guarantee(IO.println("Fiber completed"))
}
```

### 5.3 Resource Management Pitfalls

#### 1. Not Using Bracket/Resource

```scala
// BAD: Resource leaks on error
val io = IO(new FileInputStream("file.txt"))
  .flatMap(stream => IO(stream.read()))

// GOOD: Use bracket
val io = IO.blocking(new FileInputStream("file.txt"))
  .bracket(stream => IO.blocking(stream.read()))(stream =>
    IO.blocking(stream.close())
  )

// BETTER: Use Resource
val resource = Resource.fromAutoCloseable(
  IO.blocking(new FileInputStream("file.txt"))
)
val io = resource.use(stream => IO.blocking(stream.read()))
```

#### 2. Scope Confusion (ZIO)

```scala
// BAD: Acquire outside scope, use inside
val zio = ZIO.acquireRelease(ZIO.succeed(1))(_ => ZIO.unit)
zio.use(a => ZIO.succeed(a)) // Compile error! use returns ZIO, not ZManaged

// GOOD: Use ZIO.scoped
val zio = ZIO.scoped {
  ZIO.acquireRelease(ZIO.succeed(1))(_ => ZIO.unit).flatMap { a =>
    ZIO.succeed(a)
  }
}

// BETTER: Use ZManaged
val managed = ZManaged.acquireRelease(ZIO.succeed(1))(_ => ZIO.unit)
val zio = managed.use(a => ZIO.succeed(a))
```

### 5.4 Runtime Pitfalls

#### 1. unsafeRun in Class Initialization

```scala
// BAD: unsafeRun in class/object initialization
object Config {
  val value = IO.delay(loadConfig()).unsafeRunSync() // Can cause runtime issues
}

// GOOD: Use IOApp or defer evaluation
object Config {
  val value = IO.delay(loadConfig()) // Defer to caller
}
```

#### 2. Blocking the Compute Pool

```scala
// BAD: Blocks compute pool
val io = IO(Thread.sleep(1000))

// GOOD: Shift to blocking pool
val io = IO.blocking(Thread.sleep(1000))

val zio = ZIO.attemptBlocking(Thread.sleep(1000))
```

#### 3. Runtime Conflicts (CE3)

```scala
// BAD: Multiple IORuntime instances
object App1 {
  implicit val runtime: IORuntime = IORuntime.global
}

object App2 {
  import App1.runtime // Reusing runtime can cause issues
}

// GOOD: Use IOApp or explicit runtime per application
object MyApp extends IOApp.Simple {
  def run: IO[Unit] = IO.println("Hello")
}
```

### 5.5 Testing Pitfalls

#### 1. Testing Time-Dependent Code

```scala
// BAD: Flaky test due to real time
test("timeout") {
  IO.sleep(1.second).timeout(100.millis).attempt.map { result =>
    assert(result.isLeft) // Flaky!
  }
}

// GOOD (CE3): Use TestContext
import cats.effect.testkit.TestContext
test("timeout") {
  implicit val ctx: TestContext = TestContext()
  val io = IO.sleep(1.second).timeout(100.millis).attempt
  ctx.tick(100.millis)
  io.map(result => assert(result.isLeft)) // Deterministic
}

// GOOD (ZIO): Use TestClock
test("timeout") {
  (ZIO.sleep(1.second).timeout(100.millis))
    .provide(TestClock.default)
    .map(result => assert(result.isEmpty)) // Deterministic
}
```

#### 2. Not Providing Test Layers (ZIO)

```scala
// BAD: Test doesn't provide required services
test("user service") {
  UserService.getUser(1) // Compile error: Missing UserService
}

// GOOD: Provide test layer
test("user service") {
  UserService.getUser(1).provide(
    UserService.test, // Test implementation
    UserRepository.test
  )
}
```

### 5.6 Typeclass vs Direct Operations

#### 1. Over-Abstracting (CE3)

```scala
// BAD: Unnecessary typeclass constraint
def doSomething[F[_]: Sync: Monad]: F[Unit] = {
  Monad[F].pure(()) // Only using Monad, not Sync
}

// GOOD: Use only what you need
def doSomething[F[_]: Applicative]: F[Unit] = {
  Applicative[F].pure(())
}
```

#### 2. Mixing Concrete and Polymorphic (CE3)

```scala
// BAD: Mixing IO with typeclass constraints
def doSomething[F[_]: Sync](f: F[Int]): IO[Unit] =
  f.toIO.flatMap { n => // Mixing worlds!
    IO.println(n)
  }

// GOOD: Stay polymorphic or stay concrete
def doSomething[F[_]: Sync](f: F[Int]): F[Unit] =
  f.flatMap { n =>
    Sync[F].delay(println(n))
  }

def doSomethingIO(f: IO[Int]): IO[Unit] =
  f.flatMap { n =>
    IO.println(n)
  }
```

### 5.7 Environment vs ZLayer Confusion (ZIO)

``` 1. When to Use ZLayer

```scala
// BAD: Using ZIO.environment for all dependencies
val zio: ZIO[Any, Nothing, Unit] =
  ZIO.environment[Any].flatMap { env =>
    val config = env.get
    val db = env.get
    // ...
  }

// GOOD: Use ZLayer for services, ZIO.access for simple env
val zio: ZIO[Config, Nothing, Unit] =
  ZIO.service[Config].flatMap { config =>
    ZIO.succeed(())
  }

// Provide layer
zio.provide(Config.layer)
```

#### 2. Circular Dependencies with ZLayer

```scala
// BAD: Circular dependency
val aLayer = ZLayer(A.service) // Depends on B
val bLayer = ZLayer(B.service) // Depends on A

// GOOD: Refactor or use ZLayer.fromSome
val aLayer = ZLayer.fromFunction(A(_))
val bLayer = ZLayer.fromFunction(B(_))
val combined = (aLayer ++ bLayer).build // Build together
```

---

## 6. Quick Reference Card

### Effect Creation

```scala
// Pure/Lazy
IO.pure(a)           ↔ ZIO.succeed(a)
IO.delay(expr)       ↔ ZIO.suspend(expr)
IO.unit              ↔ ZIO.unit

// Errors
IO.raiseError(e)     ↔ ZIO.fail(e)
IO.deferred(throw)   ↔ ZIO.die(t)

// Side Effects
IO { code }          ↔ ZIO.attempt { code }
IO.blocking { code } ↔ ZIO.attemptBlocking { code }

// Async
IO.async { cb => }   ↔ ZIO.async { cb => }
IO.never             ↔ ZIO.never
```

### Sequencing

```scala
// Map/FlatMap
io.map(f)            ↔ zio.map(f)
io.flatMap(f)        ↔ zio.flatMap(f)

// Discard values
io1 *> io2           ↔ zio1 *> zio2
io1 <* io2           ↔ zio1 <* zio2

// Combine
io1.product(io2)     ↔ zio1.zip(zio2)
(io1, io2).tupled    ↔ zio1.zip(zio2)

// Parallel
io1.parZip2(io2)     ↔ zio1.zipPar(zio2)
IO.race(io1, io2)    ↔ zio1.race(zio2)
```

### Error Handling

```scala
// Catch/Recover
io.handleErrorWith(f)    ↔ zio.catchAll(f)
io.handleError(f)        ↔ zio.catchAll(e => ZIO.succeed(f(e)))
io.attempt               ↔ zio.either

// Transform errors
io.attempt.map(_.toOption)  ↔ zio.option
io.adaptError { case e => } ↔ zio.mapError { case e => }
```

### Resources

```scala
// Bracket
IO.bracket(acquire)(use)(release)
  ↔ ZIO.acquireRelease(acquire)(release).flatMap(use)

// Resource
Resource.fromAutoCloseable(io)
  ↔ ZManaged.fromAutoCloseable(zio)

resource.use(a => io)
  ↔ managed.use(a => zio)
```

### Concurrency

```scala
// Parallel
list.parSequence       ↔ ZIO.foreachPar(list)(f)
list.parMap(f)         ↔ ZIO.collectAllPar(list.map(f))

// Fork
io.start               ↔ zio.fork
fiber.join             ↔ fiber.join
fiber.cancel           ↔ fiber.interrupt
```

### Time

```scala
IO.sleep(d)            ↔ ZIO.sleep(d)
io.timeout(d)          ↔ zio.timeout(d)
io.delayBy(d)          ↔ zio.delay(d)
```

### State

```scala
// Ref
Ref[IO].of(a)          ↔ Ref.make(a)
ref.get                ↔ ref.get
ref.set(a)             ↔ ref.set(a)
ref.update(f)          ↔ ref.update(f)

// Deferred/Promise
Deferred[IO, A]        ↔ Promise.make[E, A]
d.complete(a)          ↔ p.succeed(a)
d.get                  ↔ p.await
```

### Application Entry Point

```scala
// Cats Effect 3
object MyApp extends IOApp.Simple {
  def run: IO[Unit] = IO.println("Hello")
}

// ZIO 2.x
object MyApp extends ZIOAppDefault {
  def run: ZIO[Any, Nothing, Unit] = ZIO.logInfo("Hello")
}
```

---

## Sources

Research conducted in January 2026 using the following sources:

### Cats Effect 3
- [Cats Effect 3: Introduction to Fibers](https://rockthejvm.com/articles/cats-effect-3-introduction-to-fibers)
- [Async · Cats Effect](https://typelevel.org/cats-effect/docs/typeclasses/async)
- [Functional Parallel Programming with Scala and Cats Effect](https://rockthejvm.com/articles/functional-parallel-programming-with-scala-and-cats-effect)
- [I/O Integrated Runtime Concept](https://github.com/typelevel/cats-effect/discussions/3070)
- [Resource · Cats Effect](https://typelevel.org/cats-effect/docs/std/resource)
- [Cats Effect IOApp and IORuntime](https://typelevel.org/cats-effect/docs/core/io-runtime-config)
- [MonadCancel · Cats Effect](https://typelevel.org/cats-effect/docs/typeclasses/monadcancel)
- [Error handling best practices in cats effect](https://www.reddit.com/r/scala/comments/1djfi1h/error_handling_best_practices_in_cats_effect/)

### ZIO 2.x
- [Introduction to ZIO's Interruption Model](https://zio.dev/reference/interruption/)
- [Forking and Interruption in ZIO](https://blog.jakubjanecek.com/blog/20240527_zio-fork-interrupt/)
- [Fiber Documentation](https://zio.dev/reference/fiber/fiber.md/)
- [Handling Errors](https://zio.dev/overview/handling-errors)
- [Introduction to Resource Management in ZIO](https://zio.dev/reference/resource/)
- [Introducing Scopes in ZIO 2.0](https://murraytodd.medium.com/introducing-scopes-in-zio-2-0-b583f487c0af)
- [Job Queue Execution Management using ZIO Scopes](https://www.stevenskelton.ca/job-queue-management-zio-scope/)
- [Ref Documentation](https://zio.dev/reference/concurrency/ref)
- [Promise Documentation](https://zio.dev/reference/concurrency/promise)
- [Getting Started With Dependency Injection in ZIO](https://zio.dev/reference/di/dependency-injection-in-zio)
- [Idiomatic dependency injection for ZIO applications in Scala](https://blog.pierre-ricadat.com/idiomatic-dependency-injection-for-zio-applications-in-scala)

### Comparisons and Ecosystem
- [Porting an application from cats effects to ZIO](https://kaveland.no/posts/2024-05-16-porting-from-cats-effects-to-zio/)
- [Cats Effect vs ZIO](https://softwaremill.com/cats-effect-vs-zio/)
- [Thread shifting in cats-effect and ZIO](https://blog.softwaremill.com/thread-shifting-in-cats-effect-and-zio-9c184708067b)
- [Comparing Ox & functional effects](https://ox.softwaremill.com/v0.3.8/compare-funeff.html)
- [Aspects of functional effects execution in Scala runtimes](https://medium.com/its-tinkoff/aspects-of-functional-effects-execution-in-scala-runtimes-89cf415c7153)

---

## Document Metadata

- **Created**: 2026-01-25
- **Last Updated**: 2026-01-25
- **Versions**: Cats Effect 3.x, ZIO 2.x
- **Purpose**: Concept mapping reference for developers transitioning between Cats Effect 3 and ZIO 2.x
- **Scope**: Type equivalence, operations, semantics, mental models, and common gotchas
