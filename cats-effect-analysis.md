# Cats Effect 3 Deep Source Code Analysis

## Overview

This document provides a comprehensive analysis of Cats Effect 3 (CE3) source code, focusing on the core implementations of IO, Resource, Fiber, IORuntime, and the key patterns and idioms used throughout the library.

**Repository**: https://github.com/typelevel/cats-effect
**Analyzed Version**: Current main branch (2025)
**Key Files**:
- Core IO: `/core/shared/src/main/scala/cats/effect/IO.scala`
- IOFiber: `/core/shared/src/main/scala/cats/effect/IOFiber.scala`
- Resource: `/kernel/shared/src/main/scala/cats/effect/kernel/Resource.scala`
- IORuntime: `/core/shared/src/main/scala/cats/effect/unsafe/IORuntime.scala`
- Type Classes: `/kernel/shared/src/main/scala/cats/effect/kernel/`

---

## 1. Core IO Implementation

### 1.1 IO Definition and Structure

**File**: `/core/shared/src/main/scala/cats/effect/IO.scala` (lines 117-1186)

The `IO` ADT is a sealed abstract class with a `tag` field for optimized pattern matching:

```scala
sealed abstract class IO[+A] private () extends IOPlatform[A] {
  private[effect] def tag: Byte
  // ... methods
}
```

**Key Design Decisions**:
1. **Tag-based dispatch**: Uses `Byte` tags instead of standard pattern matching for performance
2. **Private constructor**: Prevents external extension
3. **Platform-specific extensions**: Extends `IOPlatform[A]` for JVM/JS/Native differences

### 1.2 IO ADT Cases (Internal Data Structure)

The IO type is implemented as a set of case classes and objects with specific byte tags:

```scala
// Tag 0: Pure value - no computation needed
final case class Pure[+A](value: A) extends IO[A] {
  def tag = 0
}

// Tag 1: Error - wraps a Throwable
final case class Error(t: Throwable) extends IO[Nothing] {
  def tag = 1
}

// Tag 2: Delay/Thunks - suspends a synchronous computation
final case class Delay[+A](thunk: () => A, event: TracingEvent) extends IO[A] {
  def tag = 2
}

// Tag 3: Real-time clock
case object RealTime extends IO[FiniteDuration] { def tag = 3 }

// Tag 4: Monotonic clock
case object Monotonic extends IO[FiniteDuration] { def tag = 4 }

// Tag 5: Read current ExecutionContext
case object ReadEC extends IO[ExecutionContext] { def tag = 5 }

// Tag 6: Map transformation
final case class Map[E, +A](ioe: IO[E], f: E => A, event: TracingEvent) extends IO[A] {
  def tag = 6
}

// Tag 7: FlatMap (bind)
final case class FlatMap[E, +A](
    ioe: IO[E],
    f: E => IO[A],
    event: TracingEvent)
  extends IO[A] {
  def tag = 7
}

// Tag 8: Attempt - materializes errors into Either
final case class Attempt[+A](ioa: IO[A]) extends IO[Either[Throwable, A]] {
  def tag = 8
}

// Tag 9: HandleErrorWith - error recovery
final case class HandleErrorWith[+A](
    ioa: IO[A],
    f: Throwable => IO[A],
    event: TracingEvent)
  extends IO[A] {
  def tag = 9
}

// Tag 10: Canceled - self-cancelation signal
case object Canceled extends IO[Unit] { def tag = 10 }

// Tag 11: OnCancel - register finalizer
final case class OnCancel[+A](ioa: IO[A], fin: IO[Unit]) extends IO[A] {
  def tag = 11
}

// Tag 12: Uncancelable - masking region
final case class Uncancelable[+A](
    body: Poll[IO] => IO[A],
    event: TracingEvent)
  extends IO[A] {
  def tag = 12
}

// Tag 13: UnmaskRunLoop - internal unmasking (created by runloop)
final case class UnmaskRunLoop[+A](ioa: IO[A], id: Int, self: IOFiber[?]) extends IO[A] {
  def tag = 13
}

// Tag 14: IOCont - low-level continuation for async
final case class IOCont[K, R](body: Cont[IO, K, R], event: TracingEvent)
  extends IO[R] {
  def tag = 14
}

// Tag 15: Cont.Get - internal async state access
final case class Get[A](state: ContState) extends IO[A] {
  def tag = 15
}

// Tag 16: Cede - yield control to scheduler
case object Cede extends IO[Unit] { def tag = 16 }

// Tag 17: Start - spawn a fiber
final case class Start[A](ioa: IO[A]) extends IO[FiberIO[A]] {
  def tag = 17
}

// Tag 18: RacePair - race two fibers with access to both
final case class RacePair[A, B](ioa: IO[A], iob: IO[B])
  extends IO[Either[(OutcomeIO[A], FiberIO[B]), (FiberIO[A], OutcomeIO[B])]] {
  def tag = 18
}

// Tag 19: Sleep - asynchronous delay
final case class Sleep(delay: FiniteDuration) extends IO[Unit] {
  def tag = 19
}

// Tag 20: EvalOn - shift execution context
final case class EvalOn[+A](ioa: IO[A], ec: ExecutionContext) extends IO[A] {
  def tag = 20
}

// Tag 21: Blocking - run blocking computation
final case class Blocking[+A](
    hint: Sync.Type,
    thunk: () => A,
    event: TracingEvent)
  extends IO[A] {
  def tag = 21
}

// Tag 22: Local - IOLocal manipulation
final case class Local[+A](f: IOLocalState => (IOLocalState, A)) extends IO[A] {
  def tag = 22
}

// Tag 23: IOTrace - get stack trace
case object IOTrace extends IO[Trace] { def tag = 23 }

// Tag 24: ReadRT - read IORuntime
case object ReadRT extends IO[IORuntime] { def tag = 24 }

// Tag -1: EndFiber - terminal state (internal only)
case object EndFiber extends IO[Nothing] { def tag = -1 }
```

### 1.3 Key Operations and Implementations

#### flatMap (Line 469-470)
```scala
def flatMap[B](f: A => IO[B]): IO[B] =
  IO.FlatMap(this, f, Tracing.calculateTracingEvent(f))
```
- Creates a `FlatMap` node with tracing information
- Tracing events capture call stack for debugging

#### map (Line 579)
```scala
def map[B](f: A => B): IO[B] = IO.Map(this, f, Tracing.calculateTracingEvent(f))
```
- Creates a `Map` node with tracing information

#### handleErrorWith (Line 549-550)
```scala
def handleErrorWith[B >: A](f: Throwable => IO[B]): IO[B] =
  IO.HandleErrorWith(this, f, Tracing.calculateTracingEvent(f))
```
- Creates a `HandleErrorWith` node for error recovery

#### attempt (Line 200-201)
```scala
def attempt: IO[Either[Throwable, A]] =
  IO.Attempt(this)
```
- Materializes errors into `Either` space

#### bracket (Line 338-339)
```scala
def bracket[B](use: A => IO[B])(release: A => IO[Unit]): IO[B] =
  bracketCase(use)((a, _) => release(a))
```
- Implemented using `bracketCase` and `bracketFull`
- Ensures release runs even on error/cancelation

#### uncancelable (Line 1712-1713)
```scala
def uncancelable[A](body: Poll[IO] => IO[A]): IO[A] =
  Uncancelable(body, Tracing.calculateTracingEvent(body))
```
- Creates a masking region where cancellation is suppressed
- Takes a `Poll` function to selectively allow cancellation

---

