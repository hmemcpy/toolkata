import { Footer } from "../components/ui/Footer"
import { Header } from "../components/ui/Header"
import { LessonSectionWrapper } from "../components/ui/LessonSectionWrapper"
import { TerminalSearch } from "../components/ui/TerminalSearch"
import { getPairingsByCategory } from "../content/pairings"

/**
 * Home page - Tool pairing discovery.
 *
 * Shows all available lessons (X if you know Y) grouped by category.
 * Displays progress indicators for returning users via localStorage.
 */
export default function HomePage() {
  const pairingsByCategory = getPairingsByCategory()

  return (
    <div className="bg-[var(--color-bg)] min-h-screen flex flex-col">
      <Header />

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 flex-1">
        {/* Hero Section - Terminal Style */}
        <section className="mb-10 relative">
          {/* Simple bold title */}
          <div className="text-center mb-8">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold font-mono mb-4">
              <span className="text-[var(--color-text)]">tool</span>
              <span className="text-[var(--color-accent)]">kata</span>
              <span
                className="text-[var(--color-text-dim)]"
                style={{ animation: "blink 1s infinite" }}
              >
                _
              </span>
            </h1>
          </div>

          {/* Tagline as terminal output */}
          <div className="max-w-2xl mx-auto text-center space-y-4">
            <div className="inline-block text-left bg-[var(--color-surface)] border border-[var(--color-border)] p-4 sm:p-6">
              <div className="font-mono text-sm sm:text-base space-y-2">
                <p className="text-[var(--color-text-muted)]">
                  <span className="text-[var(--color-accent)]">$</span> cat README.md
                </p>
                <div className="border-l-2 border-[var(--color-accent)] pl-4 mt-3">
                  <p className="text-[var(--color-text)] text-lg sm:text-xl font-medium mb-2">
                    Learn X if you already know Y
                  </p>
                  <p className="text-[var(--color-text-muted)] text-sm">
                    Hands-on tutorials for developers switching tools.
                    <br />
                    No fluff. Just the commands you need.
                  </p>
                </div>
                <div className="mt-4 pt-2 border-t border-[var(--color-border)]">
                  <TerminalSearch />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Lesson Grid Grouped by Category */}
        <LessonSectionWrapper pairingsByCategory={pairingsByCategory} />
      </main>

      <Footer />
    </div>
  )
}
