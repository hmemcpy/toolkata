# ZIO 2.x Research Document: For Cats Effect Developers

## Table of Contents
1. [Core Concepts](#core-concepts)
2. [Type System and Semantics](#type-system-and-semantics)
3. [Error Handling](#error-handling)
4. [Environment and Dependency Injection](#environment-and-dependency-injection)
5. [Concurrency Model](#concurrency-model)
6. [Resource Management](#resource-management)
7. [State Management Primitives](#state-management-primitives)
8. [Runtime and Execution](#runtime-and-execution)
9. [Idiomatic Patterns](#idiomatic-patterns)
10. [Testing](#testing)
11. [Comparison with Cats Effect](#comparison-with-cats-effect)
12. [Common Pitfalls](#common-pitfalls)
13. [Terminology Mapping](#terminology-mapping)

---

## Core Concepts

### ZIO[R, E, A] - The Core Effect Type

A `ZIO[R, E, A]` value is an **immutable value** that **lazily describes** a workflow or job.

**Mental Model**: Can be thought of as a function of the form:
```scala
ZEnvironment[R] => Either[E, A]
```

But unlike a simple function, ZIO can model:
- Synchronous computations
- Asynchronous computations
- Concurrent operations
- Parallel operations
- Resource-safe operations

**Source File**: `/Users/hmemcpy/git/zio-cats/zio/core/shared/src/main/scala/zio/ZIO.scala`

```scala
sealed trait ZIO[-R, +E, +A]
    extends Product
    with Serializable
    with ZIOPlatformSpecific[R, E, A]
    with ZIOVersionSpecific[R, E, A]
```

### Type Parameters Explained

| Parameter | Variance | Meaning | When to Use |
|-----------|----------|---------|-------------|
| **R** | Contravariant (-) | Environment/Context required | `Any` for no requirements, specific types for dependencies |
| **E** | Covariant (+) | Error type that may occur | `Nothing` for infallible, `Throwable` for exceptions, custom types |
| **A** | Covariant (+) | Success type | The value produced on success |

**Key Insight**: Unlike Cats Effect's `IO` which has no environment parameter, ZIO's `R` parameter is built into the core type, enabling first-class dependency injection.

---

## Type System and Semantics

### Type Aliases

ZIO provides several type aliases for common patterns:

```scala
// No environment required
type UIO[A] = ZIO[Any, Nothing, A]
type URIO[R, A] = ZIO[R, Nothing, A]

// Throwable error (like cats.effect.IO)
type Task[A] = ZIO[Any, Throwable, A]
type RIO[R, A] = ZIO[R, Throwable, A]

// Any error, no environment
type IO[E, A] = ZIO[Any, E, A]
```

**Comparison with Cats Effect**:
- `Task[A]` ≈ `IO[A]` in Cats Effect
- `UIO[A]` ≈ `IO[A]` when you know it can't fail
- `RIO[R, A]` has no direct equivalent (would need `Kleisli` or similar in CE)

### Key Type Characteristics

1. **Laziness**: ZIO values are lazy descriptions, not executed until interpreted by a Runtime
2. **Immutability**: All ZIO operations return new ZIO values
3. **Memoization**: Effects are not memoized by default (use `.cached` for memoization)

---

## Error Handling

### Three Types of Errors in ZIO

1. **Expected Errors (E)**: Modeled in the type system, recoverable
2. **Defects (Throwable)**: Unexpected failures (bugs, out of memory)
3. **Interruption**: Cancellation of fibers

### Error Handling Operations

#### 1. Catching Errors

```scala
// Catch all errors
effect.catchAll { error =>
  ZIO.succeed(defaultValue)
}

// Catch specific errors
effect.catchSome {
  case _: FileNotFoundException => fallbackEffect
}

// Catch with full Cause information
effect.catchAllCause { cause =>
  ZIO.debug(s"Full failure info: $cause") *> fallback
}

// Catch only defects (unexpected Throwables)
effect.catchSomeDefect {
  case _: StackOverflowError => recoveryEffect
}
```

**Source Reference**: Lines 282-407 in ZIO.scala

#### 2. Error Recovery

```scala
// Fallback to another effect on error
primaryEffect.orElse(backupEffect)

// Retry with schedule
effect.retry(Schedule.recurs(5))
effect.retry(Schedule.exponential(1.second))

// Fallback with success value
effect.orElseSucceed(defaultValue)
```

#### 3. Error Transformation

```scala
// Map the error type
effect.mapError(_.getMessage)

// Convert defects to typed errors
effect.absolve

// Sandbox: expose defects as Cause
effect.sandbox
```

#### 4. Folding

```scala
// Handle both success and failure
effect.fold(
  error => s"Failed: $error",
  success => s"Succeeded: $success"
)

// Effectful folding
effect.foldZIO(
  error => logError(error) *> fallback,
  success => processSuccess(success)
)

// Fold with full Cause
effect.foldCauseZIO(
  cause => handleFailure(cause),
  success => handleSuccess(success)
)
```

### Cause Type

`Cause[E]` is ZIO's rich error type that captures the full story of failures:

```scala
sealed abstract class Cause[+E]

// Key subclasses:
case object Empty                           extends Cause[Nothing]
case class Fail[E](value: E, ...)           extends Cause[E]
case class Die(value: Throwable, ...)       extends Cause[Nothing]
case class Interrupt(fiberId: FiberId, ...) extends Cause[Nothing]
case class Then(left: Cause[_], right: Cause[_]) extends Cause[Nothing]
case class Both(left: Cause[_], right: Cause[_]) extends Cause[Nothing]
```

**Source File**: `/Users/hmemcpy/git/zio-cats/zio/core/shared/src/main/scala/zio/Cause.scala`

**Key Operations on Cause**:
```scala
cause.defects      // List[Throwable] - all defects
cause.failures     // List[E] - all expected errors
cause.failureOption // Option[E] - first failure
cause.dieOption    // Option[Throwable] - first defect
```

---

## Environment and Dependency Injection

### Environment R Parameter

The `R` parameter enables first-class, type-safe dependency injection:

```scala
// Define service traits
trait Database {
  def query(sql: String): ZIO[Any, IOException, ResultSet]
}

trait Logging {
  def log(msg: String): ZIO[Any, Nothing, Unit]
}

// Effect requiring services
def getUser(id: String): ZIO[Database & Logging, IOException, User] =
  for {
    db <- ZIO.service[Database]
    log <- ZIO.service[Logging]
    user <- db.query(s"SELECT * FROM users WHERE id = $id")
    _ <- log.log(s"Got user: $user")
  } yield user
```

### ZLayer: Dependency Injection

`ZLayer[-RIn, +E, +ROut]` describes how to build services from their dependencies.

**Mental Model**: `RIn => async Either[E, ROut]`

**Source File**: `/Users/hmemcpy/git/zio-cats/zio/core/shared/src/main/scala/zio/ZLayer.scala`

#### Creating Layers

```scala
// From a simple value
val configLayer: ULayer[AppConfig] = ZLayer.succeed(AppConfig("localhost", 8080))

// From a function
val databaseLayer: ZLayer[AppConfig, Nothing, Database] =
  ZLayer.fromFunction(config => Database(config))

// From an effect
val dbFromPool: ZLayer[ConnectionPool, Throwable, Database] =
  ZLayer.fromZIO {
    ZIO.serviceWith[ConnectionPool](pool =>
      ZIO.attempt(Database.fromPool(pool))
    )
  }

// From a scoped resource (with automatic cleanup)
val scopedDbLayer: ZLayer[Any, Throwable, Database] =
  ZLayer.scoped {
    ZIO.acquireRelease(
      ZIO.attempt(connectToDb())
    )(db => ZIO.attempt(db.close()).orDie)
  }
```

#### Composing Layers

```scala
// Horizontal composition (combine outputs)
val dataLayer: ZLayer[AppConfig, Throwable, Database & Cache] =
  databaseLayer ++ cacheLayer

// Vertical composition (feed output to input)
val repositoryLayer: ZLayer[Any, Throwable, UserRepository] =
  configLayer >>> databaseLayer >>> userRepoLayer

// Combine both
val appLayer: ZLayer[Any, Throwable, UserRepository & EmailService] =
  (configLayer >>> databaseLayer >>> userRepoLayer) ++
  emailServiceLayer
```

#### Using Layers

```scala
// Provide layers to an effect
val program: ZIO[Any, Throwable, User] =
  getUser("123").provideLayer(
    configLayer >>> databaseLayer ++ loggingLayer
  )

// Or use ZIOAppDefault with provideLayer
object MyApp extends ZIOAppDefault {
  val layers = configLayer >>> databaseLayer ++ loggingLayer

  def run = getUser("123").provideLayer(layers)
}
```

**Advanced ZLayer Features**:
```scala
// Retry layer construction
val retriedDb = databaseLayer.retry(Schedule.recurs(3))

// Fallback layer
val dbLayer = postgresLayer.orElse(inmemoryLayer)

// Project out part of a layer
val connectionLayer: ZLayer[DBConfig, Nothing, Connection] =
  ZLayer.service[DBConfig].project(_.connection)
```

---

## Concurrency Model

### Fibers: Lightweight Green Threads

**Source File**: `/Users/hmemcpy/git/zio-cats/zio/core/shared/src/main/scala/zio/Fiber.scala`

```scala
sealed abstract class Fiber[+E, +A] {
  def id: FiberId
  def await(implicit trace: Trace): UIO[Exit[E, A]]
  def join(implicit trace: Trace): IO[E, A]
  def interrupt(implicit trace: Trace): UIO[Exit[E, A]]
}
```

**Key Characteristics**:
- Lightweight (millions can be spawned)
- Automatic work-stealing scheduler
- Fine-grained interruption
- Structured concurrency

### Forking and Concurrency

```scala
// Fork a computation
val fiber: ZIO[Any, Nothing, Fiber[Throwable, String]] =
  ZIO.attempt("computing...").delay(1.second).fork

// Fork and forget (daemon fiber)
val daemon: ZIO[Any, Nothing, Fiber[Throwable, String]] =
  longRunningTask.forkDaemon

// Fork in background
val background: ZIO[Any, Nothing, Unit] =
  task.fork *> // Start in background
  otherWork  *> // Do other work
  ZIO.unit

// Join a fiber
val result: ZIO[Any, Throwable, String] =
  for {
    fiber <- task.fork
    result <- fiber.join
  } yield result

// Race two computations
val winner: ZIO[Any, Throwable, String] =
  task1.race(task2)

// Race with Either result
val raced: ZIO[Any, Throwable, Either[String, Int]] =
  task1.raceEither(task2)
```

### Parallel Operations

ZIO has parallel variants of many operations (suffixed with `Par`):

```scala
// Sequential vs Parallel
val sequential = zio1.zip(zio2)        // Run sequentially
val parallel = zio1.zipPar(zio2)       // Run in parallel

// Parallel foreach
ZIO.foreachPar(List(1, 2, 3))(i => process(i))

// Parallel collect
ZIO.collectAllPar(tasks)

// Parallel map
ZIO.foreachPar(items)(process)

// Zipping variations
zio1 <&> zio2   // zipPar - both results as tuple
zio1 &> zio2    // zipParRight - keep right result
zio1 <& zio2    // zipParLeft - keep left result
```

### Interruption

ZIO has built-in interruption support:

```scala
// Interruptible region (default)
val interruptible = ZIO.uninterruptible {
  for {
    fiber <- longTask.fork
    _ <- fiber.interrupt
  } yield ()
}

// Uninterruptible region
val critical = ZIO.uninterruptible {
  // Cannot be interrupted here
  criticalWork
}

// Masking (restore interruptibility)
val masked = ZIO.uninterruptibleMask { restore =>
  // Uninterruptible here
  restore(mayBeInterrupted) // Can be interrupted
  // Uninterruptible again
}
```

---

## Resource Management

### ZManaged: Managed Resources

**Source File**: `/Users/hmemcpy/git/zio-cats/zio/managed/shared/src/main/scala/zio/managed/ZManaged.scala`

A `ZManaged[R, E, A]` represents a resource that is automatically acquired and released:

```scala
sealed abstract class ZManaged[-R, +E, +A] {
  def zio: ZIO[R, E, (ZManaged.Finalizer, A)]
}
```

#### Creating Managed Resources

```scala
// From acquire/release
val managedFile: ZManaged[Any, IOException, Source] =
  ZManaged.acquireRelease(
    ZIO.attempt(Source.fromFile("data.txt"))
  )(source => ZIO.succeed(source.close()))

// Using scoped builder
val managedDb: ZManaged[Any, Throwable, Connection] =
  ZManaged.scoped {
    ZIO.acquireRelease(
      ZIO.attempt(connectToDb())
    )(conn => ZIO.attempt(conn.close()).orDie)
  }

// From a ZIO value
val managedValue: ZManaged[Any, Nothing, String] =
  ZManaged.fromZIO(ZIO.succeed("value"))
```

#### Using Managed Resources

```scala
// Use the resource
val result: ZIO[Any, IOException, String] =
  managedFile.use { source =>
    ZIO.attempt(source.mkString)
  }

// Zip managed resources
val bothResources: ZManaged[Any, IOException, (Source, Connection)] =
  managedFile.zip(managedDb)
```

#### ZManaged vs ZIO.acquireRelease

Modern ZIO (2.x) prefers `ZIO.acquireRelease` over `ZManaged`:

```scala
// Preferred (ZIO 2.x style)
val result: ZIO[Any, IOException, String] =
  ZIO.acquireRelease(
    ZIO.attempt(Source.fromFile("data.txt"))
  )(source => ZIO.succeed(source.close())) { source =>
    ZIO.attempt(source.mkString)
  }

// Also common: scoped pattern
val result: ZIO[Scope, IOException, String] =
  ZIO.acquireReleaseExit(
    ZIO.attempt(Source.fromFile("data.txt"))
  )((source, exit) => ZIO.succeed(source.close())) { source =>
    ZIO.attempt(source.mkString)
  }
```

### Ensuring (finally)

```scala
// Like try/finally
effect.ensuring(finalizer)

// Finalizer runs on success or failure
effect.ensuring(
  ZIO.succeed(println("Cleanup!"))
)

// ensuring with exit information
effect.ensuringWith { exit =>
  ZIO.succeed(println(s"Done with: $exit"))
}
```

---

## State Management Primitives

### Ref: Atomic References

**Source File**: `/Users/hmemcpy/git/zio-cats/zio/core/shared/src/main/scala/zio/Ref.scala`

A `Ref[A]` is a purely functional mutable reference using CAS (compare-and-swap):

```scala
sealed abstract class Ref[A] {
  def get(implicit trace: Trace): UIO[A]
  def set(a: A)(implicit trace: Trace): UIO[Unit]
  def modify[B](f: A => (B, A))(implicit trace: Trace): UIO[B]
  def update(f: A => A)(implicit trace: Trace): UIO[Unit]
}
```

#### Creating and Using Refs

```scala
// Create a Ref
val ref: ZIO[Any, Nothing, Ref[Int]] = Ref.make(0)

// Basic operations
for {
  r <- Ref.make(0)
  current <- r.get          // Read
  _ <- r.set(5)             // Write
  _ <- r.update(_ + 1)      // Update
  previous <- r.getAndUpdate(_ + 1) // Read and modify
  updated <- r.updateAndGet(_ * 2)  // Modify and read
} yield ()
```

#### Ref.Synchronized

For effectful updates:

```scala
// Create a synchronized ref
val ref: ZIO[Any, Nothing, Ref.Synchronized[Int]] =
  Ref.Synchronized.make(0)

// Effectful update (blocks other writers during update)
ref.modifyZIO { current =>
  for {
    _ <- logValue(current)
    next = current + 1
  } yield (current, next)
}
```

### Promise: Single-Assignment Variables

**Source File**: `/Users/hmemcpy/git/zio-cats/zio/core/shared/src/main/scala/zio/Promise.scala`

```scala
final class Promise[E, A] private (blockingOn: FiberId) {
  def await(implicit trace: Trace): IO[E, A]
  def succeed(a: A)(implicit trace: Trace): UIO[Boolean]
  def fail(e: E)(implicit trace: Trace): UIO[Boolean]
  def complete(io: IO[E, A])(implicit trace: Trace): UIO[Boolean]
  def isDone(implicit trace: Trace): UIO[Boolean]
}
```

#### Using Promises

```scala
// Create a promise
val promise: ZIO[Any, Nothing, Promise[Nothing, Int]] =
  Promise.make[Nothing, Int]

// Complete and await
for {
  p <- Promise.make[Nothing, Int]
  _ <- p.succeed(42).delay(1.second).fork
  value <- p.await // Suspends until completed
} yield value

// Coordinate between fibers
def coordinate[A, B](task1: Task[A], task2: Task[B]): Task[(A, B)] =
  for {
    p1 <- Promise.make[Nothing, A]
    p2 <- Promise.make[Nothing, B]
    _ <- task1.tap(a => p1.succeed(a)).fork
    _ <- task2.tap(b => p2.succeed(b)).fork
    a <- p1.await
    b <- p2.await
  } yield (a, b)
```

### Queue: Asynchronous Queues

**Source File**: `/Users/hmemcpy/git/zio-cats/zio/core/shared/src/main/scala/zio/Queue.scala`

```scala
trait Queue[A] {
  def offer(a: A)(implicit trace: Trace): UIO[Boolean]
  def take(implicit trace: Trace): UIO[A]
  def size(implicit trace: Trace): UIO[Int]
}
```

#### Queue Variants

```scala
// Bounded queue (backpressure)
val bounded: ZIO[Any, Nothing, Queue[Int]] =
  Queue.bounded[Int](100)

// Sliding queue (drops oldest when full)
val sliding: ZIO[Any, Nothing, Queue[Int]] =
  Queue.sliding[Int](100)

// Dropping queue (drops new when full)
val dropping: ZIO[Any, Nothing, Queue[Int]] =
  Queue.dropping[Int](100)

// Unbounded queue
val unbounded: ZIO[Any, Nothing, Queue[Int]] =
  Queue.unbounded[Int]
```

#### Using Queues

```scala
for {
  queue <- Queue.bounded[Int](100)
  producer <- ZIO.foreach(1 to 1000)(i => queue.offer(i)).fork
  consumer <- ZIO.collectAll(
    ZIO.replicate(1000)(queue.take)
  ).fork
  _ <- producer.join
  results <- consumer.join
} yield results
```

### Hub: Broadcast Pub/Sub

```scala
// Create a hub
val hub: ZIO[Any, Nothing, Hub[Int]] = Hub.bounded[Int](100)

// Subscribe
val subscribe: ZIO[Hub[Int], Nothing, Dequeue[Int]] =
  ZIO.service[Hub[Int]].flatMap(_.subscribe)

// Publish
hub.offer(42) // Goes to all subscribers
```

---

## Runtime and Execution

### Runtime[R]

**Source File**: `/Users/hmemcpy/git/zio-cats/zio/core/shared/src/main/scala/zio/Runtime.scala`

```scala
trait Runtime[+R] {
  def environment: ZEnvironment[R]
  def fiberRefs: FiberRefs
  def runtimeFlags: RuntimeFlags

  trait UnsafeAPI {
    def fork[E, A](zio: ZIO[R, E, A])(implicit trace: Trace, unsafe: Unsafe): Fiber.Runtime[E, A]
    def run[E, A](zio: ZIO[R, E, A])(implicit trace: Trace, unsafe: Unsafe): Exit[E, A]
    def runToFuture[E <: Throwable, A](zio: ZIO[R, E, A])(implicit trace: Trace, unsafe: Unsafe): CancelableFuture[A]
  }

  def unsafe: UnsafeAPI with UnsafeAPI3
}
```

### Default Runtime

```scala
// Default runtime
val default: Runtime[Any] = Runtime.default

// Custom runtime
val custom: Runtime[Database] = Runtime(
  ZEnvironment(Database(config)),
  FiberRefs.empty,
  RuntimeFlags.default
)

// Running effects with runtime
Unsafe.unsafe { implicit unsafe =>
  val result: Exit[Throwable, String] =
    runtime.unsafe.run(myZIO)
}
```

### ZIOAppDefault

```scala
object MyApp extends ZIOAppDefault {
  val myLayer: ZLayer[Any, Nothing, Database & Logging] =
    (configLayer >>> databaseLayer) ++ loggingLayer

  def run: ZIO[Database & Logging, IOException, Unit] =
    for {
      db <- ZIO.service[Database]
      _ <- program(db)
    } yield ()
}
```

### Runtime Flags

```scala
// Enable/disable runtime features
RuntimeFlags.default
RuntimeFlags.enable(RuntimeFlag.CurrentFiber)
RuntimeFlags.disable(RuntimeFlag.CooperativeYielding)

// Available flags:
// - CurrentFiber: Track current fiber
// - CooperativeYielding: Enable cooperative yielding
// - FiberRoots: Track fiber roots
// - RuntimeMetrics: Enable metrics
// - OpLog: Enable operation logging
// - OpSupervision: Enable supervision
```

---

## Idiomatic Patterns

### For Comprehensions

```scala
// Sequential composition
val program =
  for {
    user <- getUser("123")
    posts <- getPosts(user.id)
    _ <- log(s"Fetched ${posts.length} posts")
  } yield posts
```

### Symbolic Operators

```scala
// Sequencing
effect1 *> effect2  // Sequential, keep right
effect1 <* effect2  // Sequential, keep left

// Zipping
effect1 <*> effect2  // Zip as tuple
effect1 &> effect2   // Parallel, keep right
effect1 <& effect2   // Parallel, keep left

// Error handling
effect1 <> effect2   // Fallback to effect2 on error
effect1 <+> effect2  // orElseEither

// Racing
effect1 <|> effect2  // raceEither
```

### Conditional Effects

```scala
// When/unless
ZIO.when(condition)(effect)    // Run if true
ZIO.unless(condition)(effect)  // Run if false

// Effectful condition
ZIO.whenZIO(effectfulCondition)(effect)

// if/else equivalent
ZIO.ifZIO(effectfulCondition)(
  onTrue = trueEffect,
  onFalse = falseEffect
)
```

### Looping

```scala
// Loop (with state)
ZIO.loop(0)(_ < 10, _ + 1) { i =>
  ZIO.succeed(i * 2)
}
// Returns: List(0, 2, 4, 6, 8, 10, 12, 14, 16, 18)

// LoopDiscard (discard results)
ZIO.loopDiscard(0)(_ < 10, _ + 1) { i =>
  Console.printLine(s"Count: $i")
}

// Iterate (state transformation)
ZIO.iterate(0)(_ < 10) { i =>
  ZIO.succeed(i + 1)
}
// Returns: 10
```

### Retry and Repetition

```scala
// Simple retry
effect.retry(Schedule.recurs(5))

// Exponential backoff
effect.retry(Schedule.exponential(1.second))

// Fixed delay
effect.retry(Schedule.spaced(1.second))

// Retry while condition
effect.retryWhile(_.getMessage.contains("retry"))

// Repeat on success
effect.repeat(Schedule.recurs(5))

// Repeat with schedule
effect.repeat(Schedule.spaced(1.second))
```

### Environment Access

```scala
// Get a service
val db: ZIO[Database, Nothing, Database] = ZIO.service[Database]

// Get and use
val result: ZIO[Database, IOException, User] =
  ZIO.serviceWith[Database](_.query("SELECT * FROM users"))

// Get multiple services
val services: ZIO[Database & Logging, Nothing, (Database, Logging)] =
  ZIO.service[Database].zip(ZIO.service[Logging])

// Access environment directly
val env: ZIO[Database, Nothing, ZEnvironment[Database]] =
  ZIO.environment[Database]
```

---

## Testing

### Test Framework

ZIO provides its own test framework with built-in support for effects:

```scala
import zio.test._

object MySpec extends ZIOSpecDefault {
  def spec = suite("MySuite")(
    test("addition works") {
      ZIO.attempt(1 + 1).flatMap(result =>
        assert(result)(Assertion.equalTo(2))
      )
    },
    test("fails on error") {
      for {
        result <- ZIO.attempt(1 / 0).either
      } yield assert(result)(
        Assertion.isLeft(
          Assertion.assertion("arithmetic exception") {
            case _: ArithmeticException => true
            case _ => false
          }
        )
      )
    }
  )
}
```

### Providing Test Layers

```scala
object MyServiceSpec extends ZIOSpec {
  // Test layer
  val testLayer: ZLayer[Any, Nothing, Database] =
    ZLayer.succeed(new InMemoryDatabase)

  def spec = suite("DatabaseSpec")(
    test("query returns results") {
      for {
        db <- ZIO.service[Database]
        result <- db.query("SELECT * FROM users")
      } yield assertTrue(result.nonEmpty)
    }
  ).provideLayer(testLayer)
}
```

### Test Aspects

```scala
// Timeout tests
test("completes quickly") {
  longRunningTask
} @@ TestAspect.timeout(5.seconds)

// Retry flaky tests
test("sometimes fails") {
  flakyOperation
} @@ TestAspect.retry(100)

// Ignore tests
test("not ready yet") {
  pendingFeature
} @@ TestAspect.ignore

// Run only on specific platforms
test("JVM-specific") {
  jvmOperation
} @@ TestAspect.platformSpecific(TestPlatform.JVM)
```

---

## Comparison with Cats Effect

### Type System Differences

| Feature | ZIO | Cats Effect |
|---------|-----|-------------|
| **Effect Type** | `ZIO[R, E, A]` | `IO[E, A]` |
| **Environment** | Built-in `R` parameter | Need `Kleisli` or ReaderT |
| **Error Type** | First-class `E` parameter | `IO[E, A]` or `SyncIO` for pure |
| **Infallible** | `UIO[A]` = `ZIO[Any, Nothing, A]` | `IO[A]` (with `_ >: Nothing`) |

### Concurrency Model

| Feature | ZIO | Cats Effect |
|---------|-----|-------------|
| **Concurrency Primitive** | Fiber (built-in) | Fiber (via IO) |
| **Forking** | `fork` returns `Fiber[E, A]` | `.start` returns `Fiber[E, A]` |
| **Joining** | `fiber.join` or `fiber.await` | `fiber.join` |
| **Interruption** | First-class, `interrupt` | `fiber.cancel` |
| **Race** | `race`, `raceEither`, `raceFirst` | `raceBoth`, `racePair` |

### Error Handling

| ZIO | Cats Effect | Equivalence |
|-----|-------------|-------------|
| `ZIO.fail(e)` | `IO.raiseError(e)` | Create failed effect |
| `effect.catchAll` | `effect.handleErrorWith` | Catch all errors |
| `effect.catchSome` | `effect.handleErrorWith` (partial) | Catch some errors |
| `effect.orElse` | `effect.orElse` (simulated) | Fallback |
| `effect.attempt` | `effect.attempt` | Convert to Either |
| `effect.either` | `effect.attempt` | Either[E, A] |

### Resource Management

| ZIO | Cats Effect |
|-----|-------------|
| `ZManaged[R, E, A]` | `Resource[F, A]` |
| `ZIO.acquireRelease` | `Resource.make` |
| `ZIO.acquireReleaseExit` | `Resource.makeCase` |
| `managed.use` | `resource.use` |

### Dependency Injection

| Feature | ZIO | Cats Effect |
|---------|-----|-------------|
| **Built-in** | Yes (`R` parameter) | No (need libraries) |
| **Pattern** | `ZLayer` | `Kleisli`, `ReaderT` |
| **Composition** | Vertical (`>>>`), Horizontal (`++`) | Function composition |

### Common Mappings

```scala
// Cats Effect to ZIO
val ceIO: IO[Throwable, A] = ???
val zioTask: Task[A] = ZIO.attempt(ceIO.unsafeRunSync())

// ZIO to Cats Effect
val zioTask: Task[A] = ???
val ceIO: IO[Throwable, A] = IO.fromZIO(zioTask)

// With runtime
implicit val runtime: Runtime[Any] = Runtime.default
val ceIO: IO[Throwable, A] = IO.async_[A] { cb =>
  runtime.unsafe.fork(zioTask).unsafe.addObserver {
    case Exit.Success(value) => cb(Right(value))
    case Exit.Failure(cause) => cb(Left(cause.squash))
  }
}
```

### Key Conceptual Differences

1. **Environment**: ZIO has a first-class environment parameter; CE needs external solutions
2. **Error Handling**: ZIO distinguishes defects (unexpected) from failures (expected); CE treats them similarly
3. **Interruption**: ZIO has structured interruption; CE has cancellation
4. **Resources**: ZIO has both `ZManaged` and `ZIO.acquireRelease`; CE uses `Resource`
5. **Parallelism**: ZIO has parallel variants (`zipPar`, etc.); CE uses `.parZip2`
6. **Testing**: ZIO has built-in test framework; CE uses specs2/scalacheck

---

## Common Pitfalls

### 1. Blocking on the Main Thread Pool

❌ **Wrong**:
```scala
ZIO.attempt(Thread.sleep(1000))
```

✅ **Correct**:
```scala
ZIO.attemptBlocking(Thread.sleep(1000))
// or
ZIO.sleep(1.second)
```

### 2. Forgetting to Handle Errors

❌ **Wrong**:
```scala
def getData: ZIO[Any, IOException, String] = ???
val processed = getData.map(_.toUpperCase) // Can still fail!
```

✅ **Correct**:
```scala
val processed: ZIO[Any, IOException, String] =
  getData.map(_.toUpperCase)

// Or handle it
val processed: ZIO[Any, Nothing, String] =
  getData.map(_.toUpperCase).catchAll(_ => ZIO.succeed("default"))
```

### 3. Leaking Resources from ZManaged

❌ **Wrong**:
```scala
val leaked: ZIO[Any, IOException, Source] =
  managedFile.use(ZIO.succeed) // Returns the resource!
```

✅ **Correct**:
```scala
val result: ZIO[Any, IOException, String] =
  managedFile.use { source =>
    ZIO.attempt(source.mkString)
  }
```

### 4. Race Conditions with Ref

❌ **Wrong** (check-then-act):
```scala
for {
  ref <- Ref.make(0)
  _ <- ref.get.flatMap { current =>
    if (current < 10) ref.set(current + 1)
    else ZIO.unit
  }
} yield ()
```

✅ **Correct** (atomic update):
```scala
for {
  ref <- Ref.make(0)
  _ <- ref.modify { current =>
    if (current < 10) ((), current + 1)
    else ((), current)
  }
} yield ()
```

### 5. Not Using Parallel Operations

❌ **Wrong**:
```scala
// Sequential
val results = ZIO.foreach(List(task1, task2, task3))(identity)
```

✅ **Correct**:
```scala
// Parallel
val results = ZIO.foreachPar(List(task1, task2, task3))(identity)
```

### 6. Blocking on Fiber Join

❌ **Wrong**:
```scala
for {
  fiber <- task.fork
  result <- fiber.join // Blocks indefinitely if task loops
} yield result
```

✅ **Correct** (with timeout):
```scala
for {
  fiber <- task.fork
  result <- fiber.join.timeout(5.seconds)
} yield result
```

### 7. Forgetting to Provide Layers

❌ **Wrong**:
```scala
val program = ZIO.service[Database].flatMap(_.query("..."))
// Runtime error: Missing service
```

✅ **Correct**:
```scala
val program =
  ZIO.service[Database].flatMap(_.query("..."))
    .provideLayer(databaseLayer)
```

### 8. Using Mutable State

❌ **Wrong**:
```scala
var counter = 0
val effect = ZIO.foreach(1 to 10) { _ =>
  ZIO.succeed {
    counter += 1
    counter
  }
}
```

✅ **Correct**:
```scala
for {
  counter <- Ref.make(0)
  results <- ZIO.foreach(1 to 10) { _ =>
    counter.modify(c => (c + 1, c + 1))
  }
} yield results
```

### 9. Incorrect Error Channel Handling

❌ **Wrong**:
```scala
val result: ZIO[Any, String, Int] =
  ZIO.attempt(1 / 0).mapError(_.getMessage)
// This loses the ArithmeticException!
```

✅ **Correct**:
```scala
val result: ZIO[Any, Throwable, Int] =
  ZIO.attempt(1 / 0) // Keep Throwable error type

// Or refine specific errors
val result: ZIO[Any, String, Int] =
  ZIO.attempt(1 / 0).mapError {
    case _: ArithmeticException => "Division by zero"
    case t => t.getMessage
  }
```

### 10. Not Handling Interruption

❌ **Wrong**:
```scala
val uninterruptible =
  ZIO.uninterruptible(longRunningTask) // Can't be cancelled!
```

✅ **Correct** (use with care):
```scala
// Only use uninterruptible for critical sections
val criticalSection =
  ZIO.uninterruptible {
    for {
      _ <- acquireLock
      result <- criticalWork
      _ <- releaseLock
    } yield result
  }
```

---

## Terminology Mapping

### ZIO to Cats Effect

| ZIO | Cats Effect | Description |
|-----|-------------|-------------|
| `ZIO[R, E, A]` | `Kleisli[F, R, Either[E, A]]` | Effect with environment and error |
| `Task[A]` | `IO[A]` | Effect that can fail with Throwable |
| `UIO[A]` | `IO[A]` (infallible) | Effect that cannot fail |
| `Fiber[E, A]` | `Fiber[E, A]` | Concurrent computation |
| `ZLayer[-RIn, +E, +ROut]` | No direct equivalent | Dependency injection layer |
| `ZManaged[R, E, A]` | `Resource[F, A]` | Managed resource |
| `Ref[A]` | `Ref[F, A]` (cats-effect) | Atomic reference |
| `Promise[E, A]` | `Deferred[F, A]` | Single-assignment promise |
| `Queue[A]` | `Queue[F, A]` | Asynchronous queue |
| `Runtime[R]` | `IORuntime` | Runtime for executing effects |
| `Cause[E]` | No direct equivalent | Rich error type |
| `Exit[E, A]` | `Outcome[F, E, A]` | Result of effect execution |

### Cats Effect to ZIO

| Cats Effect | ZIO | Description |
|-------------|-----|-------------|
| `IO.parZipN` | `ZIO.zipPar` | Parallel zipping |
| `IO.raceBoth` | `ZIO.raceEither` | Race with both results |
| `IO.timeout` | `ZIO.timeout` | Add timeout |
| `Resource.make` | `ZIO.acquireRelease` | Resource management |
| `IO.async` | `ZIO.async` | Async callback |
| `IO.defer` | `ZIO.suspend` | Defer evaluation |
| `IO.uncancelable` | `ZIO.uninterruptible` | Uninterruptible region |
| `IO.cede` | `ZIO.yieldNow` | Yield to scheduler |
| `IO.sleep` | `ZIO.sleep` | Sleep for duration |
| `IO.realTime` | `Clock.currentTime` | Get current time |

---

## Quick Reference: Common Operations

### Creating Effects

```scala
// Success
ZIO.succeed(42)
ZIO.effectTotal(42) // Deprecated

// Failure
ZIO.fail("error")

// From side-effect
ZIO.attempt(throwableCode)       // Can fail
ZIO.succeedBlocking(blockingCode) // Known safe

// From Scala types
ZIO.fromEither(Right(42))
ZIO.fromOption(Some(42))
ZIO.fromTry(Try(42))

// Async
ZIO.async { callback =>
  callback(ZIO.succeed(42))
}
```

### Sequencing and Combining

```scala
// Sequential
zio1 *> zio2
zio1 <* zio2
zio1.flatMap(b => zio2)

// Parallel
zio1 &> zio2
zio1 <& zio2
zio1.zipPar(zio2)

// Both
zio1.zip(zio2)        // (A, B)
zio1.zipLeft(zio2)     // A
zio1.zipRight(zio2)    // B
```

### Error Recovery

```scala
// Catching
effect.catchAll(recovery)
effect.catchSome { case e => recovery }
effect.catchAllCause(cause => recovery)

// Fallback
effect.orElse(fallback)
effect.orElseFail(error)
effect.orElseSucceed(value)

// Retrying
effect.retry(schedule)
effect.retryN(n)

// Folding
effect.fold(onError, onSuccess)
effect.foldZIO(onError, onSuccess)
```

### Concurrency

```scala
// Forking
effect.fork
effect.forkDaemon
effect.forkManaged

// Joining
fiber.join
fiber.await
fiber.interrupt

// Racing
effect1.race(effect2)
effect1.raceEither(effect2)
```

### Environment

```scala
// Access services
ZIO.service[Service]
ZIO.serviceWith[Service](_.method)

// Provide layers
effect.provideLayer(layer)
effect.provideSomeLayer[Service](partialLayer)
effect.provide(serviceInstance) // For single service

// Environment manipulation
ZIO.environment[R]
effect.provideEnvironment(env)
```

### Resource Management

```scala
// Acquire/release
ZIO.acquireRelease(acquire)(release)(use)
ZIO.acquireReleaseExit(acquire)((res, exit) => release(res))(use)

// Managed
ZManaged.fromZIO(effect)
managed.use(resource => ...)
managed.map(_.method)
```

### State Management

```scala
// Ref
Ref.make(initial)
ref.get
ref.set(value)
ref.update(f)
ref.modify(f)

// Promise
Promise.make[E, A]
promise.await
promise.succeed(value)
promise.fail(error)

// Queue
Queue.bounded[Int](capacity)
queue.offer(value)
queue.take
queue.shutdown
```

---

## Mental Models

### ZIO[R, E, A] as a Function

Think of ZIO as a function:
```scala
ZEnvironment[R] => Either[E, A]
```

But with special powers:
- Async capability
- Concurrent execution
- Resource safety
- Interruption
- Fiber-based concurrency

### Layer as a Dependency Graph

Think of ZLayer as a recipe for building services:
```scala
RIn => Either[E, ROut]
```

Layers compose like functions:
- Vertical (`>>>`): Feed output to input
- Horizontal (`++`): Combine multiple outputs
- Parallel composition: Build concurrently

### Fiber as a Lightweight Thread

Think of Fiber as:
- Green thread (managed by ZIO scheduler)
- Structured concurrency (parent-child relationships)
- Interruptible (can be cancelled)
- Observable (can inspect status)

### Cause as an Error Tree

Think of Cause as a data structure representing:
- Sequential failures (`Then`)
- Parallel failures (`Both`)
- Expected failures (`Fail`)
- Unexpected failures (`Die`)
- Interruptions (`Interrupt`)

---

## Best Practices

### 1. Prefer Type-Safe Error Handling

```scala
// Define domain errors
sealed trait AppError
case class UserNotFound(id: String) extends AppError
case class DatabaseError(msg: String) extends AppError

// Use in effects
def getUser(id: String): ZIO[Database, AppError, User] = ???
```

### 2. Use Environment for Dependencies

```scala
// Define services as traits
trait UserRepository {
  def find(id: String): ZIO[Any, AppError, User]
}

// Require services in effects
def getUser(id: String): ZIO[UserRepository, AppError, User] =
  ZIO.serviceWithZIO[UserRepository](_.find(id))
```

### 3. Prefer Parallel Operations

```scala
// Use parallel variants when safe
ZIO.foreachPar(items)(process)
zio1.zipPar(zio2)
```

### 4. Handle Resources Properly

```scala
// Use acquireRelease for resources
ZIO.acquireRelease(openFile)(file => closeFile(file)) { file =>
  processFile(file)
}
```

### 5. Use Appropriate State Primitives

```scala
// Ref for simple shared state
Ref.make(initial)

// Promise for one-time coordination
Promise.make[E, A]

// Queue for async communication
Queue.bounded[A](capacity)

// Hub for pub/sub
Hub.bounded[A](capacity)

// STM for complex state
TQueue.make[A], TRef.make[A]
```

### 6. Write Testable Code

```scala
// Separate business logic from effects
def businessLogic(userId: String): ZIO[UserRepo, AppError, User] = ???

// Test with mock layers
test("fetches user") {
  for {
    user <- businessLogic("123").provideLayer(mockRepo)
  } yield assertTrue(user.id == "123")
}
```

---

## Further Reading

### Official Documentation
- ZIO Overview: https://zio.dev/overview/getting-started
- Core Reference: https://zio.dev/reference/core/zio
- Error Management: https://zio.dev/reference/error-management/index
- Concurrency: https://zio.dev/reference/concurrency/index
- Dependency Injection: https://zio.dev/reference/contextual/zlayer

### Source Code
- ZIO Core: `/Users/hmemcpy/git/zio-cats/zio/core/shared/src/main/scala/zio/`
  - ZIO.scala: Core effect type
  - Fiber.scala: Fiber implementation
  - Runtime.scala: Runtime system
  - Cause.scala: Error tracking
  - Ref.scala: Atomic references
  - Promise.scala: Promises
  - Queue.scala: Queues
- ZLayer: `/Users/hmemcpy/git/zio-cats/zio/core/shared/src/main/scala/zio/ZLayer.scala`
- ZManaged: `/Users/hmemcpy/git/zio-cats/zio/managed/shared/src/main/scala/zio/managed/ZManaged.scala`

### Books
- ZIONOMICON (Updated for ZIO 2.1): https://zio.dev/zionomicon

### Community
- GitHub: https://github.com/zio/zio
- Discord: https://discord.gg/2ccFBr4
- Twitter: @zio_https://twitter.com/zio

---

## Conclusion

ZIO provides a comprehensive effect system with first-class support for:
- **Typed errors** via the `E` parameter
- **Dependency injection** via the `R` parameter
- **Resource safety** via ZManaged and acquire/release
- **Fiber-based concurrency** with fine-grained interruption
- **Rich error tracking** via Cause
- **Modular dependency injection** via ZLayer

For Cats Effect developers, the key differences are:
1. Built-in environment parameter (no need for Kleisli)
2. First-class distinction between expected errors (E) and defects (Throwable)
3. Richer concurrency primitives with structured interruption
4. More sophisticated resource management with ZManaged
5. Built-in dependency injection with ZLayer

This research document provides a comprehensive foundation for creating bidirectional tutorials between ZIO and Cats Effect.

---

**Document Version**: 1.0
**Research Date**: 2026-01-25
**ZIO Version**: 2.1.x
**Source Repository**: https://github.com/zio/zio
**Research Scope**: Core ZIO, concurrency, resource management, dependency injection, and Cats Effect comparison
