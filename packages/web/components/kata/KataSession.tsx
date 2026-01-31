"use client"

import { useEffect, useState, type JSX } from "react"
import { useRouter } from "next/navigation"
import { useKataProgress } from "../../contexts/KataProgressContext"
import { useTerminalContext } from "../../contexts/TerminalContext"
import { useStepProgress } from "../../hooks/useStepProgress"
import type { KataFrontmatter } from "../../lib/content/schemas"
import { validateExercise, ValidationError } from "../../services/kata-validation"
import {
  ValidationFeedback,
  type ValidationState,
} from "./ValidationFeedback"

/**
 * Props for the KataSession component.
 */
export interface KataSessionProps {
  /**
   * The tool pairing slug (e.g., "jj-git").
   */
  readonly toolPair: string

  /**
   * Kata ID (e.g., "1", "2", etc.).
   */
  readonly kataId: string

  /**
   * Kata frontmatter with title, exercises, etc.
   */
  readonly frontmatter: KataFrontmatter

  /**
   * MDX content for the Kata (scenario and exercises).
   */
  readonly children: JSX.Element
}

/**
 * Format seconds to MM:SS display.
 */
function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
}

/**
 * KataSession - Individual Kata practice interface.
 *
 * Displays:
 * - Header: Kata number, title, timer, attempt counter
 * - Progress bar showing exercise completion within Kata
 * - Scenario section (collapsible)
 * - Exercise list with current exercise highlighted
 * - MDX content for current exercise
 * - "Validate My Solution" button
 * - "Reset Sandbox" button
 * - Exit button (returns to landing)
 * - Keyboard shortcut: Esc to exit
 *
 * Features:
 * - Tracks attempt count per exercise
 * - Shows real-time validation feedback
 * - Progress bar updates as exercises complete
 * - Timer shows session duration
 * - Reset sandbox preserves exercise progress
 *
 * @example
 * ```tsx
 * import { KataSession } from "@/components/kata/KataSession"
 *
 * export function KataSessionPage({ kata }) {
 *   return (
 *     <KataSession
 *       toolPair="jj-git"
 *       kataId="1"
 *       frontmatter={kata.frontmatter}
 *     >
 *       <MDXRemote source={kata.content} components={mdxComponents} />
 *     </KataSession>
 *   )
 * }
 * ```
 */
