/**
 * UxPrototypeClient - Client-side component for bidirectional UX prototype.
 *
 * Demonstrates 4 different UX approaches for displaying Cats Effect ↔ ZIO comparisons.
 * Each option can be tested interactively to evaluate the user experience.
 */

"use client"

import { ScalaComparisonBlock } from "../../components/ui/ScalaComparisonBlock"
import { DirectionToggle } from "../../components/ui/DirectionToggle"
import { useDirection } from "../../hooks/useDirection"
import type { DirectionPreference } from "../../core/PreferencesStore"
import { useCallback, useState } from "react"

// Sample code for comparison
const ZIO_EXAMPLE = `val program = ZIO.succeed(42)
val doubled = program.map(_ * 2)`

const CE_EXAMPLE = `val program = IO.pure(42)
val doubled = program.map(_ * 2)`

/**
 * UX Option 1: Column Swap Toggle
 *
 * Description: Single page with a toggle switch that swaps columns.
 * Pros: Simple, persistent preference, minimal UI.
 * Cons: Toggle may be hard to discover, requires explanation.
 */
function Option1ColumnSwap() {
  return (
    <div className="border border-[var(--color-border)] rounded-lg p-6 bg-[var(--color-surface)]">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-lg font-bold font-mono text-[var(--color-text)]">
            Option 1: Column Swap Toggle
          </h3>
          <p className="text-xs text-[var(--color-text-muted)] mt-1">
            Single page with toggle switch
          </p>
        </div>
        <DirectionToggle />
      </div>
      <div className="mb-4">
        <p className="text-sm text-[var(--color-text-muted)] mb-2">
          The toggle in the header swaps the column order below:
        </p>
        <ul className="text-xs text-[var(--color-text-muted)] space-y-1 list-disc list-inside">
          <li>Default: ZIO on left (blue), Cats Effect on right (purple)</li>
          <li>Reversed: Cats Effect on left, ZIO on right</li>
          <li>Preference persists across page refreshes</li>
        </ul>
      </div>
      <ScalaComparisonBlock zioCode={ZIO_EXAMPLE} catsEffectCode={CE_EXAMPLE} />
    </div>
  )
}

/**
 * UX Option 2: Separate Routes
 *
 * Description: Two separate routes (/zio-cats and /cats-zio) with reversed defaults.
 * Pros: Clear semantic URLs, shareable links with direction baked in.
 * Cons: Duplicate content, potential SEO confusion, twice the routes to maintain.
 */
function Option2SeparateRoutes() {
  const { setDirection } = useDirection()
  const [simulatedRoute, setSimulatedRoute] = useState<DirectionPreference>("git-to-jj")

  const handleZioCatsClick = useCallback(() => {
    setSimulatedRoute("git-to-jj")
    setDirection("git-to-jj")
  }, [setDirection])

  const handleCatsZioClick = useCallback(() => {
    setSimulatedRoute("jj-to-git")
    setDirection("jj-to-git")
  }, [setDirection])

  const isReversed = simulatedRoute === "jj-to-git"

  return (
    <div className="border border-[var(--color-border)] rounded-lg p-6 bg-[var(--color-surface)]">
      <div className="mb-4">
        <h3 className="text-lg font-bold font-mono text-[var(--color-text)]">
          Option 2: Separate Routes
        </h3>
        <p className="text-xs text-[var(--color-text-muted)] mt-1">
          /zio-cats and /cats-zio with reversed defaults
        </p>
      </div>
      <div className="mb-4">
        <p className="text-sm text-[var(--color-text-muted)] mb-2">
          Two separate URLs, each with a fixed direction:
        </p>
        <ul className="text-xs text-[var(--color-text-muted)] space-y-1 list-disc list-inside">
          <li>/zio-cats → ZIO on left (default direction)</li>
          <li>/cats-zio → Cats Effect on left (reversed)</li>
        </ul>
      </div>
      <div className="flex gap-3 mb-4">
        <button
          type="button"
          onClick={handleZioCatsClick}
          className={[
            "px-4 py-2 text-sm font-mono border rounded-md min-h-[44px]",
            "transition-colors",
            !isReversed
              ? "border-[var(--color-accent)] text-[var(--color-accent)] bg-[var(--color-accent-bg)]"
              : "border-[var(--color-border)] text-[var(--color-text-muted)] bg-[var(--color-surface)]",
          ].join(" ")}
        >
          /zio-cats
        </button>
        <button
          type="button"
          onClick={handleCatsZioClick}
          className={[
            "px-4 py-2 text-sm font-mono border rounded-md min-h-[44px]",
            "transition-colors",
            isReversed
              ? "border-[var(--color-ce)] text-[var(--color-ce)] bg-[var(--color-ce-bg)]"
              : "border-[var(--color-border)] text-[var(--color-text-muted)] bg-[var(--color-surface)]",
          ].join(" ")}
        >
          /cats-zio
        </button>
      </div>
      <div className="p-3 border border-[var(--color-border)] rounded bg-[var(--color-bg)] mb-4">
        <p className="text-xs font-mono text-[var(--color-text-muted)]">
          Simulated route: <span className="text-[var(--color-accent)]">{isReversed ? "/cats-zio" : "/zio-cats"}</span>
        </p>
      </div>
      <ScalaComparisonBlock zioCode={ZIO_EXAMPLE} catsEffectCode={CE_EXAMPLE} />
    </div>
  )
}

