/**
 * Glossary page - Searchable command reference for pairings and tutorials.
 *
 * Features:
 * - Server component for static generation and SEO
 * - generateStaticParams for known pairings and tutorials
 * - generateMetadata for SEO
 * - Route: /{toolPair}/glossary (e.g., /jj-git/glossary, /tmux/glossary)
 *
 * This page provides a searchable, filterable command reference:
 * - For pairings: two-column comparison (git→jj) with direction toggle
 * - For tutorials: single-column cheat sheet (tmux commands)
 */

import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { BackButton } from "../../../components/ui/BackButton"
import { Footer } from "../../../components/ui/Footer"
import { Header } from "../../../components/ui/Header"
import { GlossaryClientWrapper } from "../../../components/ui/GlossaryClientWrapper"
import { CheatSheetClientWrapper } from "../../../components/ui/CheatSheetClientWrapper"
import { zioCatsGlossary } from "../../../content/glossary/zio-cats"
import { getEntry, isPairing, isValidEntrySlug } from "../../../content/pairings"
import { jjGitGlossary } from "../../../content/glossary/jj-git"
import { getEffectZioGlossary } from "../../../content/glossary/effect-zio"
import { tmuxCheatSheet } from "../../../content/glossary/tmux"

/**
 * Generate static params for all known tool pairings and tutorials.
 */
export function generateStaticParams(): Array<{ readonly toolPair: string }> {
  return [
    { toolPair: "jj-git" },
    { toolPair: "zio-cats" },
    { toolPair: "effect-zio" },
    { toolPair: "tmux" },
  ]
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
  const entry = getEntry(toolPair)

  if (!entry) {
    return {
      title: "Glossary Not Found",
    }
  }

  if (isPairing(entry)) {
    // Pairing mode: two-column comparison
    return {
      title: `Glossary: ${entry.to.name} ← ${entry.from.name}`,
      description: `Command glossary for ${entry.to.name} vs ${entry.from.name}. Find equivalent commands and compare syntax.`,
      openGraph: {
        title: `${entry.to.name} ← ${entry.from.name} Glossary`,
        description: `Compare commands between ${entry.to.name} and ${entry.from.name}`,
        type: "website",
      },
      twitter: {
        card: "summary",
        title: `${entry.to.name} ← ${entry.from.name} Glossary`,
        description: `Compare commands between ${entry.to.name} and ${entry.from.name}`,
      },
    }
  }
  // Tutorial mode: single-tool cheat sheet
  return {
    title: `${entry.tool.name} Cheat Sheet`,
    description: `Command reference for ${entry.tool.name}. Search and filter ${entry.tool.name} commands.`,
    openGraph: {
      title: `${entry.tool.name} Cheat Sheet`,
      description: `Search and filter ${entry.tool.name} commands`,
      type: "website",
    },
    twitter: {
      card: "summary",
      title: `${entry.tool.name} Cheat Sheet`,
      description: `Search and filter ${entry.tool.name} commands`,
    },
  }
}

/**
 * Glossary page component.
 *
 * Displays a searchable, filterable command reference.
 * - Pairings: two-column comparison with direction toggle
 * - Tutorials: single-column cheat sheet
 */
export default async function GlossaryPage({
  params,
}: {
  readonly params: Promise<{ readonly toolPair: string }>
}) {
  const { toolPair } = await params

  if (!isValidEntrySlug(toolPair)) {
    notFound()
  }

  const entry = getEntry(toolPair)
  if (!entry) {
    notFound()
  }

  // Branch based on mode
  if (isPairing(entry)) {
    // Pairing mode: two-column glossary comparison
    const entries =
      toolPair === "zio-cats"
        ? zioCatsGlossary
        : toolPair === "effect-zio"
          ? getEffectZioGlossary()
          : jjGitGlossary

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
          <h1 className="text-2xl font-bold font-mono text-[var(--color-text)]">Glossary</h1>

          {/* Client wrapper for interactive glossary */}
          <GlossaryClientWrapper
            entries={entries}
            toolPair={toolPair}
            pairingFrom={entry.from.name}
            pairingTo={entry.to.name}
          />
        </main>

        <Footer />
      </div>
    )
  }
  // Tutorial mode: single-column cheat sheet
  return (
      <div className="min-h-screen bg-[var(--color-bg)]">
        <Header />

        <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
          {/* Back link */}
          <div className="mb-6">
            <BackButton className="inline-flex items-center text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text)] focus-visible:outline-none focus-visible:ring-[var(--focus-ring)] transition-colors duration-[var(--transition-fast)]">
              ← Back
            </BackButton>
          </div>

          {/* Title */}
          <h1 className="text-2xl font-bold font-mono text-[var(--color-text)]">Cheat Sheet</h1>

          {/* Client wrapper for interactive cheat sheet */}
          <CheatSheetClientWrapper
            entries={tmuxCheatSheet}
            toolPair={toolPair}
            toolName={entry.tool.name}
          />
        </main>

        <Footer />
      </div>
    )
}
