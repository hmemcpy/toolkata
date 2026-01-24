/**
 * SplitPane - Generic vertical split container with draggable divider.
 *
 * Features:
 * - Draggable divider between top/bottom panes
 * - Collapse toggle button on divider
 * - Min heights enforced for both panes
 * - Controlled height and collapsed state
 *
 * @example
 * ```tsx
 * <SplitPane
 *   topContent={<Terminal />}
 *   bottomContent={<InfoPanel />}
 *   bottomHeightPercent={30}
 *   onBottomHeightChange={setHeight}
 *   isBottomCollapsed={collapsed}
 *   onBottomCollapsedChange={setCollapsed}
 * />
 * ```
 */

"use client"

import { useCallback, useRef, useState, type ReactNode } from "react"

const MIN_TOP_HEIGHT = 150
const MIN_BOTTOM_HEIGHT = 100

export interface SplitPaneProps {
  /**
   * Content for the top pane.
   */
  readonly topContent: ReactNode

  /**
   * Content for the bottom pane.
   */
  readonly bottomContent: ReactNode

  /**
   * Height of the bottom pane as a percentage (0-100).
   */
  readonly bottomHeightPercent: number

  /**
   * Callback when bottom pane height changes.
   */
  readonly onBottomHeightChange: (percent: number) => void

  /**
   * Whether the bottom pane is collapsed.
   */
  readonly isBottomCollapsed: boolean

  /**
   * Callback when bottom pane collapsed state changes.
   */
  readonly onBottomCollapsedChange: (collapsed: boolean) => void
}

/**
 * SplitPane component.
 *
 * A vertical split container with a draggable divider between two panes.
 * The bottom pane can be collapsed via a toggle button on the divider.
 */
export function SplitPane({
  topContent,
  bottomContent,
  bottomHeightPercent,
  onBottomHeightChange,
  isBottomCollapsed,
  onBottomCollapsedChange,
}: SplitPaneProps): ReactNode {
  const containerRef = useRef<HTMLDivElement>(null)
  const [isDragging, setIsDragging] = useState(false)

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging || !containerRef.current) return

      const containerRect = containerRef.current.getBoundingClientRect()
      const containerHeight = containerRect.height

      // Calculate bottom height from mouse position
      const mouseY = e.clientY - containerRect.top
      const bottomHeight = containerHeight - mouseY

      // Enforce minimum heights
      if (bottomHeight < MIN_BOTTOM_HEIGHT || mouseY < MIN_TOP_HEIGHT) {
        return
      }

      // Convert to percentage
      const percent = (bottomHeight / containerHeight) * 100
      onBottomHeightChange(Math.min(Math.max(percent, 10), 60))
    },
    [isDragging, onBottomHeightChange],
  )

  const handleMouseUp = useCallback(() => {
    setIsDragging(false)
  }, [])

  // Add/remove document event listeners for dragging
  const handleDragStart = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      setIsDragging(true)

      const handleMove = (ev: MouseEvent) => handleMouseMove(ev)
      const handleUp = () => {
        handleMouseUp()
        document.removeEventListener("mousemove", handleMove)
        document.removeEventListener("mouseup", handleUp)
      }

      document.addEventListener("mousemove", handleMove)
      document.addEventListener("mouseup", handleUp)
    },
    [handleMouseMove, handleMouseUp],
  )

  const toggleCollapsed = useCallback(() => {
    onBottomCollapsedChange(!isBottomCollapsed)
  }, [isBottomCollapsed, onBottomCollapsedChange])

  return (
    <div ref={containerRef} className={`flex h-full flex-col ${isDragging ? "select-none" : ""}`}>
      {/* Top pane */}
      <div
        className="min-h-0 overflow-hidden"
        style={{
          flex: isBottomCollapsed ? "1 1 auto" : `1 1 ${100 - bottomHeightPercent}%`,
        }}
      >
        {topContent}
      </div>

      {/* Divider */}
      <div
        className="relative flex h-6 shrink-0 cursor-ns-resize items-center justify-center border-y border-[var(--color-border)] bg-[var(--color-surface-hover)] transition-colors hover:bg-[var(--color-border)]"
        onMouseDown={handleDragStart}
        role="separator"
        aria-orientation="horizontal"
        aria-label="Resize panel divider"
        tabIndex={0}
      >
        {/* Collapse/Expand toggle button */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            toggleCollapsed()
          }}
          className="flex h-5 w-8 items-center justify-center rounded text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-surface)] hover:text-[var(--color-text)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]"
          aria-label={isBottomCollapsed ? "Expand info panel" : "Collapse info panel"}
          aria-expanded={!isBottomCollapsed}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={`h-4 w-4 transition-transform ${isBottomCollapsed ? "" : "rotate-180"}`}
          >
            <title>{isBottomCollapsed ? "Expand" : "Collapse"}</title>
            <polyline points="18 15 12 9 6 15" />
          </svg>
        </button>
      </div>

      {/* Bottom pane */}
      {!isBottomCollapsed && (
        <div
          className="min-h-0 overflow-hidden"
          style={{
            flex: `0 0 ${bottomHeightPercent}%`,
          }}
        >
          {bottomContent}
        </div>
      )}
    </div>
  )
}