## 2. IOFiber Implementation

### 2.1 Fiber Structure and State

**File**: `/core/shared/src/main/scala/cats/effect/IOFiber.scala` (lines 68-1126)

```scala
private final class IOFiber[A](
    initState: IOLocalState,
    cb: OutcomeIO[A] => Unit,
    startIO: IO[A],
    startEC: ExecutionContext,
    rt: IORuntime
) extends IOFiberPlatform[A]
    with FiberIO[A]
    with Runnable {

  // State variables
  private[this] var localState: IOLocalState = initState
  private[this] var currentCtx: ExecutionContext = startEC
  private[this] val objectState: ArrayStack[AnyRef] = ArrayStack()
  private[this] val finalizers: ArrayStack[IO[Unit]] = ArrayStack()
  private[this] val callbacks: CallbackStack[OutcomeIO[A]] = CallbackStack.of(cb)
  private[this] var resumeTag: Byte = ExecR
  private[this] var resumeIO: IO[Any] = startIO
  private[this] val runtime: IORuntime = rt
  private[this] val tracingEvents: RingBuffer = /* ... */

  // Continuation stack (for flatMap chains)
  private[this] var conts: ByteStack.T = _

  // Cancellation state
  private[this] var canceled: Boolean = false
  private[this] var masks: Int = 0
  private[this] var finalizing: Boolean = false

  // Outcome (published via memory barriers)
  @volatile
  private[this] var outcome: OutcomeIO[A] = _
}
```

**Key Design Patterns**:

1. **Continuation Stack (`conts`)**: Byte-based stack for tracking continuations
2. **Object State Stack**: Stores intermediate values during computation
3. **Finalizers Stack**: LIFO stack of cleanup actions
4. **Cancellation Masking**: `masks` counter tracks nesting of `uncancelable`
5. **Memory Barriers**: Uses `suspended` AtomicBoolean for safe publication

### 2.2 Runloop Implementation

The runloop is the heart of IO execution (lines 211-1073):

```scala
@tailrec
private[this] def runLoop(
    _cur0: IO[Any],
    cancelationIterations: Int,
    autoCedeIterations: Int): Unit = {

  // Termination check
  if (_cur0 eq IO.EndFiber) {
    return
  }

  // Cancellation checking (periodic)
  var nextCancelation = cancelationIterations - 1
  if (nextCancelation <= 0) {
    readBarrier()  // Memory barrier for visibility
    nextCancelation = runtime.cancelationCheckThreshold

    // Auto-yielding for fairness
    if (nextAutoCede <= 0) {
      resumeTag = AutoCedeR
      resumeIO = _cur0
      val ec = currentCtx
      rescheduleFiber(ec, this)
      return
    }
  }

  // Finalization check
  if (shouldFinalize()) {
    val fin = prepareFiberForCancelation(null)
    runLoop(fin, nextCancelation, nextAutoCede)
  } else {
    // Main dispatch using tag-based switch
    (cur0.tag: @switch) match {
      case 0 => // Pure
      case 1 => // Error
      case 2 => // Delay
      // ... all 25 cases
    }
  }
}
```

**Key Optimizations**:

1. **Tag-based `@switch`**: Generates a `tableswitch` bytecode for O(1) dispatch
2. **Loop fusion**: Special cases for `Map(Pure(x))`, `FlatMap(Pure(x))`, etc. avoid extra allocations
3. **Periodic cancellation checks**: Configurable threshold (default 512 iterations)
4. **Auto-yielding**: Automatic fairness boundaries every N iterations

### 2.3 Cancellation Mechanism

**Cancellation State Machine** (lines 1132-1164):

```scala
private[this] def shouldFinalize(): Boolean =
  canceled && isUnmasked()

private[this] def isUnmasked(): Boolean =
  masks == 0

private[this] def prepareFiberForCancelation(
    cb: Either[Throwable, Unit] => Unit): IO[Any] = {

  if (!finalizers.isEmpty()) {
    if (!finalizing) {
      finalizing = true

      // Replace continuation stack with cancellation loop
      conts = ByteStack.create(8)
      conts = ByteStack.push(conts, CancelationLoopK)

      objectState.init(16)
      objectState.push(cb)

      // Suppress further cancellation
      masks += 1
    }

    // Return first finalizer
    finalizers.pop()
  } else {
    // No finalizers - complete cancellation
    if (cb ne null) {
      cb(RightUnit)
    }
    done(IOFiber.OutcomeCanceled.asInstanceOf[OutcomeIO[A]])
    IO.EndFiber
  }
}
```

**Cancellation Flow**:
1. External cancel sets `canceled = true`
2. Runloop checks `shouldFinalize()` at cancellation boundaries
3. If unmasked, prepare finalization:
   - Set `finalizing = true`
   - Replace `conts` with `CancelationLoopK`
   - Increment `masks` to suppress recursive cancellation
4. Execute finalizers in LIFO order
5. Complete with `Outcome.Canceled`

### 2.4 Async State Machine (Cont)

**IOCont for Async Operations** (lines 604-883):

The `IOCont` node handles asynchronous operations with a sophisticated state machine:

```scala
case 14 =>
  val cur = cur0.asInstanceOf[IOCont[Any, Any]]
  val body = cur.body
  val state = new ContState(finalizing)

  val cb: Either[Throwable, Any] => Unit = { e =>
    val result = if (e eq null) {
      Left(new NullPointerException())
    } else {
      e
    }

    @tailrec
    def loop(): Unit = {
      // Try to take ownership of runloop
      if (resume()) {
        if (finalizing == state.wasFinalizing) {
          if (!shouldFinalize()) {
            // Schedule continuation
            result match {
              case Left(t) =>
                resumeTag = AsyncContinueFailedR
                objectState.push(t)
              case Right(a) =>
                resumeTag = AsyncContinueSuccessfulR
                objectState.push(a.asInstanceOf[AnyRef])
            }
          } else {
            // Was canceled - run finalizers
            resumeTag = AsyncContinueCanceledR
          }
          scheduleFiber(ec, this)
        }
      } else if (finalizing == state.wasFinalizing &&
                 !shouldFinalize() &&
                 outcome == null) {
        loop()  // Spin until we can acquire runloop
      }
    }

    // CAS loop on Cont state
    @tailrec
    def stateLoop(): Unit = {
      val tag = state.get()
      if ((tag eq null) || (tag eq waiting)) {
        if (!state.compareAndSet(tag, result)) {
          stateLoop()
        } else {
          if (tag eq waiting) {
            loop()  // Get was waiting - resume
          }
        }
      }
    }

    stateLoop()
  }

  val get: IO[Any] = IOCont.Get(state)
  val next = try {
    body[IO].apply(cb, get, FunctionK.id)
  } catch {
    case t if UnsafeNonFatal(t) => IO.raiseError(t)
    case t: Throwable => onFatalFailure(t)
  }

  runLoop(next, nextCancelation, nextAutoCede)
```

**Async State Transitions**:
- `null` → "initial" (neither callback nor Get has run)
- `waiting` → "Get waiting for callback" (Get arrived first)
- `result` → "callback completed" (Either[Throwable, A])

### 2.5 Fiber Operations

**Cancel Implementation** (lines 141-175):

```scala
@volatileNative
private[this] var _cancel: IO[Unit] = IO uncancelable { _ =>
  canceled = true

  if (resume()) {
    // We own the runloop
    if (isUnmasked()) {
      // Run finalizers ourselves
      IO.async_[Unit] { fin =>
        resumeTag = AsyncContinueCanceledWithFinalizerR
        objectState.push(fin)
        scheduleFiber(ec, this)
      }
    } else {
      // Masked - wait for completion
      suspend()
      join.void
    }
  } else {
    // Someone else owns runloop - wait for them
    join.void
  }
}

def cancel: IO[Unit] = {
  readBarrier()
  _cancel
}
```

