import Link from "next/link"
import { notFound } from "next/navigation"
import { Footer } from "../../components/ui/Footer"
import { Header } from "../../components/ui/Header"
import type { SandboxConfig } from "../../components/ui/InteractiveTerminal"
import { OverviewPageClientWrapper } from "../../components/ui/OverviewPageClientWrapper"
import { ProgressCard } from "../../components/ui/ProgressCard"
import { ShrinkingLayout } from "../../components/ui/ShrinkingLayout"
import { getEntry, isPairing, isValidEntrySlug } from "../../content/pairings"
import { getServerProgressForPairAsync } from "../../core/progress-server"
import { loadToolConfig } from "../../lib/content-core"
import { resolveSandboxConfig } from "../../lib/content/types"
import type { StepMeta } from "../../services/content"

/**
 * Generate static params for all published tool pairings and tutorials.
 *
 * This enables Next.js to statically generate overview pages at build time
 * for all published tool comparisons and single-tool tutorials, improving performance and SEO.
 */
export function generateStaticParams() {
  return [
    { toolPair: "jj-git" },
    { toolPair: "zio-cats" },
    { toolPair: "effect-zio" },
    { toolPair: "tmux" },
  ]
}

/**
 * Generate metadata for the overview page.
 *
 * @param props - Props containing the dynamic route params.
 * @returns Metadata object for SEO.
 */
export async function generateMetadata(props: {
  readonly params: Promise<{ readonly toolPair: string }>
}) {
  const params = await props.params
  const entry = getEntry(params.toolPair)

  if (!entry) {
    return {}
  }

  if (isPairing(entry)) {
    return {
      title: `${entry.to.name} ← ${entry.from.name}`,
      description: `Learn ${entry.to.name} if you already know ${entry.from.name}. ${entry.estimatedTime} tutorial.`,
    }
  }

  // Tutorial mode (SingleToolEntry)
  return {
    title: entry.tool.name,
    description: `Learn ${entry.tool.name}. ${entry.estimatedTime} tutorial.`,
  }
}

/**
 * Comparison overview page (or tutorial overview page for single-tool tutorials).
 *
 * Shows:
 * - "Why {tool}?" introduction section (or "Learn {tool.name}" for tutorials)
 * - Key differences callout box
 * - StepList with all steps grouped by section (with progress from localStorage)
 * - Progress summary sidebar (desktop) / section (mobile) (with continue button)
 * - Link to glossary (or "Cheat Sheet" for tutorials)
 *
 * Progress features:
 * - Current step highlighted in StepList
 * - Completed steps show with checkmark
 * - "Continue Step N →" button if progress exists
 * - "Start Learning →" button if no progress
 * - "Reset Progress" button to clear progress
 * - Time remaining estimate
 *
 * @param props - Props containing the dynamic route params.
 */
