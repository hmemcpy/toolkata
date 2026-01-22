/**
 * KeyboardShortcutsModal - Modal displaying keyboard shortcuts.
 *
 * Shows all available keyboard shortcuts for the step pages.
 * Can be triggered by pressing "?" or clicking a help button.
 *
 * @example
 * ```tsx
 * <KeyboardShortcutsModal isOpen={true} onClose={() => setIsOpen(false)} />
 * ```
 */

"use client"

import { useEffect } from "react"

export interface KeyboardShortcutsModalProps {
  /**
   * Whether the modal is currently shown.
   */
  readonly isOpen: boolean

  /**
   * Callback when modal is closed.
   */
  readonly onClose: () => void
}

/**
 * KeyboardShortcutsModal component.
 */
export function KeyboardShortcutsModal({ isOpen, onClose }: KeyboardShortcutsModalProps) {
  // Close modal on Escape key
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose()
      }
    }

    document.addEventListener("keydown", handleKeyDown)

    return () => {
      document.removeEventListener("keydown", handleKeyDown)
    }
  }, [isOpen, onClose])

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden"
    } else {
      document.body.style.overflow = ""
    }

    return () => {
      document.body.style.overflow = ""
    }
  }, [isOpen])

  if (!isOpen) return null

  return (
    // biome-ignore lint/a11y/useKeyWithClickEvents: Click handler handled by children with keyboard support
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4"
      onClick={onClose}
      aria-hidden="true"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="keyboard-shortcuts-title"
        className="w-full max-w-lg rounded border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-lg"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            onClose()
          }
        }}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2
            id="keyboard-shortcuts-title"
            className="text-lg font-mono font-medium text-[var(--color-text)]"
          >
            Keyboard Shortcuts
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-[var(--color-text-muted)] transition-colors hover:text-[var(--color-text)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]"
            aria-label="Close keyboard shortcuts"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-6 w-6"
              role="img"
              aria-label="Close icon"
            >
              <title>Close</title>
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <h3 className="mb-2 text-sm font-semibold text-[var(--color-text-muted)]">
              Navigation
            </h3>
            <div className="space-y-2">
              <Shortcut keyName="Previous step" shortcut="←" description="Go to previous step" />
              <Shortcut keyName="Next step" shortcut="→" description="Go to next step" />
            </div>
          </div>

          <div>
            <h3 className="mb-2 text-sm font-semibold text-[var(--color-text-muted)]">Terminal</h3>
            <div className="space-y-2">
              <Shortcut keyName="Toggle terminal" shortcut="t" description="Open/close terminal sidebar" />
              <Shortcut
                keyName="Exit terminal"
                shortcut="Esc"
                description="Exit terminal focus (when terminal is active)"
              />
            </div>
          </div>

          <div>
            <h3 className="mb-2 text-sm font-semibold text-[var(--color-text-muted)]">Other</h3>
            <div className="space-y-2">
              <Shortcut keyName="Show help" shortcut="?" description="Show this help modal" />
              <Shortcut keyName="Close modal" shortcut="Esc" description="Close this modal" />
            </div>
          </div>
        </div>

        <div className="mt-6 text-xs text-[var(--color-text-muted)]">
          Press{" "}
          <kbd className="rounded border border-[var(--color-border)] bg-[var(--color-bg)] px-1.5 py-0.5 font-mono">
            Esc
          </kbd>{" "}
          or click outside to close
        </div>
      </div>
    </div>
  )
}

interface ShortcutProps {
  readonly keyName: string
  readonly shortcut: string
  readonly description: string
}

function Shortcut({ keyName, shortcut, description }: ShortcutProps) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-sm text-[var(--color-text)]">{keyName}</span>
      <div className="flex items-center gap-3">
        <span className="text-xs text-[var(--color-text-muted)]">{description}</span>
        <kbd className="rounded border border-[var(--color-border)] bg-[var(--color-bg)] px-2 py-1 text-sm font-mono text-[var(--color-text)]">
          {shortcut}
        </kbd>
      </div>
    </div>
  )
}