**Join Implementation** (lines 178-195):

```scala
@volatileNative
private[this] var _join: IO[OutcomeIO[A]] = IO.asyncCheckAttempt { cb =>
  IO {
    if (outcome == null) {
      val handle = callbacks.push(oc => cb(Right(oc)))

      // Double-check after registering
      if (outcome != null) {
        callbacks.clearHandle(handle)
        Right(outcome)
      } else {
        Left(Some(IO { callbacks.clearHandle(handle); () }))
      }
    } else {
      Right(outcome)
    }
  }
}

def join: IO[OutcomeIO[A]] = {
  readBarrier()
  _join
}
```

**Key Optimizations**:
1. **Volatile fields**: `_cancel` and `_join` are swapped with `IO.unit` and `IO.pure(outcome)` on completion
2. **Double-checked locking**: Register callback, then recheck outcome
3. **Cancelable registration**: Returns finalizer to unregister callback

---

## 3. Resource Implementation

### 3.1 Resource ADT

**File**: `/kernel/shared/src/main/scala/cats/effect/kernel/Resource.scala` (lines 152-795)

```scala
sealed abstract class Resource[F[_], +A] extends Serializable {
  // ... methods
}

// ADT Cases (lines 1154-1165):
final case class Allocate[F[_], A](
  resource: Poll[F] => F[(A, ExitCase => F[Unit])])
  extends Resource[F, A]

final case class Bind[F[_], S, +A](
  source: Resource[F, S],
  fs: S => Resource[F, A])
  extends Resource[F, A]

final case class Pure[F[_], +A](a: A) extends Resource[F, A]

final case class Eval[F[_], A](fa: F[A]) extends Resource[F, A]
```

**Four Node Types**:
1. **Allocate**: Acquires a resource with a finalizer
2. **Bind**: Sequences resources (like flatMap)
3. **Pure**: Lifts a pure value
4. **Eval**: Lifts an effect

### 3.2 Resource Interpretation (fold)

**The Resource Interpreter** (lines 155-195):

```scala
private[effect] def fold[B](
    onOutput: A => F[B],
    onRelease: (ExitCase => F[Unit], ExitCase) => F[Unit]
)(implicit F: MonadCancel[F, Throwable]): F[B] = {

  sealed trait Stack[AA]
  case object Nil extends Stack[A]
  final case class Frame[AA, BB](
    head: AA => Resource[F, BB],
    tail: Stack[BB])
    extends Stack[AA]

  @tailrec def loop[C](
      current: Resource[F, C],
      stack: Stack[C]): F[B] =
    current match {
      case Allocate(resource) =>
        F.bracketFull(resource) {
          case (a, _) =>
            stack match {
              case Nil => onOutput(a)
              case Frame(head, tail) => loop(head(a), tail)
            }
        } {
          case ((_, release), outcome) =>
            onRelease(release, ExitCase.fromOutcome(outcome))
        }

      case Bind(source, fs) =>
        loop(source, Frame(fs, stack))

      case Pure(v) =>
        stack match {
          case Nil => onOutput(v)
          case Frame(head, tail) =>
            loop(head(v), tail)
        }

      case Eval(fa) =>
        fa.flatMap(a => continue(Resource.pure(a), stack))
    }

  loop(this, Nil)
}
```

**Key Design Patterns**:

1. **Manual Stack Management**: Avoids stack overflow through custom stack
2. **Tail-Recursive Interpretation**: `@tailrec` ensures constant stack usage
3. **Bracket-Based**: Uses `bracketFull` for safe resource acquisition

### 3.3 Resource Allocation (allocatedCase)

**Allocation with Finalizer Extraction** (lines 463-530):

```scala
def allocatedCase[B >: A](
    implicit F: MonadCancel[F, Throwable]): F[(B, ExitCase => F[Unit])] = {

  sealed trait Stack[AA]
  case object Nil extends Stack[B]
  final case class Frame[AA, BB](
    head: AA => Resource[F, BB],
    tail: Stack[BB])
    extends Stack[AA]

  @tailrec def loop[C](
      current: Resource[F, C],
      stack: Stack[C],
      release: ExitCase => F[Unit]): F[(B, ExitCase => F[Unit])] =
    current match {
      case Allocate(resource) =>
        F uncancelable { poll =>
          resource(poll) flatMap {
            case (b, rel) =>
              val rel2 = (ec: ExitCase) =>
                rel(ec).guarantee(F.unit >> release(ec))

              stack match {
                case Nil =>
                  // No flatMaps - don't poll to avoid masking gap
                  F.pure((b, rel2))

                case Frame(head, tail) =>
                  poll(continue(head(b), tail, rel2))
                    .onCancel(rel(ExitCase.Canceled))
                    .onError {
                      case e =>
                        rel(ExitCase.Errored(e))
                          .handleError(_ => ())
                    }
              }
          }
        }

      case Bind(source, fs) =>
        loop(source, Frame(fs, stack), release)

      case Pure(v) =>
        stack match {
          case Nil =>
            (v: B, release).pure[F]
          case Frame(head, tail) =>
            loop(head(v), tail, release)
        }

      case Eval(fa) =>
        fa.flatMap(a => continue(Resource.pure(a), stack, release))
    }

  loop(this, Nil, _ => F.unit)
}
```

**Critical Safety Property**: The `Nil` case doesn't poll to avoid creating a "masking gap" that would allow cancellation between acquisition and the finalizer being registered.

### 3.4 Resource Combinators

#### both (Parallel Allocation) (lines 285-313):

```scala
def both[B](that: Resource[F, B])(
    implicit F: Concurrent[F]): Resource[F, (A, B)] = {

  type Finalizer = ExitCase => F[Unit]
  type Update = (Finalizer => Finalizer) => F[Unit]

  def allocate[C](
      r: Resource[F, C],
      storeFinalizer: Update): F[C] =
    r.fold(
      _.pure[F],
      (release, _) =>
        storeFinalizer(fin => ec =>
          F.unit >> fin(ec).guarantee(release(ec)))
    )

  val noop: Finalizer = _ => F.unit
  val bothFinalizers = F.ref((noop, noop))

  Resource
    .makeCase(bothFinalizers) { (finalizers, ec) =>
      finalizers.get.flatMap {
        case (thisFin, thatFin) =>
          F.void(F.both(thisFin(ec), thatFin(ec)))
      }
    }
    .evalMap { store =>
      val thisStore: Update = f =>
        store.update(_.bimap(f, identity))
      val thatStore: Update = f =>
        store.update(_.bimap(identity, f))

      F.both(allocate(this, thisStore), allocate(that, thatStore))
    }
}
```

**Key Features**:
- Allocates resources concurrently
- Combines finalizers into a composite finalizer
- Both finalizers run concurrently on release

### 3.5 Resource Exit Cases

**ExitCase ADT** (lines 1177-1205):