/**
 * UX Option 3: Landing Page Chooser
 *
 * Description: Landing page with "I know ZIO" / "I know Cats Effect" buttons.
 * Pros: User declares their expertise, sets direction, navigates to content in one flow.
 * Cons: Extra click before content, may feel patronizing to some users.
 */
function Option3LandingChooser() {
  const { setDirection } = useDirection()
  const [selectedExpertise, setSelectedExpertise] = useState<"zio" | "cats" | null>(null)

  const handleIKnowZio = useCallback(() => {
    setSelectedExpertise("zio")
    setDirection("git-to-jj") // ZIO users want to learn Cats Effect
  }, [setDirection])

  const handleIKnowCats = useCallback(() => {
    setSelectedExpertise("cats")
    setDirection("jj-to-git") // Cats Effect users want to learn ZIO
  }, [setDirection])

  return (
    <div className="border border-[var(--color-border)] rounded-lg p-6 bg-[var(--color-surface)]">
      <div className="mb-4">
        <h3 className="text-lg font-bold font-mono text-[var(--color-text)]">
          Option 3: Landing Page Chooser
        </h3>
        <p className="text-xs text-[var(--color-text-muted)] mt-1">
          "I know X" buttons that set direction
        </p>
      </div>
      <div className="mb-4">
        <p className="text-sm text-[var(--color-text-muted)] mb-2">
          User declares their expertise on a landing page:
        </p>
        <ul className="text-xs text-[var(--color-text-muted)] space-y-1 list-disc list-inside">
          <li>"I know ZIO" → Sets direction to ZIO→Cats Effect</li>
          <li>"I know Cats Effect" → Sets direction to Cats Effect→ZIO</li>
          <li>Then navigates to tutorial content</li>
        </ul>
      </div>
      <div className="flex gap-3 mb-4">
        <button
          type="button"
          onClick={handleIKnowZio}
          className={[
            "px-4 py-2 text-sm font-mono border rounded-md min-h-[44px]",
            "transition-colors",
            selectedExpertise === "zio"
              ? "border-[var(--color-zio)] text-[var(--color-zio)] bg-[var(--color-zio-bg)]"
              : "border-[var(--color-border)] text-[var(--color-text-muted)] bg-[var(--color-surface)]",
          ].join(" ")}
        >
          I know ZIO
        </button>
        <button
          type="button"
          onClick={handleIKnowCats}
          className={[
            "px-4 py-2 text-sm font-mono border rounded-md min-h-[44px]",
            "transition-colors",
            selectedExpertise === "cats"
              ? "border-[var(--color-ce)] text-[var(--color-ce)] bg-[var(--color-ce-bg)]"
              : "border-[var(--color-border)] text-[var(--color-text-muted)] bg-[var(--color-surface)]",
          ].join(" ")}
        >
          I know Cats Effect
        </button>
      </div>
      {selectedExpertise && (
        <div className="p-3 border border-[var(--color-border)] rounded bg-[var(--color-bg)] mb-4">
          <p className="text-xs font-mono text-[var(--color-text-muted)]">
            Direction set:{" "}
            <span className="text-[var(--color-accent)]">
              {selectedExpertise === "zio" ? "ZIO → Cats Effect" : "Cats Effect → ZIO"}
            </span>
          </p>
        </div>
      )}
      <ScalaComparisonBlock zioCode={ZIO_EXAMPLE} catsEffectCode={CE_EXAMPLE} />
    </div>
  )
}