export default async function ComparisonOverviewPage(props: {
  readonly params: Promise<{ readonly toolPair: string }>
}) {
  const params = await props.params
  const { toolPair } = params

  // Validate the tool entry slug
  if (!isValidEntrySlug(toolPair)) {
    notFound()
  }

  const entry = getEntry(toolPair)
  if (!entry) {
    notFound()
  }

  // Load tool-pair config and resolve sandbox configuration
  const toolConfigResult = await loadToolConfig(toolPair, "content").pipe(
    (await import("effect")).Effect.either,
    (await import("effect")).Effect.runPromise,
  )

  const toolConfig =
    toolConfigResult._tag === "Right"
      ? toolConfigResult.right
      : ({
          sandbox: { enabled: true, environment: "bash" as const, timeout: 60, init: [] as const },
        } as const)

  const sandboxConfig: SandboxConfig = resolveSandboxConfig(
    undefined, // Overview page has no step-specific sandbox config
    toolConfig,
  )

  // Read progress from cookie for flicker-free SSR
  const serverProgress = await getServerProgressForPairAsync(toolPair)
  const initialProgress = serverProgress
    ? {
        completedSteps: serverProgress.completedSteps,
        currentStep: serverProgress.currentStep,
      }
    : undefined

  // Default steps for jj-git (also used as fallback)
  const jjGitSteps: readonly StepMeta[] = [
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
  ]

  // Steps for zio-cats
  const catsZioSteps: readonly StepMeta[] = [
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
  ]

  // Steps for effect-zio
  const effectZioSteps: readonly StepMeta[] = [
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
  ]

  // Steps for tmux tutorial
  const tmuxSteps: readonly StepMeta[] = [
    { step: 1, title: "What is tmux?", description: "Install, first session, basic orientation", slug: "01-step" },
    { step: 2, title: "Sessions", description: "New, list, attach, detach, kill", slug: "02-step" },
    { step: 3, title: "Windows", description: "Create, navigate, rename, close, list", slug: "03-step" },
    { step: 4, title: "Panes", description: "Split vertical/horizontal, cycle, zoom, resize", slug: "04-step" },
    { step: 5, title: "Key Bindings", description: "Prefix key, list bindings, command mode", slug: "05-step" },
    { step: 6, title: "Copy Mode", description: "Enter, vi/emacs nav, search, select/yank, paste", slug: "06-step" },
    { step: 7, title: "Configuration", description: ".tmux.conf, prefix rebinding, options, status bar", slug: "07-step" },
    {
      step: 8,
      title: "Session Management & Scripting",
      description: "Multiple sessions, switch, send-keys, scripting",
      slug: "08-step",
    },
  ]

  // Select steps based on tool pair
  const steps =
    toolPair === "zio-cats"
      ? catsZioSteps
      : toolPair === "effect-zio"
        ? effectZioSteps
        : toolPair === "tmux"
          ? tmuxSteps
          : jjGitSteps

  // Default estimated times for jj-git
  const jjGitTimes = new Map<number, string>([
    [1, "~2 min"],
    [2, "~3 min"],
    [3, "~3 min"],
    [4, "~2 min"],
    [5, "~3 min"],
    [6, "~4 min"],
    [7, "~3 min"],
    [8, "~4 min"],
    [9, "~4 min"],
    [10, "~3 min"],
    [11, "~3 min"],
    [12, "~5 min"],
  ])

  // Estimated times for zio-cats
  const catsZioTimes = new Map<number, string>([
    [1, "~4 min"],
    [2, "~5 min"],
    [3, "~5 min"],
    [4, "~3 min"],
    [5, "~6 min"],
    [6, "~5 min"],
    [7, "~5 min"],
    [8, "~6 min"],
    [9, "~4 min"],
    [10, "~4 min"],
    [11, "~5 min"],
    [12, "~6 min"],
    [13, "~5 min"],
    [14, "~6 min"],
    [15, "~6 min"],
  ])

  // Estimated times for effect-zio
  const effectZioTimes = new Map<number, string>([
    [1, "~5 min"],
    [2, "~5 min"],
    [3, "~5 min"],
    [4, "~4 min"],
    [5, "~6 min"],
    [6, "~5 min"],
    [7, "~5 min"],
    [8, "~6 min"],
    [9, "~5 min"],
    [10, "~5 min"],
    [11, "~6 min"],
    [12, "~6 min"],
    [13, "~6 min"],
    [14, "~6 min"],
    [15, "~6 min"],
  ])

  // Estimated times for tmux
  const tmuxTimes = new Map<number, string>([
    [1, "~3 min"],
    [2, "~4 min"],
    [3, "~4 min"],
    [4, "~5 min"],
    [5, "~3 min"],
    [6, "~5 min"],
    [7, "~4 min"],
    [8, "~5 min"],
  ])

  // Select estimated times based on tool pair
  const estimatedTimes =
    toolPair === "zio-cats"
      ? catsZioTimes
      : toolPair === "effect-zio"
        ? effectZioTimes
        : toolPair === "tmux"
          ? tmuxTimes
          : jjGitTimes

  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      <Header />

      <ShrinkingLayout>
        <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          {/* Breadcrumb / Back link and Quick Links */}
          <div className="mb-8 flex items-center justify-between">
            <Link
              href="/"
              className="inline-flex items-center text-sm text-[#d1d5dc] hover:text-white focus-visible:outline-none focus-visible:ring-[var(--focus-ring)] transition-colors duration-[var(--transition-fast)]"
            >
              ← Home
            </Link>
            <Link
              href={`/${toolPair}/glossary`}
              className="inline-flex items-center text-sm font-mono text-[var(--color-accent)] hover:text-[var(--color-accent-hover)] focus-visible:outline-none focus-visible:ring-[var(--focus-ring)] transition-colors duration-[var(--transition-fast)]"
            >
              [{isPairing(entry) ? "Glossary" : "Cheat Sheet"} →]
            </Link>
          </div>

          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold font-mono text-white sm:text-4xl">
              {isPairing(entry) ? (
                <>
                  {entry.to.name} ← {entry.from.name}
                </>
              ) : (
                <>Learn {entry.tool.name}</>
              )}
            </h1>
            {(isPairing(entry) ? entry.toUrl : entry.toolUrl) && (
              <a
                href={isPairing(entry) ? entry.toUrl! : entry.toolUrl!}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block mt-2 text-sm text-[var(--color-accent)] hover:text-[var(--color-accent-hover)] focus-visible:outline-none focus-visible:ring-[var(--focus-ring)] transition-colors duration-[var(--transition-fast)]"
              >
                [{isPairing(entry) ? entry.to.name : entry.tool.name} documentation →]
              </a>
            )}
          </div>

          {/* Main content with progress sidebar */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left column: Introduction */}
            <div className="lg:col-span-2">
              {/* Why {tool}? Section */}
              <section>
                <h2 className="mb-4 text-2xl font-bold font-mono text-white">
                  Why {isPairing(entry) ? entry.to.name : entry.tool.name}?
                </h2>
                <div className="prose prose-invert max-w-none">
                  {toolPair === "tmux" ? (
                    <>
                      <p className="text-base text-[#d1d5dc] leading-relaxed mb-4">
                        tmux is a terminal multiplexer that lets you create and control multiple terminal
                        sessions from a single screen. Perfect for remote workflows, long-running
                        processes, and organizing your development environment.
                      </p>
                      <ul className="space-y-2 text-sm text-[#d1d5dc]">
                        <li className="flex items-start gap-2">
                          <span className="text-[var(--color-accent)] mt-0.5">•</span>
                          <span>Terminal multiplexing — split windows into panes for side-by-side workflows</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-[var(--color-accent)] mt-0.5">•</span>
                          <span>Session persistence — detach and reattach without losing running processes</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-[var(--color-accent)] mt-0.5">•</span>
                          <span>Remote workflows — maintain sessions over SSH connections</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-[var(--color-accent)] mt-0.5">•</span>
                          <span>Pane and window management — organize workspaces with customizable layouts</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-[var(--color-accent)] mt-0.5">•</span>
                          <span>Scriptability — automate session setup and configuration with .tmux.conf</span>
                        </li>
                      </ul>
                    </>
                  ) : toolPair === "zio-cats" ? (
                    <>
                      <p className="text-base text-[#d1d5dc] leading-relaxed mb-4">
                        ZIO 2 is a powerful effect system with built-in dependency injection and
                        typed errors. If you know Cats Effect, you&apos;ll find the core concepts
                        familiar but with a different API philosophy.
                      </p>
                      <ul className="space-y-2 text-sm text-[#d1d5dc]">
                        <li className="flex items-start gap-2">
                          <span className="text-[var(--color-accent)] mt-0.5">•</span>
                          <span>R/E/A type signature with environment parameter</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-[var(--color-accent)] mt-0.5">•</span>
                          <span>ZLayer for type-safe dependency injection</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-[var(--color-accent)] mt-0.5">•</span>
                          <span>Typed error channel with error accumulation</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-[var(--color-accent)] mt-0.5">•</span>
                          <span>ZStream for high-performance streaming</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-[var(--color-accent)] mt-0.5">•</span>
                          <span>Interop libraries available for gradual migration</span>
                        </li>
                      </ul>
                    </>
                  ) : toolPair === "effect-zio" ? (
                    <>
                      <p className="text-base text-[#d1d5dc] leading-relaxed mb-4">
                        Effect is a modern functional effect system with TypeScript-first design and
                        cross-platform support. If you know ZIO, you&apos;ll find the concepts
                        familiar but with cleaner syntax and better type inference.
                      </p>
                      <ul className="space-y-2 text-sm text-[#d1d5dc]">
                        <li className="flex items-start gap-2">
                          <span className="text-[var(--color-accent)] mt-0.5">•</span>
                          <span>Effect&lt;A, E, R&gt; type order (result before requirements)</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-[var(--color-accent)] mt-0.5">•</span>
                          <span>
                            Effect.gen for clean composition (no for-comprehension nesting)
                          </span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-[var(--color-accent)] mt-0.5">•</span>
                          <span>Context.Tag for type-safe dependency injection</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-[var(--color-accent)] mt-0.5">•</span>
                          <span>Built-in Schema for validation and encoding</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-[var(--color-accent)] mt-0.5">•</span>
                          <span>Cross-platform (Node, Browser, Deno, Bun)</span>
                        </li>
                      </ul>
                    </>
                  ) : (
                    // Default case: jj-git (pairings)
                    isPairing(entry) && (
                      <>
                        <p className="text-base text-[#d1d5dc] leading-relaxed mb-4">
                          {entry.to.name} ({entry.to.description}) rethinks version control from first
                          principles. Built for developers who want a safer, more intuitive workflow.
                        </p>
                        <ul className="space-y-2 text-sm text-[#d1d5dc]">
                          <li className="flex items-start gap-2">
                            <span className="text-[var(--color-accent)] mt-0.5">•</span>
                            <span>Working copy IS a commit (no staging area complexity)</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="text-[var(--color-accent)] mt-0.5">•</span>
                            <span>Change IDs survive rebases (stable identifiers)</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="text-[var(--color-accent)] mt-0.5">•</span>
                            <span>Conflicts are first-class (stored in commits, not blocking)</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="text-[var(--color-accent)] mt-0.5">•</span>
                            <span>Automatic descendant rebasing (no more --update-refs)</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="text-[var(--color-accent)] mt-0.5">•</span>
                            <span>
                              Compatible with existing {entry.from.name} repos (use both tools together)
                            </span>
                          </li>
                        </ul>
                      </>
                    )
                  )}
                </div>
              </section>
            </div>

            {/* Right column: Progress card */}
            <aside className="lg:col-span-1">
              <ProgressCard toolPair={toolPair} totalSteps={entry.steps} initialProgress={initialProgress} />
            </aside>

            {/* Full width: Steps list */}
            <OverviewPageClientWrapper
              toolPair={toolPair}
              totalSteps={entry.steps}
              steps={steps}
              estimatedTimes={estimatedTimes}
              initialProgress={initialProgress}
              sandboxConfig={sandboxConfig}
            />
          </div>
        </main>

        <Footer />
      </ShrinkingLayout>
    </div>
  )
}
