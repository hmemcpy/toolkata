"use client"

import { useEffect, useRef, useState } from "react"

/**
 * Adjust rate limit request parameters.
 */
export interface AdjustRateLimitParams {
  readonly windowDuration?: number
  readonly maxRequests?: number
}

/**
 * Props for AdjustRateLimitModal.
 */
interface AdjustRateLimitModalProps {
  readonly isOpen: boolean
  readonly onClose: () => void
  readonly onSubmit: (params: AdjustRateLimitParams) => void
  readonly initialValues?: AdjustRateLimitParams
  readonly isLoading?: boolean
  readonly clientId: string
}

/**
 * AdjustRateLimitModal component.
 *
 * Modal dialog for adjusting rate limit parameters for a specific client.
 * Features:
 * - Keyboard support (Escape to close, Enter to submit)
 * - Focus trap when open
 * - Current limits display (read-only - actual limits are global)
 * - Note: Adjust is primarily for resetting counters since limits are global
 *
 * @example
 * ```tsx
 * <AdjustRateLimitModal
 *   isOpen={showAdjustModal}
 *   clientId={selectedClientId}
 *   onClose={() => setShowAdjustModal(false)}
 *   onSubmit={(params) => handleAdjust(selectedClientId, params)}
 *   initialValues={{ windowDuration: 3600, maxRequests: 100 }}
 * />
 * ```
 */
