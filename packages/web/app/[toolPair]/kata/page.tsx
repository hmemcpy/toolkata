import Link from "next/link"
import { notFound } from "next/navigation"
import { Footer } from "../../../components/ui/Footer"
import { Header } from "../../../components/ui/Header"
import { KataLanding } from "../../../components/kata/KataLanding"
import { getPairing, isValidPairingSlug } from "../../../content/pairings"
import { getServerProgressForPairAsync } from "../../../core/progress-server"
import { listKatas } from "../../../services/content"

/**
 * Generate static params for kata landing pages.
 *
 * Only jj-git has Katas initially.
 * zio-cats and effect-zio may have Katas in the future.
 */
export function generateStaticParams() {
  const pairings = [{ slug: "jj-git" }, { slug: "zio-cats" }, { slug: "effect-zio" }]
  return pairings.map((pairing) => ({ toolPair: pairing.slug }))
}

/**
 * Generate metadata for the kata landing page.
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
    title: `Kata Practice | ${pairing.to.name} ← ${pairing.from.name}`,
    description: `Practice ${pairing.to.name} with hands-on scenarios. Build muscle memory with auto-validated exercises.`,
  }
}

/**
 * Kata landing page.
 *
 * Shows:
 * - All 7 Katas with their unlock status
 * - Progress indicator (X/7 completed)
 * - Empty state for users who haven't completed Step 12
 * - Lock/unlock/completed states for each Kata
 * - Flash message when redirected from locked Kata access
 *
 * Access control:
 * - Kata 1 is unlocked after completing Step 12
 * - Kata N+1 is unlocked after completing Kata N
 * - Shows empty state with prompt to complete tutorial if Step 12 not done
 *
 * @param props - Props containing the dynamic route params.
 */
export default async function KataLandingPage(props: {
  readonly params: Promise<{ readonly toolPair: string }>
  readonly searchParams: Promise<{ readonly locked?: string }>
}) {
  const params = await props.params
  const searchParams = await props.searchParams
  const { toolPair } = params

  // Validate the tool pair slug
  if (!isValidPairingSlug(toolPair)) {
    notFound()
  }

  const pairing = getPairing(toolPair)
  if (!pairing) {
    notFound()
  }

  // Load all Katas for this tool pairing
  const katas = await listKatas(toolPair)

  // Map to KataLanding props format
  // Extract kata number from frontmatter (kata field)
  const katasWithIds = katas.map((kata) => ({
    frontmatter: kata.frontmatter,
    kataId: kata.frontmatter.kata.toString(),
  }))

  // Read progress from cookie to determine Step 12 completion
  // This prevents hydration flicker and ensures consistent SSR/CSR
  const serverProgress = await getServerProgressForPairAsync(toolPair)
  const step12Completed = serverProgress?.completedSteps.includes(12) ?? false

  // Check if user was redirected from a locked Kata
  const locked = searchParams.locked === "true"

  // For jj-git, we have 7 Katas
  // For other pairings, Katas may not exist yet - show empty state
  const hasKatas = katasWithIds.length > 0

  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      <Header />

      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Breadcrumb / Back link */}
        <div className="mb-8">
          <Link
            href={`/${toolPair}`}
            className="inline-flex items-center text-sm text-[#d1d5dc] hover:text-white focus-visible:outline-none focus-visible:ring-[var(--focus-ring)] transition-colors duration-[var(--transition-fast)]"
          >
            ← Back to overview
          </Link>
        </div>

        {/* Kata landing component or empty state */}
        {hasKatas ? (
          <KataLanding katas={katasWithIds} step12Completed={step12Completed} lockedRedirect={locked} />
        ) : (
          <div className="max-w-2xl mx-auto py-12 px-4 text-center">
            <h1 className="text-2xl font-bold font-mono text-[var(--color-text-primary)] mb-3">
              Kata Practice
            </h1>
            <p className="text-base text-[var(--color-text-muted)] leading-relaxed max-w-md mx-auto mb-6">
              Hands-on scenarios coming soon. Practice {pairing.to.name} until it becomes muscle
              memory.
            </p>
            <Link
              href={`/${toolPair}`}
              className="inline-flex items-center gap-2 text-sm text-[var(--color-accent)] hover:text-[var(--color-accent-hover)] font-mono transition-colors"
            >
              <span>Return to tutorial</span>
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                <title>Arrow right</title>
                <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </Link>
          </div>
        )}
      </main>

      <Footer />
    </div>
  )
}