```scala
sealed trait ExitCase extends Product with Serializable {
  def toOutcome[F[_]: Applicative]: Outcome[F, Throwable, Unit]
}

object ExitCase {
  case object Succeeded extends ExitCase {
    def toOutcome[F[_]](implicit F: Applicative[F]):
        Outcome.Succeeded[F, Throwable, Unit] =
      Outcome.Succeeded(F.unit)
  }

  case object Canceled extends ExitCase {
    def toOutcome[F[_]](implicit F: Applicative[F]):
        Outcome.Canceled[F, Throwable, Unit] =
      Outcome.Canceled()
  }

  final case class Errored(e: Throwable) extends ExitCase {
    def toOutcome[F[_]](implicit F: Applicative[F]):
        Outcome.Errored[F, Throwable, Unit] =
      Outcome.Errored(e)
  }
}
```

**Three Exit Conditions**:
1. **Succeeded**: Normal completion
2. **Errored**: Completed with exception
3. **Canceled**: Aborted by cancellation

---

## 4. IORuntime Implementation

### 4.1 IORuntime Structure

**File**: `/core/shared/src/main/scala/cats/effect/unsafe/IORuntime.scala` (lines 40-108):

```scala
final class IORuntime private[unsafe] (
    val compute: ExecutionContext,
    private[effect] val blocking: ExecutionContext,
    val scheduler: Scheduler,
    private[effect] val pollers: List[Any],
    private[effect] val fiberMonitor: FiberMonitor,
    val shutdown: () => Unit,
    val config: IORuntimeConfig,
    val metrics: IORuntimeMetrics
) {

  private[effect] val fiberErrorCbs: StripedHashtable =
    new StripedHashtable()

  // Cached config values for performance
  private[effect] val cancelationCheckThreshold: Int =
    config.cancelationCheckThreshold
  private[effect] val autoYieldThreshold: Int =
    config.autoYieldThreshold
  private[effect] val enhancedExceptions: Boolean =
    config.enhancedExceptions
  private[effect] val traceBufferLogSize: Int =
    config.traceBufferLogSize

  def liveFiberSnapshot(): FiberSnapshot =
    fiberMonitor.liveFiberSnapshot()
}
```

**Runtime Components**:
1. **compute**: Main execution context for async operations
2. **blocking**: Separate pool for blocking operations
3. **scheduler**: Handles timing (sleep, timeouts)
4. **pollers**: I/O polling (platform-specific)
5. **fiberMonitor**: Tracks live fibers for debugging
6. **shutdown**: Cleanup function
7. **config**: Runtime configuration
8. **metrics**: Performance monitoring

### 4.2 Runtime Creation

**IORuntime Companion** (lines 112-140):

```scala
def apply(
    compute: ExecutionContext,
    blocking: ExecutionContext,
    scheduler: Scheduler,
    pollers: List[Any],
    shutdown: () => Unit,
    config: IORuntimeConfig): IORuntime = {

  val fiberMonitor = FiberMonitor(compute)
  val unregister = registerFiberMonitorMBean(fiberMonitor)
  val metrics = IORuntimeMetrics(compute)

  def unregisterAndShutdown: () => Unit = () => {
    unregister()
    shutdown()
    allRuntimes.remove(runtime, runtime.hashCode())
  }

  lazy val runtime =
    new IORuntime(
      compute,
      blocking,
      scheduler,
      pollers,
      fiberMonitor,
      unregisterAndShutdown,
      config,
      metrics)

  allRuntimes.put(runtime, runtime.hashCode())
  runtime
}
```

**Key Features**:
- **FiberMonitor registration**: MBean for JMX monitoring
- **Runtime tracking**: Global registry of all runtimes
- **Metrics collection**: Built-in performance metrics

---

## 5. Type Class Hierarchy

### 5.1 MonadCancel

**File**: `/kernel/shared/src/main/scala/cats/effect/kernel/MonadCancel.scala` (lines 223-468)

```scala
trait MonadCancel[F[_], E] extends MonadError[F, E] {

  /**
   * Root cancelation scope semantics.
   * - Cancelable: IO-like types with auto-cancelation
   * - Uncancelable: Types without cancelation (e.g., ReaderT)
   */
  def rootCancelScope: CancelScope

  /**
   * Masks cancelation on the current fiber.
   * The Poll[F] parameter allows selective unmasking.
   */
  def uncancelable[A](body: Poll[F] => F[A]): F[A]

  /**
   * Self-cancelation signal.
   * Returns F[Unit] not F[Nothing] due to masking.
   */
  def canceled: F[Unit]

  /**
   * Registers a finalizer that runs on cancellation.
   */
  def onCancel[A](fa: F[A], fin: F[Unit]): F[A]

  /**
   * Bracket pattern for resource management.
   * acquire: uncancelable
   * release: uncancelable
   * use: cancelable (can be masked)
   */
  def bracket[A, B](
      acquire: F[A])(
      use: A => F[B])(
      release: A => F[Unit]): F[B]

  def bracketCase[A, B](
      acquire: F[A])(
      use: A => F[B])(
      release: (A, Outcome[F, E, B]) => F[Unit]): F[B]

  def bracketFull[A, B](
      acquire: Poll[F] => F[A])(
      use: A => F[B])(
      release: (A, Outcome[F, E, B]) => F[Unit]): F[B]

  // Combinators
  def guarantee[A](fa: F[A], fin: F[Unit]): F[A]
  def guaranteeCase[A](fa: F[A])(
      fin: Outcome[F, E, A] => F[Unit]): F[A]
  def forceR[A, B](fa: F[A])(fb: F[B]): F[B]
}
```

**Key Concepts**:
1. **Masking**: `uncancelable` suppresses cancellation
2. **Polling**: Selective unmasking within masked regions
3. **Finalizers**: Actions guaranteed to run on cancellation
4. **Bracket Pattern**: Safe resource management

### 5.2 GenSpawn

**File**: `/kernel/shared/src/main/scala/cats/effect/kernel/GenSpawn.scala` (lines 171-400)

```scala
trait GenSpawn[F[_], E] extends MonadCancel[F, E] with Unique[F] {

  /**
   * Default root scope is Cancelable (can be canceled).
   */
  final def rootCancelScope: CancelScope = CancelScope.Cancelable

  /**
   * Spawns a fiber that executes concurrently.
   * Cancelation-unsafe - consider using 'background' instead.
   */
  def start[A](fa: F[A]): F[Fiber[F, E, A]]

  /**
   * Returns a Resource that manages a fiber's lifecycle.
   * Safer than start - fiber is canceled when Resource exits.
   */
  def background[A](fa: F[A]): Resource[F, F[Outcome[F, E, A]]] =
    Resource.make(start(fa))(_.cancel)(this).map(_.join)

  /**
   * Makes an uncancelable effect cancelable via external finalizer.
   */
  def cancelable[A](fa: F[A], fin: F[Unit]): F[A] =
    uncancelable { poll =>
      start(fa) flatMap { fiber =>
        poll(fiber.join)
          .onCancel(fin.guarantee(fiber.cancel))
          .flatMap(_.embed(poll(canceled *> never)))
      }
    }

  /**
   * Non-terminating effect.
   * Can be canceled if unmasked before suspending.
   */
  def never[A]: F[A]

  /**
   * Introduces fairness boundary - yields to scheduler.
   */
  def cede: F[Unit]

  /**
   * Races two effects - winner's result is returned, loser canceled.
   */
  def race[A, B](fa: F[A], fb: F[B]): F[Either[A, B]]

  /**
   * Races two effects - returns both outcome and loser fiber.
   */
  def racePair[A, B](
      fa: F[A],
      fb: F[B]): F[Either[(Outcome[F, E, A], Fiber[F, E, B]),
                          (Fiber[F, E, A], Outcome[F, E, B])]]

  /**
   * Races two effects - both outcomes are produced.
   */
  def bothOutcome[A, B](
      fa: F[A],
      fb: F[B]): F[(Outcome[F, E, A], Outcome[F, E, B])]

  /**
   * Races two effects - both results are produced (cancels on error).
   */
  def both[A, B](fa: F[A], fb: F[B]): F[(A, B)]
}
```