/**
 * UX Option 4: Smart Cards
 *
 * Description: Two home page cards for the same content, direction preset per card.
 * Pros: Clear intent, no extra clicks after choosing, visually distinctive.
 * Cons: Duplicate content on home page, may confuse users about which to pick.
 */
function Option4SmartCards() {
  const { direction, setDirection } = useDirection()
  const [selectedCard, setSelectedCard] = useState<"for-zio" | "for-cats" | null>(null)

  const handleForZioClick = useCallback(() => {
    setSelectedCard("for-zio")
    setDirection("git-to-jj")
  }, [setDirection])

  const handleForCatsClick = useCallback(() => {
    setSelectedCard("for-cats")
    setDirection("jj-to-git")
  }, [setDirection])

  const isReversed = direction === "jj-to-git"

  return (
    <div className="border border-[var(--color-border)] rounded-lg p-6 bg-[var(--color-surface)]">
      <div className="mb-4">
        <h3 className="text-lg font-bold font-mono text-[var(--color-text)]">
          Option 4: Smart Cards
        </h3>
        <p className="text-xs text-[var(--color-text-muted)] mt-1">
          Two home page cards, direction preset
        </p>
      </div>
      <div className="mb-4">
        <p className="text-sm text-[var(--color-text-muted)] mb-2">
          Two cards on the home page, both lead to the same content:
        </p>
        <ul className="text-xs text-[var(--color-text-muted)] space-y-1 list-disc list-inside">
          <li>"ZIO → Cats Effect" card → Presets direction to ZIO first</li>
          <li>"Cats Effect → ZIO" card → Presets direction to Cats Effect first</li>
          <li>Clicking a card sets direction and navigates to content</li>
        </ul>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
        <button
          type="button"
          onClick={handleForZioClick}
          className={[
            "p-4 border rounded-lg text-left min-h-[100px]",
            "transition-colors flex flex-col justify-between",
            selectedCard === "for-zio" || (!isReversed && selectedCard === null)
              ? "border-[var(--color-zio)] bg-[var(--color-zio-bg)]"
              : "border-[var(--color-border)] bg-[var(--color-surface)] hover:border-[var(--color-zio)]",
          ].join(" ")}
        >
          <div>
            <p className="text-xs font-mono text-[var(--color-text-dim)] mb-1">Scala Effects</p>
            <p className="text-sm font-bold font-mono text-[var(--color-text)]">ZIO → Cats Effect</p>
          </div>
          <p className="text-xs text-[var(--color-text-muted)] mt-2">For ZIO developers</p>
        </button>
        <button
          type="button"
          onClick={handleForCatsClick}
          className={[
            "p-4 border rounded-lg text-left min-h-[100px]",
            "transition-colors flex flex-col justify-between",
            selectedCard === "for-cats" || (isReversed && selectedCard === null)
              ? "border-[var(--color-ce)] bg-[var(--color-ce-bg)]"
              : "border-[var(--color-border)] bg-[var(--color-surface)] hover:border-[var(--color-ce)]",
          ].join(" ")}
        >
          <div>
            <p className="text-xs font-mono text-[var(--color-text-dim)] mb-1">Scala Effects</p>
            <p className="text-sm font-bold font-mono text-[var(--color-text)]">Cats Effect → ZIO</p>
          </div>
          <p className="text-xs text-[var(--color-text-muted)] mt-2">For Cats Effect developers</p>
        </button>
      </div>
      {selectedCard && (
        <div className="p-3 border border-[var(--color-border)] rounded bg-[var(--color-bg)] mb-4">
          <p className="text-xs font-mono text-[var(--color-text-muted)]">
            Card selected:{" "}
            <span className="text-[var(--color-accent)]">
              {selectedCard === "for-zio" ? "ZIO → Cats Effect" : "Cats Effect → ZIO"}
            </span>
          </p>
        </div>
      )}
      <ScalaComparisonBlock zioCode={ZIO_EXAMPLE} catsEffectCode={CE_EXAMPLE} />
    </div>
  )
}

