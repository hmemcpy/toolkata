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
 */
export function ShrinkingLayout({ children }: ShrinkingLayoutProps): ReactNode {
  const { isOpen } = useTerminalContext()

  return (
    <div
      className={`transition-[margin] duration-[var(--transition-sidebar)] ease-in-out ${
        isOpen ? "lg:mr-[var(--sidebar-width)]" : ""
      }`}
    >
      {children}
    </div>
  )
}
