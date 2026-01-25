/**
 * Cheat Sheet page - Searchable command comparison for tool pairings.
 *
 * Features:
 * - Server component for static generation and SEO
 * - generateStaticParams for known pairings
 * - generateMetadata for SEO
 * - Route: /{toolPair}/cheatsheet (e.g., /jj-git/cheatsheet)
 *
 * This page provides a searchable, filterable command comparison
 * that respects the user's direction preference (git→jj or jj→git).
 */

import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { BackButton } from "../../../components/ui/BackButton"
import { Footer } from "../../../components/ui/Footer"
import { Header } from "../../../components/ui/Header"
import { GlossaryClientWrapper } from "../../../components/ui/GlossaryClientWrapper"
import { catsZioGlossary, getCategories as getCatsZioCategories } from "../../../content/glossary/cats-zio"
import { getPairing, isValidPairingSlug } from "../../../content/pairings"
import {
  getCategories as getJJCategories,
  jjGitGlossary,
} from "../../../content/glossary/jj-git"

/**
 * Generate static params for all known tool pairings.
 */
export function generateStaticParams(): Array<{ readonly toolPair: string }> {
  return [{ toolPair: "jj-git" }, { toolPair: "cats-zio" }]
}

/**
 * Generate metadata for SEO.
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
      title: "Cheat Sheet Not Found",
    }
  }

  return {
    title: `Cheat Sheet: ${pairing.to.name} ← ${pairing.from.name}`,
    description: `Command cheat sheet for ${pairing.to.name} vs ${pairing.from.name}. Find equivalent commands and compare syntax.`,
    openGraph: {
      title: `${pairing.to.name} ← ${pairing.from.name} Cheat Sheet`,
      description: `Compare commands between ${pairing.to.name} and ${pairing.from.name}`,
      type: "website",
    },
    twitter: {
      card: "summary",
      title: `${pairing.to.name} ← ${pairing.from.name} Cheat Sheet`,
      description: `Compare commands between ${pairing.to.name} and ${pairing.from.name}`,
    },
  }
}

/**
 * Cheat Sheet page component.
 *
 * Displays a searchable, filterable command comparison table.
 */
export default async function CheatSheetPage({
  params,
}: {
  readonly params: Promise<{ readonly toolPair: string }>
}) {
  const { toolPair } = await params

  if (!isValidPairingSlug(toolPair)) {
    notFound()
  }

  const pairing = getPairing(toolPair)
  if (!pairing) {
    notFound()
  }

  // Select glossary and categories based on tool pair
  const entries = toolPair === "cats-zio" ? catsZioGlossary : jjGitGlossary
  const categories = toolPair === "cats-zio" ? getCatsZioCategories() : getJJCategories()

  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      <Header />

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Back link */}
        <div className="mb-6">
          <BackButton className="inline-flex items-center text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text)] focus-visible:outline-none focus-visible:ring-[var(--focus-ring)] transition-colors duration-[var(--transition-fast)]">
            ← Back
          </BackButton>
        </div>

        {/* Title */}
        <h1 className="text-2xl font-bold font-mono text-[var(--color-text)]">Cheat Sheet</h1>

        {/* Client wrapper for interactive cheat sheet */}
        <GlossaryClientWrapper
          entries={entries}
          categories={categories}
          toolPair={toolPair}
          pairingFrom={pairing.from.name}
          pairingTo={pairing.to.name}
        />
      </main>

      <Footer />
    </div>
  )
}
