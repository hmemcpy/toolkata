"use client"

import { KataProgressProvider } from "../contexts/KataProgressContext"
import type { ReactNode } from "react"

/**
 * Props for Providers component
 */
export interface ProvidersProps {
  /**
   * The tool pairing slug (e.g., "jj-git").
   */
  readonly toolPair: string

  /**
   * JWT auth token for tiered rate limiting.
   */
  readonly authToken?: string | null

  /**
   * React children to receive provider contexts.
   */
  readonly children: ReactNode
}

/**
 * Providers - Client component wrapper for app-level providers.
 *
 * This component isolates client-side provider boundaries from server components.
 *
 * Currently provides:
 * - KataProgressProvider: For kata progress state and exercise completion tracking
 *
 * Note: Terminal is now inline per-step (InlineTerminalProvider in StepPageClientWrapper),
 * not layout-level. Sidebar components have been removed.
 */
export function Providers({ toolPair: _toolPair, authToken: _authToken, children }: ProvidersProps): ReactNode {
  return (
    <KataProgressProvider>
      {children}
    </KataProgressProvider>
  )
}
