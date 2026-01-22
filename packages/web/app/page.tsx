import { Header } from "../components/ui/Header"
import { Footer } from "../components/ui/Footer"
import { ComparisonCardWrapper } from "../components/ui/ComparisonCardWrapper"
import { getPairingsByCategory } from "../content/pairings"

/**
 * Home page - Tool pairing discovery.
 *
 * Shows all available tool comparisons (X if you know Y) grouped by category.
 * Displays progress indicators for returning users via localStorage.
 */
export default function HomePage() {
  const pairingsByCategory = getPairingsByCategory()

  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      <Header />

      <main className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        {/* Hero Section */}
        <section className="mb-16 text-center">
          <h1 className="mb-4 text-4xl font-bold font-mono text-[var(--color-text)] sm:text-5xl">
            Learn X if you already know Y
          </h1>
          <p className="mx-auto max-w-2xl text-base text-[var(--color-text-muted)] font-mono sm:text-lg">
            Hands-on tutorials for developers switching tools. No fluff. Just the commands you need.
          </p>
        </section>

        {/* Comparison Grid Grouped by Category */}
        <section className="space-y-12">
          {Object.entries(pairingsByCategory).map(([category, pairings]) => (
            <div key={category}>
              <h2 className="mb-6 text-xl font-bold font-mono text-[var(--color-text)]">
                {category}
              </h2>

              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {pairings.map((pairing) => (
                  <ComparisonCardWrapper key={pairing.slug} pairing={pairing} />
                ))}
              </div>
            </div>
          ))}
        </section>
      </main>

      <Footer />
    </div>
  )
}