**Key Concurrency Primitives**:
1. **start**: Spawn concurrent fiber
2. **race**: First to finish wins, loser canceled
3. **racePair**: Get winner and access to loser fiber
4. **both**: Run concurrently, cancel both on error
5. **cede**: Yield control (fairness)
6. **never**: Non-terminating computation

### 5.3 GenConcurrent and Async

The hierarchy continues:

```scala
// GenConcurrent adds:
trait GenConcurrent[F[_], E] extends GenSpawn[F, E] {
  def ref[A](a: A): F[Ref[F, A]]
  def deferred[A]: F[Deferred[F, A]]
}

// GenTemporal adds time operations:
trait GenTemporal[F[_], E] extends GenConcurrent[F, E] with Clock[F] {
  def sleep(time: FiniteDuration): F[Unit]
}

// Async adds asynchronous operations:
trait Async[F[_]] extends GenTemporal[F, Throwable] with Sync[F] {
  def async[A](k: (Either[Throwable, A] => Unit) => IO[Option[IO[Unit]]]): F[A]
  def async_[A](k: (Either[Throwable, A] => Unit) => Unit): F[A]
  def evalOn[A](fa: F[A], ec: ExecutionContext): F[A]
  def executionContext: F[ExecutionContext]
}
```

### 5.4 Outcome

**File**: `/kernel/shared/src/main/scala/cats/effect/kernel/Outcome.scala` (lines 70-121)

```scala
sealed trait Outcome[F[_], E, A] extends Product with Serializable {

  /**
   * Embeds the Outcome back into F.
   * - Canceled: runs onCancel
   * - Errored: raises error
   * - Succeeded: returns the value
   */
  def embed(onCancel: F[A])(implicit F: MonadCancel[F, E]): F[A] =
    fold(onCancel, F.raiseError, identity)

  def embedNever(implicit F: GenSpawn[F, E]): F[A] =
    embed(F.never)

  def fold[B](
      canceled: => B,
      errored: E => B,
      completed: F[A] => B): B = {
    this match {
      case Canceled() => canceled
      case Errored(e) => errored(e)
      case Succeeded(fa) => completed(fa)
    }
  }

  def mapK[G[_]](f: F ~> G): Outcome[G, E, A]

  def isSuccess: Boolean
  def isError: Boolean
  def isCanceled: Boolean
}

object Outcome {
  final case class Succeeded[F[_], E, A](fa: F[A]) extends Outcome[F, E, A]
  final case class Errored[F[_], E, A](e: E) extends Outcome[F, E, A]
  final case class Canceled[F[_], E, A]() extends Outcome[F, E, A]
}
```

**Why `Succeeded` wraps `F[A]`**:
- Supports monad transformers (e.g., `OptionT[IO, A]`)
- Allows `Outcome` to be constructed without evaluating `A`
- For `IO`, typically `Outcome.Succeeded(IO.pure(a))`

### 5.5 Fiber

**File**: `/kernel/shared/src/main/scala/cats/effect/kernel/Fiber.scala` (lines 28-87)

```scala
trait Fiber[F[_], E, A] extends Serializable {

  /**
   * Cancel the fiber and await finalization.
   * - Idempotent: repeated calls just wait
   * - Uncancelable: caller is masked
   * - Blocking: waits for finalization to complete
   */
  def cancel: F[Unit]

  /**
   * Await completion and return the Outcome.
   */
  def join: F[Outcome[F, E, A]]

  /**
   * Await completion and extract result.
   * - Succeeded: returns value
   * - Errored: raises error
   * - Canceled: runs onCancel
   */
  def joinWith(onCancel: F[A])(implicit F: MonadCancel[F, E]): F[A] =
    join.flatMap(_.embed(onCancel))

  /**
   * Await completion, suspending forever on cancellation.
   */
  def joinWithNever(implicit F: GenSpawn[F, E]): F[A] =
    joinWith(F.never)

  /**
   * Await completion, returning () on cancellation.
   */
  def joinWithUnit(implicit F: MonadCancel[F, E], ev: Unit <:< A): F[A] = {
    val _ = ev
    joinWith(F.unit.asInstanceOf[F[A]])
  }
}
```

---

## 6. Key Patterns and Idioms

### 6.1 Memory Barrier Exploitation

**From IOFiber.scala** (lines 32-67):

```scala
/*
 * Rationale on memory barrier exploitation in this class...
 *
 * This class extends AtomicBoolean to forego allocating a separate
 * AtomicBoolean object. All credit goes to Viktor Klang.
 *
 * The runloop is held by a single thread at any moment in time.
 * This is ensured by the `suspended` AtomicBoolean, which is set to
 * `true` when evaluation of an Async causes us to semantically block.
 * Releasing the runloop can thus only be done by passing through a
 * write barrier (on `suspended`), and relocating that runloop can
 * itself only be achieved by passing through that same read/write
 * barrier (a CAS on `suspended`).
 *
 * Separate from this, the runloop may be *relocated* to a different
 * thread – for example, when evaluating Cede. When this happens, we
 * pass through a read/write barrier within the Executor as we enqueue
 * the action to restart the runloop, and then again when that action
 * is dequeued on the new thread. This ensures that everything is
 * appropriately published.
 *
 * By this argument, the `conts` stack is non-volatile and can be safely
 * implemented with an array. It is only accessed by one thread at a
 * time (so there are no atomicity concerns), and it only becomes
 * relevant to another thread after passing through either an executor
 * or the `suspended` gate, both of which would ensure safe publication
 * of writes.
 */
```

**Key Patterns**:
1. **Single-threaded runloop**: Only one thread executes at a time
2. **CAS as memory barrier**: `suspended.compareAndSet` ensures publication
3. **Non-volatile state**: Arrays and stacks don't need `volatile` due to barriers
4. **Executor barriers**: Thread pool enqueue/dequeue provides memory barriers

### 6.2 Stack-Safe Trampolining

**Tag-based Dispatch with Tail Recursion**:

```scala
@tailrec
private[this] def runLoop(
    _cur0: IO[Any],
    cancelationIterations: Int,
    autoCedeIterations: Int): Unit = {
  // ... switch on tag
  (cur0.tag: @switch) match {
    case 0 => runLoop(succeeded(cur.value, 0), ...)
    case 1 => runLoop(failed(cur.t, 0), ...)
    // ... all cases are tail-recursive
  }
}
```

**Key Features**:
1. **Constant stack usage**: All calls are tail-recursive
2. **Manual stack**: `conts` ByteStack tracks continuations
3. **Loop fusion**: Optimizes common patterns (e.g., `Map(Pure(x))`)

### 6.3 Cancellation Boundaries

**Cancellation Check Pattern** (from IOFiber.scala lines 224-240):

```scala
var nextCancelation = cancelationIterations - 1
if (nextCancelation <= 0) {
  readBarrier()  // Ensure we see cancelation
  nextCancelation = runtime.cancelationCheckThreshold
  nextAutoCede -= nextCancelation

  if (nextAutoCede <= 0) {
    // Auto-yield for fairness
    resumeTag = AutoCedeR
    resumeIO = _cur0
    val ec = currentCtx
    rescheduleFiber(ec, this)
    return
  }
}
```

