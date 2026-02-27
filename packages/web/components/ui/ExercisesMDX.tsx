"use client"

import { useExercises } from "../../contexts/SandboxConfigContext"
import { ExerciseSection } from "./ExerciseSection"

/**
 * MDX wrapper for ExerciseSection.
 *
 * Reads exercises and kataId from SandboxConfigContext.
 * Renders nothing if no exercises are available for the current step.
 */
export function ExercisesMDX() {
  const exerciseData = useExercises()

  if (!exerciseData) {
    return null
  }

  return <ExerciseSection exercises={exerciseData.exercises} kataId={exerciseData.kataId} />
}
