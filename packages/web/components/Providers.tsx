"use client"

import { DirectionProvider } from "../contexts/DirectionContext"
import { TerminalProvider } from "../contexts/TerminalContext"
import { TerminalSidebar } from "./ui/TerminalSidebar"
import { TerminalToggle } from "./ui/TerminalToggle"
import type { ReactNode } from "react"

/**
 * Props for Providers component
 */
export interface ProvidersProps {
  /**
   * The tool pairing slug (e.g., "jj-git").
   * Passed to DirectionProvider for context initialization.
   */
  readonly toolPair: string

  /**
   * React children to receive provider contexts.
   */
  readonly children: ReactNode
}

/**
 * Providers - Client component wrapper for all app-level providers.
 *
 * This component isolates client-side provider boundaries from server components,
 * keeping layout.tsx as a server component while providing necessary contexts
 * to client components throughout the app.
 *
 * Currently provides:
 * - DirectionProvider: For bidirectional comparison direction state
 * - TerminalProvider: For terminal sidebar state and command execution
 *
 * Also renders:
 * - TerminalSidebar: Desktop sidebar component (fixed overlay)
 * - TerminalToggle: FAB button to toggle terminal
 *
 * Why render sidebar/toggle here?
 * - Both need access to TerminalContext (must be inside TerminalProvider)
 * - Layout-level rendering ensures persistence across navigation
 * - Sidebar overlays content (no grid changes needed to main layout)
 *
 * Why a separate file?
 * - Keeps layout.tsx as a server component (better performance, SEO)
 * - Isolates the client boundary to this wrapper only
 * - Makes it easy to add more providers in the future (theme, auth, etc.)
 *
 * @example
 * ```tsx
 * // In app/[toolPair]/layout.tsx
 * import { Providers } from "@/components/Providers"
 *
 * export default function ToolPairLayout({ children, params }) {
 *   const { toolPair } = params
 *   return (
 *     <Providers toolPair={toolPair}>
 *       {children}
 *     </Providers>
 *   )
 * }
 * ```
 */
export function Providers({ toolPair, children }: ProvidersProps): ReactNode {
  return (
    <DirectionProvider toolPair={toolPair}>
      <TerminalProvider toolPair={toolPair}>
        {children}
        <TerminalSidebar toolPair={toolPair} />
        <TerminalToggle />
      </TerminalProvider>
    </DirectionProvider>
  )
}
