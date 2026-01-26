"use client"

import { useCallback, useEffect, useState } from "react"

type SubmitState = "idle" | "submitting" | "success" | "error"

const WEB3FORMS_ACCESS_KEY = process.env["NEXT_PUBLIC_WEB3FORMS_ACCESS_KEY"] ?? ""

const CLOSE_DELAY_SECONDS = 3

export interface ReportBugModalProps {
  readonly isOpen: boolean
  readonly onClose: () => void
  readonly context?: {
    readonly page: string
    readonly step?: string
    readonly error?: string
  }
}

export function ReportBugModal({ isOpen, onClose, context }: ReportBugModalProps) {
  const [description, setDescription] = useState("")
  const [email, setEmail] = useState("")
  const [submitState, setSubmitState] = useState<SubmitState>("idle")
  const [closeCountdown, setCloseCountdown] = useState(CLOSE_DELAY_SECONDS)

  useEffect(() => {
    if (submitState !== "success") {
      setCloseCountdown(CLOSE_DELAY_SECONDS)
      return
    }

    if (closeCountdown <= 0) {
      onClose()
      setSubmitState("idle")
      return
    }

    const timer = setTimeout(() => {
      setCloseCountdown(c => c - 1)
    }, 1000)

    return () => clearTimeout(timer)
  }, [submitState, closeCountdown, onClose])

  const handleBackdropClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget && submitState !== "submitting") {
        onClose()
      }
    },
    [onClose, submitState],
  )

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Escape" && submitState !== "submitting") {
        onClose()
      }
    },
    [onClose, submitState],
  )

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      if (!description.trim()) return

      setSubmitState("submitting")

      const pageUrl = typeof window !== "undefined" ? window.location.href : ""

      const formData: Record<string, string> = {
        access_key: WEB3FORMS_ACCESS_KEY,
        subject: context?.page
          ? `[toolkata] Bug: ${context.page}${context.step ? ` (${context.step})` : ""}`
          : "[toolkata] Bug Report",
        from_name: "toolkata Bug Reporter",
        url: pageUrl,
        description: description.trim(),
      }

      if (email.trim()) {
        formData["email"] = email.trim()
      }

      if (context) {
        if (context.page) formData["page"] = context.page
        if (context.step) formData["step"] = context.step
        if (context.error) formData["error"] = context.error
      }

      try {
        const response = await fetch("https://api.web3forms.com/submit", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(formData),
        })

        if (response.ok) {
          setSubmitState("success")
          setDescription("")
          setEmail("")
        } else {
          setSubmitState("error")
        }
      } catch {
        setSubmitState("error")
      }
    },
    [description, email, context],
  )

  const handleClose = useCallback(() => {
    if (submitState !== "submitting") {
      onClose()
      setSubmitState("idle")
      setDescription("")
      setEmail("")
    }
  }, [submitState, onClose])

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
      onClick={handleBackdropClick}
      onKeyDown={handleKeyDown}
    >
      <div className="relative w-full max-w-lg bg-[var(--color-surface)] border border-[var(--color-border)] rounded shadow-lg">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--color-border)]">
          <div className="flex items-center gap-2">
            <span className="text-[var(--color-warning)]">⚠</span>
            <h2 className="text-sm font-bold font-mono text-[var(--color-text)]">
              Report Bug
            </h2>
          </div>
          <button
            type="button"
            onClick={handleClose}
            disabled={submitState === "submitting"}
            className="text-[var(--color-text-dim)] hover:text-[var(--color-text)] focus-visible:outline-none focus-visible:ring-[var(--focus-ring)] p-1"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {context && (
            <div className="bg-[var(--color-bg)] border border-[var(--color-border)] p-3 text-xs font-mono">
              <div className="text-[var(--color-text-dim)] mb-1">Reporting issue for:</div>
              <div className="text-[var(--color-text)]">{context.page}</div>
              {context.step && <div className="text-[var(--color-text-muted)]">{context.step}</div>}
              {context.error && (
                <div className="mt-2 text-[var(--color-error)]">
                  <span className="text-[var(--color-text-dim)]">Error:</span> {context.error}
                </div>
              )}
            </div>
          )}

          <div>
            <label htmlFor="description" className="block text-xs font-mono text-[var(--color-text-dim)] mb-1">
              Description <span className="text-[var(--color-error)]">*</span>
            </label>
            <textarea
              id="description"
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Describe the bug... What happened? What did you expect?"
              rows={4}
              required
              disabled={submitState === "submitting"}
              maxLength={1000}
              className="w-full bg-[var(--color-bg)] border border-[var(--color-border)] text-[var(--color-text)] font-mono text-sm p-2 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--color-accent)] disabled:opacity-50 resize-none"
            />
          </div>

          <div>
            <label htmlFor="email" className="block text-xs font-mono text-[var(--color-text-dim)] mb-1">
              Email (optional, for follow-up)
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="your@email.com"
              disabled={submitState === "submitting"}
              maxLength={100}
              className="w-full bg-[var(--color-bg)] border border-[var(--color-border)] text-[var(--color-text)] font-mono text-sm p-2 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--color-accent)] disabled:opacity-50"
            />
          </div>

          {submitState === "error" && (
            <div className="text-xs font-mono text-[var(--color-error)]">
              Failed to submit. Please try again or open an issue on GitHub.
            </div>
          )}

          {submitState === "success" && (
            <div className="text-xs font-mono text-[var(--color-accent)] flex items-center gap-2">
              <span>✓</span>
              <span>Thank you! Your report has been submitted. Closing in {closeCountdown}s...</span>
            </div>
          )}

          <button
            type="submit"
            disabled={submitState === "submitting" || !description.trim()}
            className="w-full bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white font-mono text-sm py-2 px-4 focus-visible:outline-none focus-visible:ring-[var(--focus-ring)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {submitState === "submitting" ? "Submitting..." : "Submit Report →"}
          </button>
        </form>
      </div>
    </div>
  )
}
