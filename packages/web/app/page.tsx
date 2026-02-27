"use client"

import { Footer } from "@/components/ui/Footer"
import { Header } from "@/components/ui/Header"
import { LessonCard } from "@/components/ui/LessonCard"
import { TerminalSearch } from "@/components/ui/TerminalSearch"
import { getEntriesByCategory, getPublishedEntries } from "@/content/pairings"
import { getProgressStore } from "@/core/ProgressStore"
import { useEffect, useMemo, useState } from "react"

const CATEGORY_ORDER = [
  "Version Control",
  "Frameworks & Libraries",
  "Build Tools",
  "Package Management",
  "Other",
] as const

const DEFAULT_CATEGORY_META = {
  lane: "[workflow]",
  intent: "Terminal and workflow topics",
  accent: "var(--color-accent-alt)",
} as const

const CATEGORY_META: Record<
  string,
  { readonly intent: string; readonly lane: string; readonly accent: string }
> = {
  "Version Control": {
    lane: "[vcs]",
    intent: "Git and DVCS workflows",
    accent: "var(--color-accent)",
  },
  "Frameworks & Libraries": {
    lane: "[effects]",
    intent: "Effect system comparisons",
    accent: "var(--color-framework)",
  },
  "Build Tools": {
    lane: "[build]",
    intent: "Build and automation tools",
    accent: "var(--color-ce)",
  },
  "Package Management": {
    lane: "[pkg]",
    intent: "Dependency management topics",
    accent: "var(--color-warning)",
  },
  Other: DEFAULT_CATEGORY_META,
}

interface HomeProgress {
  readonly completedSteps: readonly number[]
  readonly currentStep: number
}

/**
 * Home page - Tool pairing discovery.
 *
 * Shows all available lessons (X if you know Y) grouped by category.
 * Progress is read from localStorage on the client.
 */
export default function HomePage() {
  const entriesByCategory = getEntriesByCategory()
  const publishedEntries = getPublishedEntries()
  const [progress, setProgress] = useState<Record<string, HomeProgress>>({})

  useEffect(() => {
    const store = getProgressStore()
    const loadProgress = () => {
      const data = store.load()
      const next: Record<string, HomeProgress> = {}
      for (const [slug, pairProgress] of Object.entries(data.pairings)) {
        next[slug] = {
          completedSteps: pairProgress.completedSteps,
          currentStep: pairProgress.currentStep,
        }
      }
      setProgress(next)
    }

    loadProgress()
    const onStorage = (event: StorageEvent) => {
      if (event.key === "toolkata_progress") {
        loadProgress()
      }
    }
    window.addEventListener("storage", onStorage)
    return () => window.removeEventListener("storage", onStorage)
  }, [])

  const sortedCategories = useMemo(
    () => [
      ...CATEGORY_ORDER.filter((category) => entriesByCategory[category]),
      ...Object.keys(entriesByCategory)
        .filter((category) => !CATEGORY_ORDER.includes(category as (typeof CATEGORY_ORDER)[number]))
        .sort(),
    ],
    [entriesByCategory],
  )

  return (
    <div className="bg-[var(--color-bg)] min-h-screen flex flex-col">
      <Header />

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 flex-1">
        <section className="mb-8">
          <div className="border border-[var(--color-border)] bg-[var(--color-surface)]">
            <div className="flex items-center justify-between px-4 py-2 border-b border-[var(--color-border)] font-mono text-xs">
              <div className="flex items-center gap-2">
                <div className="flex gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-[var(--color-error)] opacity-60" />
                  <div className="w-2.5 h-2.5 rounded-full bg-[var(--color-warning)] opacity-60" />
                  <div className="w-2.5 h-2.5 rounded-full bg-[var(--color-accent)] opacity-60" />
                </div>
                <span>
                  <span className="text-[var(--color-text)]">tool</span>
                  <span className="text-[var(--color-accent)]">kata</span>
                  <span className="text-[var(--color-text-muted)]"> search</span>
                  <span
                    className="text-[var(--color-text-dim)]"
                    style={{ animation: "blink 1s infinite" }}
                  >
                    _
                  </span>
                </span>
              </div>
              <span className="text-[var(--color-text-dim)]">{publishedEntries.length} tracks</span>
            </div>

            <div className="p-4 sm:p-5">
              <TerminalSearch
                autoFocus
                placeholder=" search by tool, command, or concept"
                className="w-full"
              />
            </div>
          </div>
        </section>

        <section id="discover" className="space-y-10 scroll-mt-8">
          {sortedCategories.map((category) => {
            const entries = entriesByCategory[category] ?? []
            const meta = CATEGORY_META[category] ?? DEFAULT_CATEGORY_META

            return (
              <div key={category}>
                <div className="mb-5 border-l-2 pl-3" style={{ borderColor: meta.accent }}>
                  <div className="mb-1 flex items-center gap-3">
                    <h2 className="text-lg font-bold font-mono text-[var(--color-text)]">
                      {category}
                    </h2>
                    <span className="font-mono text-[10px]" style={{ color: meta.accent }}>
                      {meta.lane}
                    </span>
                    <div className="flex-1 border-t border-[var(--color-border)]" />
                    <span className="text-[var(--color-text-dim)] font-mono text-xs">
                      {entries.length} {entries.length === 1 ? "lesson" : "lessons"}
                    </span>
                  </div>
                  <p className="text-sm text-[var(--color-text-dim)]">{meta.intent}</p>
                </div>

                <div className="grid gap-4 sm:gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {entries.map((entry) => {
                    const entryProgress = progress[entry.slug]
                    return (
                      <LessonCard
                        key={entry.slug}
                        entry={entry}
                        completedSteps={entryProgress?.completedSteps.length ?? 0}
                        currentStep={entryProgress?.currentStep}
                      />
                    )
                  })}
                </div>
              </div>
            )
          })}
        </section>
      </main>

      <Footer />
    </div>
  )
}