**Cancellation Boundaries**:
- Occur at every iteration of runloop (when counter expires)
- Also occur at async boundaries (`IOCont`, `Start`, `RacePair`)
- Can be masked by `uncancelable` (tracked by `masks` counter)

**Non-Cancelable Boundaries** (from MonadCancel documentation):
1. Inside `uncancelable` (not inside `poll`)
2. Immediately after `uncancelable` (prevents masking gap)
3. Immediately after `poll` (if successful)

### 6.4 Resource Bracket Pattern

**Implementation of bracket** (from MonadCancel.scala lines 409-467):

```scala
def bracket[A, B](acquire: F[A])(use: A => F[B])(release: A => F[Unit]): F[B] =
  bracketCase(acquire)(use)((a, _) => release(a))

def bracketCase[A, B](acquire: F[A])(use: A => F[B])(
    release: (A, Outcome[F, E, B]) => F[Unit]): F[B] =
  bracketFull(_ => acquire)(use)(release)

def bracketFull[A, B](acquire: Poll[F] => F[A])(use: A => F[B])(
    release: (A, Outcome[F, E, B]) => F[Unit]): F[B] =
  uncancelable { poll =>
    acquire(poll).flatMap { a =>
      guaranteeCase(poll(unit >> use(a)))(release(a, _))
    }
  }
```

**Key Safety Properties**:
1. **Acquire is uncancelable**: Uses `uncancelable` to prevent cancellation
2. **Release is uncancelable**: Wrapped in `guaranteeCase`
3. **Use is cancelable**: Inside `poll` of `guaranteeCase`
4. **Lazy evaluation**: `unit >> use(a)` ensures exceptions are caught in effect runtime

### 6.5 Async State Machine Pattern

**From IOFiber.scala lines 604-883**:

The `IOCont` implementation demonstrates a sophisticated async pattern:

1. **State object**: Tracks async state (`ContState`)
2. **Callback**: Races with `Get` to complete computation
3. **CAS loop**: State transitions are atomic
4. **Memory barriers**: `resume()` provides publication

**State Transitions**:
```
null (initial) → waiting (Get arrived) → result (callback arrived)
               ↓
            result (callback arrived first)
```

**Race Handling**:
- Callback tries to `resume()` to acquire runloop
- Get checks `shouldFinalize()` after acquiring
- Cancelation can interleave at any point

### 6.6 Finalizer Composition

**From Resource.scala lines 287-313** (both combinator):

```scala
type Finalizer = ExitCase => F[Unit]
type Update = (Finalizer => Finalizer) => F[Unit]

val noop: Finalizer = _ => F.unit
val bothFinalizers = F.ref((noop, noop))

Resource
  .makeCase(bothFinalizers) { (finalizers, ec) =>
    finalizers.get.flatMap {
      case (thisFin, thatFin) =>
        F.void(F.both(thisFin(ec), thatFin(ec)))
    }
  }
  .evalMap { store =>
    val thisStore: Update = f =>
      store.update(_.bimap(f, identity))
    val thatStore: Update = f =>
      store.update(_.bimap(identity, f))

    F.both(allocate(this, thisStore), allocate(that, thatStore))
  }
```

**Pattern**:
1. Store finalizers in `Ref[(Fin, Fin)]`
2. Each allocation updates its side of the tuple
3. On release, run both finalizers concurrently with `F.both`

### 6.7 Deferred and Ref Patterns

**Deferred** (from kernel/Deferred.scala):
- Pattern for async coordination
- `get`: Suspends until value is set
- `complete`: Idempotent completion
- Used for producer-consumer patterns

**Ref** (from kernel/Ref.scala):
- Pattern for mutable shared state
- Atomic operations (`modify`, `updateAndGet`)
- Used for state coordination

### 6.8 Fiber Leak Prevention

**From GenSpawn documentation (lines 100-141)**:

```
A function or effect is considered to be cancelation-safe if it can be
run in the absence of masking without violating effectful lifecycles or
leaking resources.

[start] and [racePair] are both considered to be cancelation-unsafe
effects because they return a Fiber, which is a resource that has a
lifecycle.

In the above example, imagine the spawning fiber is canceled after it
starts the printing fiber, but before the latter is canceled. In this
situation, the printing fiber is not canceled and will continue executing
forever, contending with other fibers for system resources.

For this reason, it is recommended not to use these methods; instead, use
[background] and [race] respectively.
```

**Safe Pattern** (background):
```scala
F.background(F.delay(println("A")).foreverM).use { _ =>
  F.sleep(10.seconds)
}
// Fiber is automatically canceled when Resource exits
```

---

## 7. Terminology and Definitions

### 7.1 Core Concepts

| Term | Definition |
|------|------------|
| **Fiber** | A lightweight thread of execution that can be canceled. Represents a sequence of effects bound by flatMap. |
| **Outcome** | The result of fiber execution: `Succeeded(fa)`, `Errored(e)`, or `Canceled()` |
| **Masking** | Suppressing cancellation within a region. Implemented via `uncancelable`. |
| **Polling** | Selectively allowing cancellation within a masked region. |
| **Finalizer** | An action guaranteed to run on cancellation (or error/completion). |
| **Bracket** | Pattern for safe resource management: acquire → use → release |
| **Cancellation Boundary** | A point where cancellation status is checked (each runloop iteration). |
| **Async Boundary** | A point where execution continues on a different thread (after suspension). |
| **Fairness** | Ensuring all fibers get CPU time (via `cede` or auto-yielding). |

### 7.2 Type Names

| Type | Purpose |
|------|---------|
| **IO[A]** | Pure description of a side effect that may produce A or fail with Throwable |
| **Resource[F, A]** | Pure description of resource allocation with cleanup |
| **Fiber[F, E, A]** | Handle to a running computation, allows cancel and join |
| **Outcome[F, E, A]** | Result of fiber execution (Succeeded/Errored/Canceled) |
| **IORuntime** | Execution context for IO (compute pool, blocking pool, scheduler) |
| **MonadCancel[F, E]** | Capability for cancelation and masking |
| **GenSpawn[F, E]** | Capability for spawning fibers and racing |
| **GenConcurrent[F, E]** | Capability for shared state (Ref, Deferred) |
| **Async[F]** | Capability for asynchronous operations |
| **Poll[F]** | Natural transformation that unmasks within a masked region |
| **ExitCase** | Reason for resource release (Succeeded/Errored/Canceled) |

### 7.3 IO Node Types

| Node | Tag | Purpose |
|------|-----|---------|
| **Pure** | 0 | Lifted pure value |
| **Error** | 1 | Wrapped exception |
| **Delay** | 2 | Suspended synchronous computation |
| **RealTime** | 3 | Wall-clock time |
| **Monotonic** | 4 | Monotonic clock |
| **ReadEC** | 5 | Read current ExecutionContext |
| **Map** | 6 | Function application |
| **FlatMap** | 7 | Monadic bind |
| **Attempt** | 8 | Materialize error into Either |
| **HandleErrorWith** | 9 | Error recovery |
| **Canceled** | 10 | Self-cancelation signal |
| **OnCancel** | 11 | Register finalizer |
| **Uncancelable** | 12 | Masking region |
| **UnmaskRunLoop** | 13 | Internal unmasking |
| **IOCont** | 14 | Low-level async continuation |
| **Cont.Get** | 15 | Async state access |
| **Cede** | 16 | Yield to scheduler |
| **Start** | 17 | Spawn fiber |
| **RacePair** | 18 | Race two fibers |
| **Sleep** | 19 | Asynchronous delay |
| **EvalOn** | 20 | Shift execution context |
| **Blocking** | 21 | Run blocking operation |
| **Local** | 22 | IOLocal manipulation |
| **IOTrace** | 23 | Get stack trace |
| **ReadRT** | 24 | Read IORuntime |
| **EndFiber** | -1 | Terminal state |

