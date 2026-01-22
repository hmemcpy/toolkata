import { Header } from "../../components/ui/Header"
import { Footer } from "../../components/ui/Footer"
import { StepList } from "../../components/ui/StepList"
import { ProgressBar } from "../../components/ui/ProgressBar"
import { getPairing, isValidPairingSlug } from "../../content/pairings"
import type { StepMeta } from "../../services/content"
import { notFound } from "next/navigation"
import Link from "next/link"

/**
 * Generate static params for all published tool pairings.
 *
 * This enables Next.js to statically generate overview pages at build time
 * for all published tool comparisons, improving performance and SEO.
 */
export function generateStaticParams() {
  const pairings = [{ slug: "jj-git" }]
  return pairings.map((pairing) => ({ toolPair: pairing.slug }))
}

/**
 * Generate metadata for the overview page.
 *
 * @param props - Props containing the dynamic route params.
 * @returns Metadata object for SEO.
 */
export async function generateMetadata(props: { readonly params: Promise<{ readonly toolPair: string }> }) {
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
 * - StepList with all steps grouped by section
 * - Progress summary sidebar (desktop) / section (mobile)
 * - Link to cheat sheet
 * - "Continue Step N →" button if has progress
 *
 * @param props - Props containing the dynamic route params.
 */
export default async function ComparisonOverviewPage(
  props: { readonly params: Promise<{ readonly toolPair: string }> },
) {
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

  // TODO: Load steps from ContentService when MDX content exists
  // For now, use static metadata based on the plan
  const steps: readonly StepMeta[] = [
    { step: 1, title: "Installation & Setup", description: "Installing jj, colocated repos", slug: "01-step" },
    { step: 2, title: "Mental Model", description: "Working copy as commit, no staging", slug: "02-step" },
    { step: 3, title: "Creating Commits", description: "jj describe, jj new", slug: "03-step" },
    { step: 4, title: "Viewing History", description: "jj log, revsets basics", slug: "04-step" },
    { step: 5, title: "Navigating Commits", description: "jj edit, jj new <parent>", slug: "05-step" },
    { step: 6, title: "Amending & Squashing", description: "jj squash, jj split", slug: "06-step" },
    { step: 7, title: "Bookmarks", description: "Bookmarks replace branches", slug: "07-step" },
    { step: 8, title: "Handling Conflicts", description: "First-class conflicts", slug: "08-step" },
    { step: 9, title: "Rebasing", description: "Automatic descendant rebasing", slug: "09-step" },
    { step: 10, title: "Undo & Recovery", description: "jj undo, jj op log", slug: "10-step" },
    { step: 11, title: "Working with Remotes", description: "jj git push/fetch", slug: "11-step" },
    { step: 12, title: "Revsets", description: "Advanced commit selection", slug: "12-step" },
  ] as const

  // Estimated time per step (for display)
  const estimatedTimes = new Map<number, string>([
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

  // TODO: Load progress from localStorage via client component
  // For now, these are placeholder values
  const currentStep = 1
  const completedSteps = new Set<number>()

  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      <Header />

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Breadcrumb / Back link */}
        <div className="mb-8">
          <Link
            href="/"
            className="inline-flex items-center text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text)] focus-visible:outline-none focus-visible:ring-[var(--focus-ring)] transition-colors duration-[var(--transition-fast)]"
          >
            ← All comparisons
          </Link>
        </div>

        {/* Header */}
        <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold font-mono text-[var(--color-text)] sm:text-4xl">
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
          <Link
            href={`/${toolPair}/cheatsheet`}
            className="inline-flex items-center px-4 py-2 text-sm font-mono text-[var(--color-text)] bg-[var(--color-surface)] border border-[var(--color-border)] rounded-md hover:bg-[var(--color-surface-hover)] focus-visible:outline-none focus-visible:ring-[var(--focus-ring)] transition-all duration-[var(--transition-fast)]"
          >
            [Cheat Sheet]
          </Link>
        </div>

        {/* Main content with progress sidebar */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left column: Introduction + Steps */}
          <div className="lg:col-span-2 space-y-12">
            {/* Why {tool}? Section */}
            <section>
              <h2 className="mb-4 text-2xl font-bold font-mono text-[var(--color-text)]">
                Why {pairing.to.name}?
              </h2>
              <div className="prose prose-invert max-w-none">
                <p className="text-base text-[var(--color-text-muted)] leading-relaxed mb-4">
                  {pairing.to.name} ({pairing.to.description}) rethinks version control from first
                  principles. Built for developers who want a safer, more intuitive workflow.
                </p>
                <ul className="space-y-2 text-sm text-[var(--color-text-muted)]">
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
                      Compatible with existing {pairing.from.name} repos (use both tools together)
                    </span>
                  </li>
                </ul>
              </div>
            </section>

            {/* Steps List */}
            <section>
              <StepList
                toolPair={toolPair}
                steps={steps}
                currentStep={currentStep}
                completedSteps={completedSteps}
                estimatedTimes={estimatedTimes}
              />
            </section>
          </div>

          {/* Right column: Progress summary */}
          <aside className="lg:col-span-1">
            <div className="sticky top-8 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
              <h3 className="mb-4 text-sm font-mono font-medium text-[var(--color-text-muted)] uppercase tracking-wide">
                Your Progress
              </h3>

              <div className="mb-6">
                <ProgressBar current={completedSteps.size} total={pairing.steps} />
              </div>

              {/* Time remaining estimate */}
              {completedSteps.size > 0 && completedSteps.size < pairing.steps && (
                <div className="mb-6 text-sm text-[var(--color-text-muted)]">
                  {(() => {
                    const remainingSteps = pairing.steps - completedSteps.size
                    const avgTimePerStep = 3 // minutes
                    const remainingMins = remainingSteps * avgTimePerStep
                    return `~${remainingMins} min remaining`
                  })()}
                </div>
              )}

              {/* Continue button or Start button */}
              {completedSteps.size > 0 ? (
                <Link
                  href={`/${toolPair}/${currentStep}`}
                  className="block w-full text-center px-4 py-3 text-sm font-mono text-[var(--color-bg)] bg-[var(--color-accent)] rounded-md hover:bg-[var(--color-accent-hover)] focus-visible:outline-none focus-visible:ring-[var(--focus-ring)] transition-all duration-[var(--transition-fast)]"
                >
                  Continue Step {currentStep} →
                </Link>
              ) : (
                <Link
                  href={`/${toolPair}/1`}
                  className="block w-full text-center px-4 py-3 text-sm font-mono text-[var(--color-bg)] bg-[var(--color-accent)] rounded-md hover:bg-[var(--color-accent-hover)] focus-visible:outline-none focus-visible:ring-[var(--focus-ring)] transition-all duration-[var(--transition-fast)]"
                >
                  Start Learning →
                </Link>
              )}

              {/* Divider */}
              <div className="my-6 border-t border-[var(--color-border)]" />

              {/* Reset progress option */}
              {/* TODO: Wire up to localStorage in a client component */}
              <button
                type="button"
                className="w-full text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text)] focus-visible:outline-none focus-visible:ring-[var(--focus-ring)] transition-colors duration-[var(--transition-fast)]"
              >
                Reset Progress
              </button>
            </div>
          </aside>
        </div>
      </main>

      <Footer />
    </div>
  )
}
