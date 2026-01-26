import Link from "next/link"
import { notFound } from "next/navigation"
import { Footer } from "../../components/ui/Footer"
import { Header } from "../../components/ui/Header"
import { OverviewPageClientWrapper } from "../../components/ui/OverviewPageClientWrapper"
import { ProgressCard } from "../../components/ui/ProgressCard"
import { getPairing, isValidPairingSlug } from "../../content/pairings"
import { getServerProgressForPairAsync } from "../../core/progress-server"
import type { StepMeta } from "../../services/content"

/**
 * Generate static params for all published tool pairings.
 *
 * This enables Next.js to statically generate overview pages at build time
 * for all published tool comparisons, improving performance and SEO.
 */
export function generateStaticParams() {
  const pairings = [{ slug: "jj-git" }, { slug: "cats-zio" }]
  return pairings.map((pairing) => ({ toolPair: pairing.slug }))
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
  const pairing = getPairing(params.toolPair)

  if (!pairing) {
    return {}
  }

  return {
    title: `${pairing.to.name} ← ${pairing.from.name}`,
    description: `Learn ${pairing.to.name} if you already know ${pairing.from.name}. ${pairing.estimatedTime} tutorial.`,
  }
}

/**
 * Comparison overview page.
 *
 * Shows:
 * - "Why {tool}?" introduction section
 * - Key differences callout box
 * - StepList with all steps grouped by section (with progress from localStorage)
 * - Progress summary sidebar (desktop) / section (mobile) (with continue button)
 * - Link to glossary
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

  // Validate the tool pair slug
  if (!isValidPairingSlug(toolPair)) {
    notFound()
  }

  const pairing = getPairing(toolPair)
  if (!pairing) {
    notFound()
  }

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

  // Steps for cats-zio
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

  // Select steps based on tool pair
  const steps = toolPair === "cats-zio" ? catsZioSteps : jjGitSteps

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

  // Estimated times for cats-zio
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

  // Select estimated times based on tool pair
  const estimatedTimes = toolPair === "cats-zio" ? catsZioTimes : jjGitTimes

  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      <Header />

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
            [Glossary →]
          </Link>
        </div>

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold font-mono text-white sm:text-4xl">
            {pairing.to.name} ← {pairing.from.name}
          </h1>
          {pairing.toUrl && (
            <a
              href={pairing.toUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block mt-2 text-sm text-[var(--color-accent)] hover:text-[var(--color-accent-hover)] focus-visible:outline-none focus-visible:ring-[var(--focus-ring)] transition-colors duration-[var(--transition-fast)]"
            >
              [{pairing.to.name} documentation →]
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
                Why {pairing.to.name}?
              </h2>
              <div className="prose prose-invert max-w-none">
                {toolPair === "cats-zio" ? (
                  <>
                    <p className="text-base text-[#d1d5dc] leading-relaxed mb-4">
                      ZIO 2 is a powerful effect system with built-in dependency injection and typed
                      errors. If you know Cats Effect, you&apos;ll find the core concepts familiar
                      but with a different API philosophy.
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
                ) : (
                  <>
                    <p className="text-base text-[#d1d5dc] leading-relaxed mb-4">
                      {pairing.to.name} ({pairing.to.description}) rethinks version control from
                      first principles. Built for developers who want a safer, more intuitive
                      workflow.
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
                          Compatible with existing {pairing.from.name} repos (use both tools
                          together)
                        </span>
                      </li>
                    </ul>
                  </>
                )}
              </div>
            </section>
          </div>

          {/* Right column: Progress card */}
          <aside className="lg:col-span-1">
            <ProgressCard
              toolPair={toolPair}
              totalSteps={pairing.steps}
              initialProgress={initialProgress}
            />
          </aside>

          {/* Full width: Steps list */}
          <OverviewPageClientWrapper
            toolPair={toolPair}
            totalSteps={pairing.steps}
            steps={steps}
            estimatedTimes={estimatedTimes}
            initialProgress={initialProgress}
          />
        </div>
      </main>

      <Footer />
    </div>
  )
}
