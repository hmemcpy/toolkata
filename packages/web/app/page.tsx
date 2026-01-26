import { Footer } from "../components/ui/Footer"
import { Header } from "../components/ui/Header"
import { LessonCard } from "../components/ui/LessonCard"
import { TerminalSearch } from "../components/ui/TerminalSearch"
import { getPairingsByCategory } from "../content/pairings"
import { getServerProgressAsync } from "../core/progress-server"

// Page uses cookies for progress, so it must be dynamic
export const dynamic = "force-dynamic"

/**
 * Home page - Tool pairing discovery.
 *
 * Shows all available lessons (X if you know Y) grouped by category.
 * Progress is read from cookies during SSR - no hydration flicker.
 */
export default async function HomePage() {
  const pairingsByCategory = getPairingsByCategory()
  const progress = await getServerProgressAsync()

  return (
    <div className="bg-[var(--color-bg)] min-h-screen flex flex-col">
      <Header />

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 flex-1">
        {/* Hero Section - Terminal Style */}
        <section className="mb-6 relative">
          {/* Simple bold title */}
          <div className="text-center mb-4">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold font-mono mb-3">
              <span className="text-[var(--color-text)]">tool</span>
              <span className="text-[var(--color-accent)]">kata</span>
              <span
                className="text-[var(--color-text-dim)]"
                style={{ animation: "blink 1s infinite" }}
              >
                _
              </span>
            </h1>
            <p className="text-[var(--color-text-muted)] text-sm sm:text-base">
              <span className="text-[var(--color-text-dim)]">kata</span>
              <span className="mx-2 text-[var(--color-text-dim)]">(型)</span>
              <span className="italic">the art of learning through deliberate practice</span>
            </p>
          </div>

          {/* Tagline as terminal output */}
          <div className="max-w-2xl mx-auto text-center">
            <div className="inline-block text-left bg-[var(--color-surface)] border border-[var(--color-border)] p-4 sm:p-6">
              <div className="font-mono text-sm sm:text-base">
                <p className="text-[var(--color-text-muted)]">
                  <span className="text-[var(--color-accent)]">$</span> cat README.md
                </p>
                <div className="border-l-2 border-[var(--color-accent)] pl-4 mt-3 mb-3">
                  <p className="text-[var(--color-text)] text-lg sm:text-xl font-medium mb-2">
                    Learn X if you already know Y
                  </p>
                  <p className="text-[var(--color-text-muted)] text-sm">
                    Hands-on tutorials for developers switching tools.
                    <br />
                    No fluff. Just the commands you need.
                  </p>
                </div>
                <div className="pt-2 border-t border-[var(--color-border)]">
                  <TerminalSearch />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Lesson Grid Grouped by Category */}
        <section className="space-y-12">
          {Object.entries(pairingsByCategory).map(([category, pairings]) => (
            <div key={category}>
              <div className="mb-6 flex items-center gap-4">
                <span className="text-[var(--color-text-dim)] font-mono text-sm">{"/*"}</span>
                <h2 className="text-lg font-bold font-mono text-[var(--color-text)]">{category}</h2>
                <div className="flex-1 border-t border-[var(--color-border)]" />
                <span className="text-[var(--color-text-dim)] font-mono text-xs">
                  {pairings.length} {pairings.length === 1 ? "lesson" : "lessons"}
                </span>
                <span className="text-[var(--color-text-dim)] font-mono text-sm">{"*/"}</span>
              </div>

              <div className="grid gap-4 sm:gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {pairings.map((pairing) => {
                  const pairingProgress = progress[pairing.slug]
                  return (
                    <LessonCard
                      key={pairing.slug}
                      pairing={pairing}
                      completedSteps={pairingProgress?.completedSteps.length ?? 0}
                      currentStep={pairingProgress?.currentStep}
                    />
                  )
                })}
              </div>
            </div>
          ))}
        </section>
      </main>

      <Footer />
    </div>
  )
}
