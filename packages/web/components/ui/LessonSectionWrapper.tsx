"use client"

import { useEffect, useState } from "react"
import type { ToolPairing } from "../../content/pairings"
import { LessonCard } from "./LessonCard"
import { useStepProgress } from "../../hooks/useStepProgress"

interface LessonSectionWrapperProps {
  readonly pairingsByCategory: Record<string, readonly ToolPairing[]>
}

/**
 * Client wrapper for the entire lesson section.
 * Shows skeleton during hydration to prevent layout shift.
 */
export function LessonSectionWrapper({ pairingsByCategory }: LessonSectionWrapperProps) {
  const [isHydrated, setIsHydrated] = useState(false)

  useEffect(() => {
    setIsHydrated(true)
  }, [])

  if (!isHydrated) {
    // Show real content (no progress) during hydration - no layout shift
    return (
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
              {pairings.map((pairing) => (
                <LessonCard key={pairing.slug} pairing={pairing} />
              ))}
            </div>
          </div>
        ))}
      </section>
    )
  }

  return (
    <section className="space-y-12">
      {Object.entries(pairingsByCategory).map(([category, pairings]) => (
        <div key={category}>
          {/* Category header styled as section comment */}
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
            {pairings.map((pairing) => (
              <LessonCardWithProgress key={pairing.slug} pairing={pairing} />
            ))}
          </div>
        </div>
      ))}
    </section>
  )
}

/**
 * Individual lesson card with progress from localStorage
 */
function LessonCardWithProgress({ pairing }: { readonly pairing: ToolPairing }) {
  const { completedCount, currentStep } = useStepProgress(pairing.slug, pairing.steps)

  return (
    <LessonCard
      pairing={pairing}
      completedSteps={completedCount}
      currentStep={currentStep}
    />
  )
}
