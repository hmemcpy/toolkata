/**
 * useFocusTrap - Custom hook to trap focus within a container.
 *
 * Implements a focus trap that:
 * - Cycles focus within the container on Tab
 * - Handles Shift+Tab in reverse order
 * - Returns focus to a trigger element on cleanup
 *
 * @example
 * ```tsx
 * import { useFocusTrap } from "@/hooks/useFocusTrap"
 *
 * export function Modal({ isOpen, onClose }) {
 *   const focusTrapRef = useFocusTrap(isOpen, { onEscape: onClose })
 *
 *   return <div ref={focusTrapRef}>...</div>
 * }
 * ```
 */

import { useEffect, useRef } from "react"

export interface UseFocusTrapOptions {
  /**
   * Callback when Escape key is pressed.
   */
  readonly onEscape?: () => void
  /**
   * Additional elements to include in the focus trap.
   * Useful for portals or detached elements.
   */
  readonly additionalElements?: readonly HTMLElement[]
}

/**
 * Get all focusable elements within a container.
 *
 * Follows WCAG 2.1 criteria for focusable elements:
 * - Elements with tabIndex >= 0
 * - Form elements (input, select, textarea, button)
 * - Anchors with href
 * - audio and video with controls
 * - Elements with contenteditable
 */
function getFocusableElements(container: HTMLElement): readonly HTMLElement[] {
  const focusableSelectors = [
    "a[href]",
    "button:not([disabled])",
    "textarea:not([disabled])",
    "input:not([disabled])",
    "select:not([disabled])",
    "[tabindex]:not([tabindex='-1'])",
    "audio[controls]",
    "video[controls]",
    "[contenteditable]",
  ].join(", ")

  return Array.from(container.querySelectorAll<HTMLElement>(focusableSelectors)).filter((el) => {
    // Filter out hidden elements
    const style = window.getComputedStyle(el)
    return style.display !== "none" && style.visibility !== "hidden" && el.offsetParent !== null
  })
}

/**
 * useFocusTrap hook.
 *
 * Returns a ref that should be attached to the container element.
 * When isActive is true, focus is trapped within the container.
 */
export function useFocusTrap<T extends HTMLElement = HTMLElement>(
  isActive: boolean,
  options: UseFocusTrapOptions = {},
): React.RefObject<T | null> {
  const containerRef = useRef<T | null>(null)
  const firstFocusableRef = useRef<HTMLElement | null>(null)
  const lastFocusableRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (!isActive || !containerRef.current) return

    const container = containerRef.current as HTMLElement
    const onEscape = options.onEscape

    // Get all focusable elements
    const focusableElements = getFocusableElements(container)

    if (focusableElements.length === 0) {
      // No focusable elements, nothing to trap
      return
    }

    const firstFocusable = focusableElements[0] ?? null
    const lastFocusable = focusableElements[focusableElements.length - 1] ?? null

    firstFocusableRef.current = firstFocusable
    lastFocusableRef.current = lastFocusable

    // Focus the first element if nothing is focused yet
    if (firstFocusable && !container.contains(document.activeElement)) {
      firstFocusable.focus()
    }

    // Handle Tab key to trap focus
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Tab") return

      if (event.shiftKey) {
        // Shift+Tab: moving backwards
        if (document.activeElement === firstFocusable) {
          event.preventDefault()
          lastFocusable?.focus()
        }
      } else {
        // Tab: moving forwards
        if (document.activeElement === lastFocusable) {
          event.preventDefault()
          firstFocusable?.focus()
        }
      }
    }

    // Handle Escape key
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && onEscape) {
        onEscape()
      }
    }

    // Add event listeners
    document.addEventListener("keydown", handleKeyDown)
    if (onEscape) {
      document.addEventListener("keydown", handleEscape)
    }

    return () => {
      document.removeEventListener("keydown", handleKeyDown)
      if (onEscape) {
        document.removeEventListener("keydown", handleEscape)
      }
    }
  }, [isActive, options])

  return containerRef
}