export function KataSession({
  toolPair,
  kataId,
  frontmatter,
  children,
}: KataSessionProps): JSX.Element {
  const router = useRouter()
  const { isStepComplete } = useStepProgress(toolPair, 12)
  const { sessionId } = useTerminalContext()

  // Kata progress context
  const {
    isKataUnlocked,
    kataStats,
    startKata,
    recordAttempt,
    completeExercise,
    completeKata,
  } = useKataProgress()

  // Session state
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0)
  const [validationState, setValidationState] = useState<ValidationState>("idle")
  const [validationHint, setValidationHint] = useState<string | null>(null)
  const [sessionSeconds, setSessionSeconds] = useState(0)

  // Derived state
  const exercises = frontmatter.exercises
  const currentExercise = exercises[currentExerciseIndex] ?? null
  const step12Completed = isStepComplete(12)
  const isUnlocked = isKataUnlocked(kataId, step12Completed)

  // Attempt tracking
  const kataStatsData = kataStats[kataId]
  const totalAttempts = kataStatsData?.attempts ?? 0
  const exerciseAttempts = currentExercise
    ? (kataStatsData?.exerciseAttempts[currentExercise.id] ?? 0)
    : 0

  // Progress calculation
  const completedExercises = kataStatsData?.exercisesCompleted ?? []
  const progressPercent = (completedExercises.length / exercises.length) * 100

  // Redirect to landing if Kata is locked
  useEffect(() => {
    if (!isUnlocked) {
      router.push(`/${toolPair}/kata?locked=true`)
    }
  }, [isUnlocked, toolPair, router])

  // Start Kata session on mount
  useEffect(() => {
    startKata(kataId)
  }, [kataId, startKata])

  // Session timer
  useEffect(() => {
    const interval = setInterval(() => {
      setSessionSeconds((prev) => prev + 1)
    }, 1000)

    return () => clearInterval(interval)
  }, [])

  // Keyboard shortcut: Esc to exit
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault()
        router.push(`/${toolPair}/kata`)
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [toolPair, router])

  // Validate exercise solution
  const handleValidate = async () => {
    if (!currentExercise || validationState === "validating") {
      return
    }

    // Check if terminal has an active session
    if (!sessionId) {
      setValidationState("error")
      setValidationHint("No active terminal session. Please wait for the terminal to connect.")
      return
    }

    setValidationState("validating")
    setValidationHint(null)

    try {
      // Run validation against the sandbox
      const result = await validateExercise(currentExercise, sessionId)

      // Record the attempt (always record before completion)
      recordAttempt(currentExercise.id, result.success)

      if (result.success) {
        setValidationState("success")
        setValidationHint(result.hint)

        // Mark exercise as completed
        completeExercise(kataId, currentExercise.id)

        // Check if this was the last exercise
        const isLastExercise = currentExerciseIndex === exercises.length - 1

        if (isLastExercise) {
          // Complete the Kata with final attempt count
          const finalAttempts = totalAttempts + 1
          setTimeout(() => {
            completeKata(kataId, finalAttempts)
            router.push(`/${toolPair}/kata`)
          }, 1500)
        } else {
          // Move to next exercise after delay
          setTimeout(() => {
            setCurrentExerciseIndex((prev) => prev + 1)
            setValidationState("idle")
            setValidationHint(null)
          }, 1500)
        }
      } else {
        setValidationState("error")
        setValidationHint(result.hint)
      }
    } catch (err: unknown) {
      let hint = "Validation failed. Try again."
      if (err instanceof ValidationError) {
        if (err.cause === "SandboxUnavailable") {
          hint = "Sandbox is temporarily unavailable. Please try again later."
        } else if (err.cause === "TimeoutError") {
          hint = "Validation timed out. The command took too long to execute. Try again."
        } else if (err.cause === "NetworkError") {
          hint = "Connection error. Please check your network and try again."
        }
      }
      setValidationState("error")
      setValidationHint(hint)
      // Record failed attempt, but NOT for timeouts (per spec P6.2)
      if (currentExercise && !(err instanceof ValidationError && err.cause === "TimeoutError")) {
        recordAttempt(currentExercise.id, false)
      }
    }
  }

  // Exit to landing
  const handleExit = () => {
    router.push(`/${toolPair}/kata`)
  }

  // Reset sandbox - clears validation state
  // Note: Full terminal reset requires accessing the terminal ref via context
  // For now, users can reset via the terminal sidebar's Reset button
  const handleResetSandbox = () => {
    setValidationState("idle")
    setValidationHint(null)
  }

  // Jump to specific exercise
  const handleJumpToExercise = (index: number) => {
    if (index < currentExerciseIndex) {
      // Only allow jumping backwards
      setCurrentExerciseIndex(index)
      setValidationState("idle")
      setValidationHint(null)
    }
  }

  if (!isUnlocked) {
    return (
      <div className="min-h-screen bg-[var(--color-bg)] flex items-center justify-center">
        <div className="text-center">
          <p className="text-sm text-[var(--color-text-muted)] font-mono">
            Complete previous Kata to unlock
          </p>
        </div>
      </div>
    )
  }

  const kataNum = Number.parseInt(kataId, 10)

  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      {/* Kata Header */}
      <header className="border-b border-[var(--color-border)] sticky top-0 bg-[var(--color-bg)] z-10">
        <div className="mx-auto max-w-5xl px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between gap-4">
            {/* Left: Exit button + Kata info */}
            <div className="flex items-center gap-4 flex-1 min-w-0">
              <button
                type="button"
                onClick={handleExit}
                className="text-xs font-mono text-[var(--color-text-muted)] hover:text-[var(--color-accent)] focus-visible:outline-none focus-visible:ring-[var(--focus-ring)] transition-colors flex-shrink-0"
                aria-label="Exit Kata and return to landing"
              >
                ← Exit
              </button>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm text-[var(--color-accent)]">
                    {kataNum}
                  </span>
                  <span className="text-sm font-mono text-[var(--color-text-muted)]">
                    /
                  </span>
                  <span className="text-sm font-mono text-[var(--color-text-muted)]">
                    7
                  </span>
                  <span className="text-sm text-[var(--color-text-primary)] font-semibold truncate">
                    {frontmatter.title}
                  </span>
                </div>
              </div>
            </div>

            {/* Right: Timer + Attempts */}
            <div className="flex items-center gap-4 flex-shrink-0">
              <div className="text-xs font-mono text-[var(--color-text-dim)]">
                {formatTime(sessionSeconds)}
              </div>
              <div className="text-xs font-mono text-[var(--color-text-dim)]">
                {totalAttempts > 0 && (
                  <span>
                    Attempt {totalAttempts + 1}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Progress bar */}
          <div className="mt-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-mono text-[var(--color-text-dim)]">
                {completedExercises.length} / {exercises.length} exercises
              </span>
              <span className="text-xs font-mono text-[var(--color-text-dim)]">
                {Math.round(progressPercent)}%
              </span>
            </div>
            <div className="w-full h-1 bg-[var(--color-border)] rounded overflow-hidden">
              <div
                className="h-full bg-[var(--color-accent)] transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Left: Exercise list */}
          <aside className="lg:col-span-1">
            <div className="sticky top-24">
              <h2 className="text-xs font-mono text-[var(--color-text-dim)] uppercase tracking-wider mb-3">
                Exercises
              </h2>
              <ol className="space-y-1">
                {exercises.map((exercise, index) => {
                  const isCompleted = completedExercises.includes(exercise.id)
                  const isCurrent = index === currentExerciseIndex
                  const isLocked = index > currentExerciseIndex

                  return (
                    <li key={exercise.id}>
                      <button
                        type="button"
                        onClick={() => handleJumpToExercise(index)}
                        disabled={isLocked || isCurrent}
                        className={`
                          w-full text-left px-3 py-2 rounded text-xs font-mono
                          transition-colors focus-visible:outline-none focus-visible:ring-[var(--focus-ring)]
                          ${isCurrent
                            ? "bg-[var(--color-surface)] border border-[var(--color-accent)] text-[var(--color-text-primary)]"
                            : isCompleted
                              ? "text-[var(--color-accent)] hover:bg-[var(--color-surface)]"
                              : isLocked
                                ? "text-[var(--color-text-dim)] cursor-not-allowed opacity-50"
                                : "text-[var(--color-text-muted)] hover:bg-[var(--color-surface)]"
                          }
                        `}
                        aria-current={isCurrent ? "step" : undefined}
                        aria-disabled={isLocked}
                      >
                        <div className="flex items-center gap-2">
                          {isCompleted ? (
                            <svg
                              width="12"
                              height="12"
                              viewBox="0 0 16 16"
                              fill="none"
                              xmlns="http://www.w3.org/2000/svg"
                              aria-hidden="true"
                            >
                              <title>Completed</title>
                              <path
                                d="M3.5 8l3 3 6-6"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            </svg>
                          ) : isLocked ? (
                            <svg
                              width="12"
                              height="12"
                              viewBox="0 0 16 16"
                              fill="none"
                              xmlns="http://www.w3.org/2000/svg"
                              className="text-[var(--color-text-dim)]"
                              aria-hidden="true"
                            >
                              <title>Locked</title>
                              <path
                                d="M4.5 7V5.5a3.5 3.5 0 1 1 7 0V7M4.5 7h7M4.5 7v4.5a1 1 0 0 0 1 1h5a1 1 0 0 0 1-1V7"
                                stroke="currentColor"
                                strokeWidth="1.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            </svg>
                          ) : (
                            <span className="text-[var(--color-text-dim)]">{index + 1}.</span>
                          )}
                          <span className="truncate">{exercise.title}</span>
                        </div>
                      </button>
                    </li>
                  )
                })}
              </ol>
            </div>
          </aside>

          {/* Right: Content + Actions */}
          <div className="lg:col-span-3">
            {/* Validation Feedback */}
            <ValidationFeedback
              state={validationState}
              hint={validationHint}
              isKataComplete={completedExercises.length === exercises.length}
            />

            {/* Exercise content */}
            <div className="mb-6">
              <h3 className="text-sm font-bold font-mono text-[var(--color-text-primary)] mb-2">
                {currentExercise ? (
                  <>Exercise {currentExerciseIndex + 1}: {currentExercise.title}</>
                ) : (
                  <>Exercise {currentExerciseIndex + 1}</>
                )}
              </h3>
              <div className="text-xs text-[var(--color-text-dim)] font-mono mb-4">
                {exerciseAttempts > 0 && (
                  <span>Previous attempts: {exerciseAttempts}</span>
                )}
              </div>

              {/* MDX content (scenario + exercise instructions) */}
              <article className="prose prose-invert max-w-none">
                {children}
              </article>
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-3 border-t border-[var(--color-border)] pt-4">
              <button
                type="button"
                onClick={handleValidate}
                disabled={validationState === "validating" || validationState === "success"}
                className="
                  px-4 py-2 bg-[var(--color-accent)] text-[var(--color-bg)]
                  font-mono text-sm hover:bg-[var(--color-accent-hover)]
                  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]
                  disabled:opacity-50 disabled:cursor-not-allowed transition-colors
                "
              >
                {validationState === "validating" ? "Validating..." : "Validate My Solution"}
              </button>

              <button
                type="button"
                onClick={handleResetSandbox}
                className="
                  px-4 py-2 bg-[var(--color-surface)] border border-[var(--color-border)]
                  text-[var(--color-text-primary)] font-mono text-sm
                  hover:text-[var(--color-accent)] hover:border-[var(--color-accent)]
                  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]
                  transition-colors
                "
              >
                Reset Sandbox
              </button>

              <div className="flex-1" />

              <div className="text-xs text-[var(--color-text-dim)] font-mono hidden sm:block">
                Press <kbd className="px-1.5 py-0.5 bg-[var(--color-surface)] border border-[var(--color-border)] rounded">Esc</kbd> to exit
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
