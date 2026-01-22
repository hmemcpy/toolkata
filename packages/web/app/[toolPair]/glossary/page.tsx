/**
 * Glossary page - Searchable command reference for tool comparisons.
 *
 * Features:
 * - Server component for static generation and SEO
 * - generateStaticParams for known pairings
 * - generateMetadata for SEO
 * - Loads glossary data and passes to GlossaryClientWrapper
 * - Route: /{toolPair}/glossary (e.g., /jj-git/glossary)
 *
 * This page provides a searchable, filterable command reference
 * that respects the user's direction preference (git→jj or jj→git).
 */

import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { Footer } from "../../../components/ui/Footer"
import { Header } from "../../../components/ui/Header"
import { GlossaryClientWrapper } from "../../../components/ui/GlossaryClientWrapper"
import { getPairing, isValidPairingSlug } from "../../../content/pairings"
import { jjGitGlossary } from "../../../content/glossary/jj-git"

/**
 * Generate static params for all known tool pairings.
 *
 * This enables static generation at build time for all glossary pages.
 */
export function generateStaticParams(): Array<{ readonly toolPair: string }> {
  // For MVP, only jj-git is published
  // Future: fetch from pairing registry
  return [{ toolPair: "jj-git" }]
}

/**
 * Generate metadata for SEO.
 *
 * Dynamic title and description based on tool pairing.
 */
export async function generateMetadata({
  params,
}: {
  readonly params: Promise<{ readonly toolPair: string }>
}): Promise<Metadata> {
  const { toolPair } = await params
  const pairing = getPairing(toolPair)

  if (!pairing) {
    return {
      title: "Glossary Not Found | toolkata",
    }
  }

  return {
    title: `Command Glossary: ${pairing.to.name} ← ${pairing.from.name} | toolkata`,
    description: `Searchable command reference for ${pairing.to.name} if you already know ${pairing.from.name}. Find commands, compare syntax, and copy examples.`,
    openGraph: {
      title: `${pairing.to.name} ← ${pairing.from.name} Command Glossary`,
      description: `Searchable command reference for learning ${pairing.to.name} from ${pairing.from.name}`,
      type: "website",
    },
    twitter: {
      card: "summary",
      title: `${pairing.to.name} ← ${pairing.from.name} Command Glossary`,
      description: `Searchable command reference for learning ${pairing.to.name} from ${pairing.from.name}`,
    },
  }
}

/**
 * Glossary page component.
 *
 * Displays a searchable, filterable command reference table.
 * Users can toggle between:
 * - Default: {fromTool} → {toTool} (e.g., git → jj)
 * - Reversed: {toTool} → {fromTool} (e.g., jj → git)
 *
 * The search, filters, and table columns all respect the direction preference.
 */
export default async function GlossaryPage({
  params,
}: {
  readonly params: Promise<{ readonly toolPair: string }>
}) {
  const { toolPair } = await params

  // Validate the tool pair slug
  if (!isValidPairingSlug(toolPair)) {
    notFound()
  }

  const pairing = getPairing(toolPair)
  if (!pairing) {
    notFound()
  }

  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      <Header />

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Back link */}
        <div className="mb-6">
          <a
            href={`/${toolPair}`}
            className="inline-flex items-center text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text)] focus-visible:outline-none focus-visible:ring-[var(--focus-ring)] transition-colors duration-[var(--transition-fast)]"
          >
            ← {pairing.to.name} ← {pairing.from.name}
          </a>
        </div>

        {/* Title */}
        <h1 className="text-2xl font-bold font-mono text-[var(--color-text)]">
          Command Glossary
        </h1>

        {/* Client wrapper for interactive glossary */}
        <GlossaryClientWrapper
          entries={jjGitGlossary}
          toolPair={toolPair}
          pairingFrom={pairing.from.name}
          pairingTo={pairing.to.name}
        />

        {/* Footer link to cheatsheet */}
        <div className="mt-8 text-sm text-[var(--color-text-muted)]">
          <a
            href={`/${toolPair}/cheatsheet`}
            className="hover:text-[var(--color-accent)] focus-visible:outline-none focus-visible:ring-[var(--focus-ring)] transition-colors duration-[var(--transition-fast)]"
          >
            [View printable cheat sheet →]
          </a>
        </div>
      </main>

      <Footer />
    </div>
  )
}
