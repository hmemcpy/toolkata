"use client"

import { createContext, useContext, useMemo, type ReactNode } from "react"
import type { SandboxConfig } from "../components/ui/InteractiveTerminal"
import type { Exercise } from "../lib/content/schemas"

/**
 * Exercise data passed from server to context for MDX components.
 */
export interface ExerciseData {
  readonly exercises: readonly Exercise[]
  readonly kataId: string
}

/**
 * SandboxConfigContextValue - Lightweight config for per-TryIt terminals.
 */
export interface SandboxConfigContextValue {
  readonly toolPair: string
  readonly sandboxConfig: SandboxConfig | undefined
  readonly authToken: string | null
}

const SandboxConfigContext = createContext<SandboxConfigContextValue | null>(null)

/**
 * Separate context for exercise data (avoids unnecessary re-renders).
 */
const ExerciseContext = createContext<ExerciseData | null>(null)

export interface SandboxConfigProviderProps {
  readonly toolPair: string
  readonly sandboxConfig?: SandboxConfig | undefined
  readonly authToken: string | null
  readonly exerciseData?: ExerciseData | undefined
  readonly children: ReactNode
}

/**
 * SandboxConfigProvider - Provides sandbox config and auth token to TryIt components.
 */
export function SandboxConfigProvider({
  toolPair,
  sandboxConfig,
  authToken,
  exerciseData,
  children,
}: SandboxConfigProviderProps) {
  const value = useMemo<SandboxConfigContextValue>(
    () => ({ toolPair, sandboxConfig, authToken }),
    [toolPair, sandboxConfig, authToken],
  )

  return (
    <SandboxConfigContext.Provider value={value}>
      <ExerciseContext.Provider value={exerciseData ?? null}>
        {children}
      </ExerciseContext.Provider>
    </SandboxConfigContext.Provider>
  )
}

/**
 * useSandboxConfig - Access sandbox config and auth token.
 */
export function useSandboxConfig(): SandboxConfigContextValue {
  const context = useContext(SandboxConfigContext)

  if (!context) {
    throw new Error(
      "useSandboxConfig must be used within a SandboxConfigProvider. " +
        "Wrap your component tree with <SandboxConfigProvider>.",
    )
  }

  return context
}

/**
 * useExercises - Access exercise data for the current step.
 * Returns null if no exercises are configured.
 */
export function useExercises(): ExerciseData | null {
  return useContext(ExerciseContext)
}
