"use client"

import { useCallback, useState } from "react"
import type { Exercise } from "../../lib/content/schemas"
import { useSandboxConfig } from "../../contexts/SandboxConfigContext"
import { useKataProgress } from "../../contexts/KataProgressContext"
import {
  ValidationFeedback,
  type ValidationState,
} from "../kata/ValidationFeedback"
import { validateExercise } from "../../services/kata-validation"
import { createSession, destroySession } from "../../lib/sandbox-session"

interface ExerciseItemState {
  readonly validationState: ValidationState
  readonly hint: string | null
}

export interface ExerciseSectionProps {
  readonly exercises: readonly Exercise[]
  readonly kataId: string
}

export function ExerciseSection({ exercises, kataId }: ExerciseSectionProps) {
  const { toolPair, sandboxConfig, authToken } = useSandboxConfig()
  const { kataStats, recordAttempt, completeExercise } = useKataProgress()

  const [exerciseStates, setExerciseStates] = useState<Record<string, ExerciseItemState>>({})

  const completedExercises = kataStats[kataId]?.exercisesCompleted ?? []

  const handleValidate = useCallback(
    async (exercise: Exercise) => {
      setExerciseStates((prev) => ({
        ...prev,
        [exercise.id]: { validationState: "validating", hint: null },
      }))

      let sessionId: string | null = null

      try {
        // Create ephemeral session for validation
        const session = await createSession({
          toolPair,
          environment: sandboxConfig?.environment,
          init: sandboxConfig?.init,
          timeout: sandboxConfig?.timeout,
          authToken,
        })
        sessionId = session.sessionId

        const result = await validateExercise(exercise, sessionId)
        recordAttempt(exercise.id, result.success)

        if (result.success) {
          completeExercise(kataId, exercise.id)
          setExerciseStates((prev) => ({
            ...prev,
            [exercise.id]: { validationState: "success", hint: null },
          }))
        } else {
          setExerciseStates((prev) => ({
            ...prev,
            [exercise.id]: {
              validationState: "error",
              hint: result.hint ?? "Not quite right. Try again.",
            },
          }))
        }
      } catch {
        setExerciseStates((prev) => ({
          ...prev,
          [exercise.id]: {
            validationState: "error",
            hint: "Validation failed. Please try again.",
          },
        }))
      } finally {
        // Always destroy the ephemeral session
        if (sessionId) {
          await destroySession(sessionId)
        }
      }
    },
    [toolPair, sandboxConfig, authToken, kataId, recordAttempt, completeExercise],
  )

  const completedCount = completedExercises.length
  const totalCount = exercises.length

  return (
    <section className="mt-12 border-t border-[var(--color-border)] pt-8">
      <div className="mb-6">
        <h2 className="text-xl font-bold font-mono text-white mb-1">Practice Exercises</h2>
        <p className="text-sm text-[var(--color-text-muted)] font-mono">
          {completedCount}/{totalCount} completed
        </p>
      </div>

      <ol className="space-y-4">
        {exercises.map((exercise) => {
          const isCompleted = completedExercises.includes(exercise.id)
          const state = exerciseStates[exercise.id]

          return (
            <li
              key={exercise.id}
              className={`p-4 rounded border font-mono text-sm ${
                isCompleted
                  ? "border-[var(--color-accent)] bg-[var(--color-accent)] bg-opacity-5"
                  : "border-[var(--color-border)] bg-[var(--color-surface)]"
              }`}
            >
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <span
                    className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs ${
                      isCompleted
                        ? "bg-[var(--color-accent)] text-black"
                        : "bg-[var(--color-border)] text-[var(--color-text-muted)]"
                    }`}
                  >
                    {isCompleted ? "\u2713" : exercise.id.split(".")[1]}
                  </span>
                  <span className={isCompleted ? "text-[var(--color-accent)]" : "text-white"}>
                    {exercise.title}
                  </span>
                </div>

                {!isCompleted && (
                  <button
                    type="button"
                    onClick={() => handleValidate(exercise)}
                    disabled={state?.validationState === "validating"}
                    className="flex-shrink-0 px-3 py-1.5 text-xs font-mono rounded border border-[var(--color-accent)] text-[var(--color-accent)] hover:bg-[var(--color-accent)] hover:text-black transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {state?.validationState === "validating" ? "Checking..." : "Validate"}
                  </button>
                )}
              </div>

              {state && state.validationState !== "idle" && !isCompleted && (
                <div className="mt-3">
                  <ValidationFeedback
                    state={state.validationState}
                    hint={state.hint}
                    successMessage="Exercise complete!"
                  />
                </div>
              )}
            </li>
          )
        })}
      </ol>
    </section>
  )
}
