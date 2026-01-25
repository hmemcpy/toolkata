/**
 * ShrinkingLayout - Client wrapper that shrinks main content when sidebar is open.
 *
 * On desktop viewports (lg+, 1024px+), applies a right margin equal to the
 * sidebar width when the terminal sidebar is open. This creates a "shrinking"
 * layout effect where content remains accessible while the sidebar is visible.
 *
 * Features:
 * - Reads isOpen from TerminalContext
 * - Applies margin-right only on lg+ breakpoint
 * - Smooth transition animation for margin changes
 * - Respects prefers-reduced-motion
 *
 * @example
 * ```tsx
 * import { ShrinkingLayout } from "@/components/ui/ShrinkingLayout"
 *
 * export function StepPage() {
 *   return (
 *     <ShrinkingLayout>
 *       <main id="main-content">
 *         {/* Step content * /}
 *       </main>
 *     </ShrinkingLayout>
 *   )
 * }
 * ```
 */

"use client"

import type { ReactNode } from "react"
import { useTerminalContext } from "../../contexts/TerminalContext"

/**
 * Props for ShrinkingLayout component.
 */
export interface ShrinkingLayoutProps {
  /**
   * Child elements to wrap with shrinking behavior.
   */
  readonly children: ReactNode
}

/**
 * ShrinkingLayout component.
 *
 * Applies a right margin to children on desktop when sidebar is open.
 * This allows the main content to "shrink" and make room for the sidebar
 * while remaining interactive.
 *
 * Does NOT apply margin when:
 * - Sandbox is disabled (e.g., cats-zio uses Scastie, no terminal sidebar)
 * - Sandbox config is not yet loaded (prevents layout shift on initial render)
 */
export function ShrinkingLayout({ children }: ShrinkingLayoutProps): ReactNode {
  const { isOpen, sidebarWidth, sandboxConfig } = useTerminalContext()

  // Don't apply margin if sandbox is disabled or config not yet loaded
  const sandboxEnabled = sandboxConfig !== undefined && sandboxConfig.enabled !== false
  const shouldShrink = isOpen && sandboxEnabled

  return (
    <div
      className="transition-[margin] duration-[var(--transition-sidebar)] ease-in-out"
      style={{ marginRight: shouldShrink ? `${sidebarWidth}px` : 0 }}
    >
      {children}
    </div>
  )
}