/**
 * Comparison table for the four options
 */
function ComparisonTable() {
  return (
    <div className="mt-10 border border-[var(--color-border)] rounded-lg p-6 bg-[var(--color-surface)]">
      <h2 className="text-xl font-bold font-mono text-[var(--color-text)] mb-4">
        Comparison Summary
      </h2>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--color-border)]">
              <th className="text-left py-2 px-3 font-mono text-[var(--color-text-muted)]">Option</th>
              <th className="text-left py-2 px-3 font-mono text-[var(--color-text-muted)]">Pros</th>
              <th className="text-left py-2 px-3 font-mono text-[var(--color-text-muted)]">Cons</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-[var(--color-border-dim)]">
              <td className="py-2 px-3 font-mono text-[var(--color-accent)]">1. Column Swap Toggle</td>
              <td className="py-2 px-3 text-[var(--color-text-muted)]">
                Simple, persistent, minimal UI
              </td>
              <td className="py-2 px-3 text-[var(--color-text-muted)]">
                Toggle may be hard to discover
              </td>
            </tr>
            <tr className="border-b border-[var(--color-border-dim)]">
              <td className="py-2 px-3 font-mono text-[var(--color-accent)]">2. Separate Routes</td>
              <td className="py-2 px-3 text-[var(--color-text-muted)]">
                Clear URLs, shareable links
              </td>
              <td className="py-2 px-3 text-[var(--color-text-muted)]">
                Duplicate content, SEO concerns
              </td>
            </tr>
            <tr className="border-b border-[var(--color-border-dim)]">
              <td className="py-2 px-3 font-mono text-[var(--color-accent)]">3. Landing Chooser</td>
              <td className="py-2 px-3 text-[var(--color-text-muted)]">
                User declares expertise, clear flow
              </td>
              <td className="py-2 px-3 text-[var(--color-text-muted)]">
                Extra click before content
              </td>
            </tr>
            <tr>
              <td className="py-2 px-3 font-mono text-[var(--color-accent)]">4. Smart Cards</td>
              <td className="py-2 px-3 text-[var(--color-text-muted)]">
                Clear intent, no extra clicks after choice
              </td>
              <td className="py-2 px-3 text-[var(--color-text-muted)]">
                Duplicate home page cards
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}

/**
 * Main client component for the UX prototype
 */
export function UxPrototypeClient() {
  const { direction, resetToDefault } = useDirection()

  const handleReset = () => {
    resetToDefault()
  }

  return (
    <div className="space-y-8">
      {/* Global controls */}
      <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-4">
        <div className="text-sm font-mono text-[var(--color-text-muted)]">
          Current global direction:{" "}
          <span className="text-[var(--color-accent)]">
            {direction === "git-to-jj" ? "ZIO → Cats Effect" : "Cats Effect → ZIO"}
          </span>
        </div>
        <button
          type="button"
          onClick={handleReset}
          className="px-3 py-1 text-xs font-mono border border-[var(--color-border)] rounded hover:bg-[var(--color-surface-hover)] min-h-[36px]"
        >
          Reset Direction
        </button>
      </div>

      {/* Option 1 */}
      <section>
        <Option1ColumnSwap />
      </section>

      {/* Option 2 */}
      <section>
        <Option2SeparateRoutes />
      </section>

      {/* Option 3 */}
      <section>
        <Option3LandingChooser />
      </section>

      {/* Option 4 */}
      <section>
        <Option4SmartCards />
      </section>

      {/* Comparison table */}
      <ComparisonTable />

      {/* Instructions */}
      <div className="border border-[var(--color-border-dim)] border-dashed rounded-lg p-4 bg-[var(--color-bg)]">
        <p className="text-sm font-mono text-[var(--color-text-muted)]">
          <span className="text-[var(--color-accent)]">Tip:</span> Toggle the direction using any option above to see how each approach updates the comparison. Your preference persists across all options.
        </p>
      </div>
    </div>
  )
}