### 7.4 Resource Node Types

| Node | Purpose |
|------|---------|
| **Allocate** | Acquire resource with finalizer |
| **Bind** | Sequence resources (flatMap) |
| **Pure** | Lifted pure value |
| **Eval** | Lifted effect |

### 7.5 Continuation Tags

Used in IOFiber's `conts` stack:

| Tag | Purpose |
|-----|---------|
| **MapK** | Map continuation |
| **FlatMapK** | FlatMap continuation |
| **AttemptK** | Attempt continuation |
| **HandleErrorWithK** | Error handling continuation |
| **OnCancelK** | Finalizer cleanup |
| **UncancelableK** | Uncancelable cleanup |
| **UnmaskK** | Unmask cleanup |
| **EvalOnK** | ExecutionContext restoration |

---

## 8. Performance Optimizations

### 8.1 Tag-Based Dispatch

**From IO.scala and IOFiber.scala**:

```scala
(cur0.tag: @switch) match {
  case 0 => // ...
  case 1 => // ...
  // ...
}
```

- Generates `tableswitch` bytecode (O(1) dispatch)
- Avoids boxing/unboxing of pattern matching
- Hot path optimization by JVM JIT

### 8.2 Stack Allocation

**ArrayStack** (from `/core/jvm-native/src/main/scala/cats/effect/ArrayStack.scala`):

```scala
private[effect] final class ArrayStack[A <: AnyRef](
    private[this] var buffer: Array[AnyRef],
    private[this] var index: Int) {

  def push(a: A): Unit = {
    checkAndGrow()
    buffer(index) = a
    index += 1
  }

  def pop(): A = {
    index -= 1
    val back = buffer(index).asInstanceOf[A]
    buffer(index) = null  // Avoid memory leaks
    back
  }

  private[this] def checkAndGrow(): Unit =
    if (index >= buffer.length) {
      val targetLen = buffer.length * 2
      val resizeLen = if (len > VM_MaxArraySize / 2)
        VM_MaxArraySize
      else
        targetLen

      val buffer2 = new Array[AnyRef](resizeLen)
      System.arraycopy(buffer, 0, buffer2, 0, len)
      buffer = buffer2
    }
}
```

**Optimizations**:
- Resizable array (doubling strategy)
- Nulls popped entries to prevent memory leaks
- Stack-allocated (no indirection)
- Avoids boxing (stores `AnyRef` directly)

### 8.3 ByteStack

**From `/core/jvm-native/src/main/scala/cats/effect/ByteStack.scala`**:

```scala
private[effect] object ByteStack {
  final val MapK = 0
  final val FlatMapK = 1
  final val AttemptK = 2
  // ... more tags

  def create(sz: Int): ArrayStack.T = {
    val stack = new Array[Byte](sz)
    stack(0) = 0.toByte
    stack
  }

  def push(stack: ArrayStack.T, tag: Byte): ArrayStack.T = {
    val idx = stack(0)
    val len = stack.length
    if (idx + 1 >= len) {
      // Resize
      val newStack = new Array[Byte](len * 2)
      System.arraycopy(stack, 0, newStack, 0, len)
      // ... update index
    }
    stack(idx + 1) = tag
    stack(0) = (idx + 1).toByte
    stack
  }
}
```

**Key Features**:
- Packed byte array for continuation tags
- Index stored at position 0
- Resizable doubling strategy

### 8.4 Loop Fusion

**From IOFiber.scala lines 336-386** (Map case):

```scala
case 6 =>
  val cur = cur0.asInstanceOf[Map[Any, Any]]
  val ioe = cur.ioe
  val f = cur.f

  def next(v: Any): IO[Any] = {
    var error: Throwable = null
    val result =
      try f(v)
      catch {
        case t if UnsafeNonFatal(t) => error = t
        case t: Throwable => onFatalFailure(t)
      }

    if (error == null) succeeded(result, 0) else failed(error, 0)
  }

  (ioe.tag: @switch) match {
    case 0 => // Pure
      val pure = ioe.asInstanceOf[Pure[Any]]
      runLoop(next(pure.value), nextCancelation - 1, nextAutoCede)

    case 1 => // Error
      val error = ioe.asInstanceOf[Error]
      val ex = error.t
      if (!UnsafeNonFatal(ex))
        onFatalFailure(ex)
      runLoop(failed(ex, 0), nextCancelation - 1, nextAutoCede)

    case 2 => // Delay
      val delay = ioe.asInstanceOf[Delay[Any]]
      // Inlined: f(delay.thunk()) to avoid two try blocks
      var error: Throwable = null
      val result =
        try f(delay.thunk())
        catch {
          case t if UnsafeNonFatal(t) => error = t
          case t: Throwable => onFatalFailure(t)
        }

      val nextIO = if (error == null) succeeded(result, 0) else failed(error, 0)
      runLoop(nextIO, nextCancelation - 1, nextAutoCede)

    // ... more cases
    case _ => // Fallback
      objectState.push(f)
      conts = ByteStack.push(conts, MapK)
      runLoop(ioe, nextCancelation, nextAutoCede)
  }
```

**Optimizations**:
- Special cases common patterns (`Map(Pure(x))`, `Map(Delay(...))`)
- Avoids pushing continuation when result is known immediately
- Inlines function application to reduce allocations

### 8.5 Auto-Yielding

**From IOFiber.scala lines 224-240**:

```scala
var nextAutoCede = autoCedeIterations
if (nextCancelation <= 0) {
  readBarrier()
  nextCancelation = runtime.cancelationCheckThreshold
  nextAutoCede -= nextCancelation

  if (nextAutoCede <= 0) {
    resumeTag = AutoCedeR
    resumeIO = _cur0
    val ec = currentCtx
    rescheduleFiber(ec, this)
    return
  }
}
```

**Purpose**:
- Prevents starvation in tight loops
- Configurable via `IORuntimeConfig.autoYieldThreshold`
- Default: yields every 512 * 2 iterations

---

## 9. Error Handling Patterns

### 9.1 Error Materialization

**attempt** pattern:
```scala
def attempt: IO[Either[Throwable, A]] =
  IO.Attempt(this)
```

Materializes errors into value space for handling.

### 9.2 Error Recovery

**handleErrorWith** pattern:
```scala
def handleErrorWith[B >: A](f: Throwable => IO[B]): IO[B] =
  IO.HandleErrorWith(this, f, Tracing.calculateTracingEvent(f))
```

Recovers from errors by providing alternative computation.

### 9.3 Redeem Pattern

```scala
def redeem[B](recover: Throwable => B, map: A => B): IO[B] =
  attempt.map(_.fold(recover, map))

def redeemWith[B](recover: Throwable => IO[B], bind: A => IO[B]): IO[B] =
  attempt.flatMap(_.fold(recover, bind))
```

More efficient than `attempt` + `map`/`flatMap` combination.

### 9.4 Error Augmentation

**From IOFiber.scala lines 472-474**:

```scala
// We need to augment the exception here because it doesn't get
// forwarded to the `failed` path.
Tracing.augmentThrowable(runtime.enhancedExceptions, t, tracingEvents)
```

Attaches stack traces to exceptions for debugging.

---

## 10. Resource Management Patterns