export function AdjustRateLimitModal(props: AdjustRateLimitModalProps) {
  const { isOpen, onClose, onSubmit, initialValues, isLoading, clientId } = props

  const [windowDuration, setWindowDuration] = useState(initialValues?.windowDuration?.toString() ?? "")
  const [maxRequests, setMaxRequests] = useState(initialValues?.maxRequests?.toString() ?? "")

  const modalRef = useRef<HTMLDivElement>(null)
  const windowDurationInputRef = useRef<HTMLInputElement>(null)

  // Focus first input when modal opens
  useEffect(() => {
    if (isOpen && windowDurationInputRef.current) {
      windowDurationInputRef.current.focus()
    }
  }, [isOpen])

  // Focus trap when modal is open
  useEffect(() => {
    if (!isOpen) return

    const handleTabKey = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return

      const focusableElements = modalRef.current?.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      )

      if (!focusableElements || focusableElements.length === 0) return

      const firstElement = focusableElements[0] as HTMLElement
      const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          e.preventDefault()
          lastElement.focus()
        }
      } else {
        if (document.activeElement === lastElement) {
          e.preventDefault()
          firstElement.focus()
        }
      }
    }

    document.addEventListener("keydown", handleTabKey)
    return () => {
      document.removeEventListener("keydown", handleTabKey)
    }
  }, [isOpen])

  // Handle Escape key to close
  useEffect(() => {
    if (!isOpen) return

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose()
      }
    }

    document.addEventListener("keydown", handleEscape)
    return () => {
      document.removeEventListener("keydown", handleEscape)
    }
  }, [isOpen, onClose])

  // Handle form submission
  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    // Build params object conditionally to avoid exactOptionalPropertyTypes issues
    let params: AdjustRateLimitParams = {}

    // Only include fields that have values
    if (windowDuration !== "") {
      const duration = Number.parseInt(windowDuration, 10)
      if (!Number.isNaN(duration)) {
        params = { ...params, windowDuration: duration }
      }
    }

    if (maxRequests !== "") {
      const requests = Number.parseInt(maxRequests, 10)
      if (!Number.isNaN(requests)) {
        params = { ...params, maxRequests: requests }
      }
    }

    onSubmit(params)
  }

  // Handle close and reset form
  function handleClose() {
    setWindowDuration(initialValues?.windowDuration?.toString() ?? "")
    setMaxRequests(initialValues?.maxRequests?.toString() ?? "")
    onClose()
  }

  // Don't render if not open
  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
      onClick={handleClose}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          handleClose()
        }
      }}
      role="presentation"
      style={{ cursor: "pointer" }}
    >
      <div
        ref={modalRef}
        className="w-full max-w-md bg-[var(--color-surface)] border border-[var(--color-border)] rounded shadow-lg"
        role="dialog"
        aria-modal="true"
        aria-labelledby="adjust-modal-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--color-border)]">
          <h2 id="adjust-modal-title" className="text-lg font-semibold font-mono text-[var(--color-text)]">
            Adjust Rate Limit
          </h2>
          <button
            type="button"
            onClick={handleClose}
            className="text-[var(--color-text-muted)] hover:text-[var(--color-text)] focus-visible:outline-none focus-visible:ring-[var(--focus-ring)]"
            aria-label="Close modal"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-4">
          <p className="text-sm text-[var(--color-text-muted)] mb-4">
            Adjust rate limit parameters for client:{" "}
            <code className="px-2 py-1 bg-[var(--color-bg)] border border-[var(--color-border)] rounded text-xs font-mono text-[var(--color-accent)]">
              {clientId}
            </code>
          </p>

          <div className="text-xs text-[var(--color-text-dim)] mb-4 p-3 bg-[var(--color-bg)] border border-[var(--color-border)] rounded">
            <strong className="text-[var(--color-text-muted)]">Note:</strong> This operation resets the client's
            rate limit counters. Actual limits are configured globally on the server.
          </div>

          <form onSubmit={handleSubmit} id="adjust-rate-limit-form">
            {/* Window Duration */}
            <div className="mb-4">
              <label htmlFor="windowDuration" className="block text-sm font-mono text-[var(--color-text)] mb-2">
                Window Duration (seconds)
              </label>
              <input
                ref={windowDurationInputRef}
                id="windowDuration"
                type="number"
                min="1"
                value={windowDuration}
                onChange={(e) => setWindowDuration(e.target.value)}
                placeholder="3600"
                className="w-full px-3 py-2 text-sm font-mono bg-[var(--color-bg)] border border-[var(--color-border)] rounded text-[var(--color-text)] placeholder-[var(--color-text-dim)] focus-visible:outline-none focus-visible:ring-[var(--focus-ring)] focus-visible:border-[var(--color-accent)]"
                disabled={isLoading}
              />
              <p className="mt-1 text-xs text-[var(--color-text-dim)]">
                Duration of the rate limit window in seconds (e.g., 3600 = 1 hour)
              </p>
            </div>

            {/* Max Requests */}
            <div className="mb-4">
              <label htmlFor="maxRequests" className="block text-sm font-mono text-[var(--color-text)] mb-2">
                Max Requests (for display)
              </label>
              <input
                id="maxRequests"
                type="number"
                min="1"
                value={maxRequests}
                onChange={(e) => setMaxRequests(e.target.value)}
                placeholder="100"
                className="w-full px-3 py-2 text-sm font-mono bg-[var(--color-bg)] border border-[var(--color-border)] rounded text-[var(--color-text)] placeholder-[var(--color-text-dim)] focus-visible:outline-none focus-visible:ring-[var(--focus-ring)] focus-visible:border-[var(--color-accent)]"
                disabled={isLoading}
              />
              <p className="mt-1 text-xs text-[var(--color-text-dim)]">
                Maximum requests per window (actual limit is server-configured)
              </p>
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-[var(--color-border)]">
          <button
            type="button"
            onClick={handleClose}
            disabled={isLoading}
            className="px-4 py-2 text-sm font-mono border border-[var(--color-border)] rounded text-[var(--color-text)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] transition-colors focus-visible:outline-none focus-visible:ring-[var(--focus-ring)] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="adjust-rate-limit-form"
            disabled={isLoading}
            className="px-4 py-2 text-sm font-mono bg-[var(--color-accent)] text-black rounded hover:bg-[var(--color-accent-hover)] transition-colors focus-visible:outline-none focus-visible:ring-[var(--focus-ring)] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  )
}
