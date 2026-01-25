import { Footer } from "../../components/ui/Footer"
import { Header } from "../../components/ui/Header"
import { UxPrototypeClient } from "./UxPrototypeClient"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Scala Effects UX Prototype | toolkata",
  description: "Bidirectional UX prototype for Cats Effect ↔ ZIO tutorial",
}

/**
 * Scala Effects UX Prototype Page.
 *
 * Demonstrates 4 different UX approaches for bidirectional comparison:
 * 1. Single page with column swap toggle
 * 2. Separate routes (/zio-cats and /cats-zio)
 * 3. Landing page chooser
 * 4. Smart home page cards
 */
export default function ScalaEffectsDemoPage() {
  return (
    <div className="bg-[var(--color-bg)] min-h-screen flex flex-col">
      <Header />

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8 flex-1">
        {/* Header */}
        <div className="mb-10">
          <h1 className="text-3xl sm:text-4xl font-bold font-mono mb-2">
            <span className="text-[var(--color-text)]">Bidirectional UX</span>
            <span className="text-[var(--color-text-dim)]">/</span>
            <span className="text-[var(--color-accent)]">Prototype</span>
          </h1>
          <p className="text-[var(--color-text-muted)] text-sm max-w-2xl">
            Four approaches for displaying Cats Effect ↔ ZIO comparisons. Each option
            demonstrates a different UX pattern. Toggle the direction to see how each
            approach handles the bidirectional experience.
          </p>
        </div>

        {/* Client-side interactive prototype */}
        <UxPrototypeClient />
      </main>

      <Footer />
    </div>
  )
}