### 10.1 Bracket Pattern Hierarchy

```scala
bracket(acquire)(use)(release)
  ↓
bracketCase(acquire)(use)((a, ec) => release(a))
  ↓
bracketFull(poll => acquire(poll))(use)((a, oc) => release(a, oc))
```

Each level provides more control:
- `bracket`: Simple release
- `bracketCase`: Know exit case
- `bracketFull`: Interruptible acquire

### 10.2 Resource Composition

**Sequential composition** (flatMap):
```scala
for {
  db <- Database.connect(config)
  transactor <- Database.transactor(db)
} yield transactor
// Released in reverse: transactor, then db
```

**Parallel composition** (both):
```scala
val resources = (
  Resource.make(connectDB)(closeDB),
  Resource.make(connectCache)(closeCache)
).parMapN((db, cache) => Service(db, cache))
// Both acquired concurrently, both released concurrently
```

### 10.3 Resource.eval Pattern

```scala
Resource.eval(IO.println("Acquiring..."))
```

Lifts an effect with no-op release. Preserves interruptibility.

### 10.4 Resource.allocated Pattern

**Advanced/Unsafe API** (lines 449-451):

```scala
/**
 * Returns the acquired resource and a cleanup function.
 * UNSAFE: If the returned cleanup is never called, resources leak.
 */
def allocated[B >: A](implicit F: MonadCancel[F, Throwable]): F[(B, F[Unit])]
```

Use cases:
- Interfacing with test frameworks (before/after)
- Complex library code
- Manual resource lifecycle management

---

## 11. Concurrent Programming Patterns

### 11.1 Fiber Spawning

**Unsafe: start** (can leak):
```scala
fa.start.flatMap { fiber =>
  // If canceled here, fiber continues running!
  fiber.join
}
```

**Safe: background** (Resource):
```scala
fa.background.use { joinF =>
  // If canceled here, fiber is automatically canceled
  joinF
}
```

### 11.2 Racing

**race**: First wins, loser canceled
```scala
IO.race(task1, task2)
// Returns Either[Result1, Result2]
// Loser is automatically canceled
```

**racePair**: First wins, get loser fiber
```scala
IO.racePair(task1, task2).flatMap {
  case Left((result1, fiber2)) =>
    // Can decide to cancel fiber2 or let it run
    fiber2.cancel.as(result1)
  case Right((fiber1, result2)) =>
    // Can decide to cancel fiber1 or let it run
    fiber1.cancel.as(result2)
}
```

### 11.3 Concurrent Execution

**both**: Both succeed or both fail
```scala
IO.both(task1, task2)
// Returns (Result1, Result2)
// If either fails, the other is canceled
```

**bothOutcome**: Both outcomes produced
```scala
IO.bothOutcome(task1, task2)
// Returns (Outcome1, Outcome2)
// Both complete regardless of success/failure
```

### 11.4 Memoization

**Memoizing concurrent evaluation**:
```scala
fa.memoize
// Returns IO[IO[A]]
// Inner IO can be evaluated multiple times, but fa only runs once
```

### 11.5 Deferred Pattern

**Producer-consumer**:
```scala
for {
  d <- Deferred[IO, Int]
  producerFiber <- d.complete(42).start
  result <- d.get
} yield result
```

**Async handoff**: `Deferred` allows fibers to coordinate without blocking.

### 11.6 Ref Pattern

**Atomic state updates**:
```scala
for {
  ref <- Ref[IO].of(0)
  _ <- ref.update(_ + 1)  // Atomic increment
  value <- ref.get
} yield value
```

**State transactions**:
```scala
ref.modify { state =>
  val (result, newState) = transform(state)
  (newState, result)
}
```

---

## 12. Summary of Key Insights

### 12.1 Architectural Decisions

1. **Tag-based ADT**: Optimized for performance with byte tags
2. **Manual continuation stack**: Avoids stack overflow with constant memory
3. **Memory barrier exploitation**: Minimal volatile usage
4. **Work-stealing runtime**: Efficient thread pool utilization
5. **Resource-first design**: Bracket pattern fundamental to safety

### 12.2 Safety Guarantees

1. **Bracket safety**: Resources always released via `uncancelable` acquire
2. **Cancellation safety**: Finalizers guaranteed via `onCancel` + masking
3. **Fiber leak prevention**: `background` preferred over `start`
4. **Async safety**: `IOCont` state machine ensures callback correctness

### 12.3 Performance Techniques

1. **Loop fusion**: Special-case common patterns
2. **Auto-yielding**: Prevents starvation
3. **Stack allocation**: ArrayStack/ByteStack avoid boxing
4. **Lazy evaluation**: No computation until `unsafeRun*`
5. **Tracing opt-out**: Zero-cost when disabled

### 12.4 Design Patterns

1. **Continuation-Passing Style**: Async operations via `IOCont`
2. **Interpreter Pattern**: Resource fold interprets ADT
3. **State Machine**: Cancellation and async use state objects
4. **Bracket Pattern**: Safe resource management
5. **Fiber Model**: Lightweight concurrent processes

---

## 13. Comparison with ZIO

Based on previous ZIO analysis:

| Aspect | Cats Effect 3 | ZIO |
|--------|---------------|-----|
| **Core ADT** | Tag-based (Byte) | Tag-based (Int) |
| **Runloop** | Manual stack, tag-switch | Manual stack, tag-switch |
| **Cancellation** | Masking with `masks` counter | Interruption with `interruptible` flag |
| **Resources** | Separate Resource ADT | ZManaged integrated in ZIO |
| **Runtime** | IORuntime (compute + blocking pools) | Runtime (platform-specific) |
| **Error type** | Fixed `Throwable` | Polymorphic `E` |
| **Concurrency** | GenSpawn type class | Intrinsic to ZIO |
| **Async** | IOCont state machine | Async state machine |

---

## 14. References and File Locations

### Core Files

- **IO**: `/core/shared/src/main/scala/cats/effect/IO.scala`
- **IOFiber**: `/core/shared/src/main/scala/cats/effect/IOFiber.scala`
- **Resource**: `/kernel/shared/src/main/scala/cats/effect/kernel/Resource.scala`
- **IORuntime**: `/core/shared/src/main/scala/cats/effect/unsafe/IORuntime.scala`
- **MonadCancel**: `/kernel/shared/src/main/scala/cats/effect/kernel/MonadCancel.scala`
- **GenSpawn**: `/kernel/shared/src/main/scala/cats/effect/kernel/GenSpawn.scala`
- **Outcome**: `/kernel/shared/src/main/scala/cats/effect/kernel/Outcome.scala`
- **Fiber**: `/kernel/shared/src/main/scala/cats/effect/kernel/Fiber.scala`

### Data Structures

- **ArrayStack**: `/core/jvm-native/src/main/scala/cats/effect/ArrayStack.scala`
- **ByteStack**: `/core/jvm-native/src/main/scala/cats/effect/ByteStack.scala`
- **CallbackStack**: `/core/jvm-native/src/main/scala/cats/effect/CallbackStack.scala`
- **ContState**: `/core/shared/src/main/scala/cats/effect/ContState.scala`

### Platform-Specific

- **IOPlatform**: `/core/shared/src/main/scala/cats/effect/IOPlatform.scala`
- **IOFiberPlatform**: Platform-specific fiber implementations
- **IORuntimeCompanionPlatform**: Platform-specific runtime creation

---

**Document Version**: 1.0
**Date**: 2025-01-25
**Analyzed Commit**: Current main branch of cats-effect/cats-effect
