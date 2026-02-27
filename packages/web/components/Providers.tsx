"use client"

import { KataProgressProvider } from "../contexts/KataProgressContext"
import type { ReactNode } from "react"

export interface ProvidersProps {
  readonly children: ReactNode
}

/**
 * Providers - Client component wrapper for app-level providers.
 *
 * Currently provides:
 * - KataProgressProvider: For kata exercise progress tracking
 */
export function Providers({ children }: ProvidersProps): ReactNode {
  return (
    <KataProgressProvider>
      {children}
    </KataProgressProvider>
  )
}
