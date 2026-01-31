"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

/**
 * Error boundary for admin routes.
 *
 * Catches JavaScript errors in admin page components and displays a fallback UI.
 * Following terminal aesthetic with error details and retry options.
 */
export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const router = useRouter()

  useEffect(() => {
    // Log the error to console for debugging
    console.error("Admin error:", error)
  }, [error])

  return (
    <div className="min-h-screen bg-[var(--color-bg)] p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-semibold font-mono text-[var(--color-error)]">
            [!] Admin Error
          </h1>
          <p className="mt-2 text-sm text-[var(--color-text-muted)]">
            Something went wrong in the admin interface
          </p>
        </div>

        {/* Error Details */}
        <div className="border border-[var(--color-error)] rounded bg-[var(--color-surface)] p-6 mb-6">
          <h2 className="text-sm font-mono font-semibold text-[var(--color-text)] mb-4">
            Error Details
          </h2>
          <div className="space-y-2">
            <div className="flex items-start gap-2">
              <span className="text-[var(--color-text-dim)] font-mono text-xs shrink-0">Message:</span>
              <pre className="text-sm font-mono text-[var(--color-error)] overflow-x-auto">
                {error.message}
              </pre>
            </div>
            {error.digest && (
              <div className="flex items-start gap-2">
                <span className="text-[var(--color-text-dim)] font-mono text-xs shrink-0">Error ID:</span>
                <code className="text-sm font-mono text-[var(--color-text-muted)]">
                  {error.digest}
                </code>
              </div>
            )}
            {error.stack && (
              <details className="mt-4">
                <summary className="cursor-pointer text-sm font-mono text-[var(--color-text-muted)] hover:text-[var(--color-text)]">
                  [Show Stack Trace]
                </summary>
                <pre className="mt-2 text-xs font-mono text-[var(--color-text-dim)] overflow-x-auto bg-[var(--color-bg)] p-4 rounded">
                  {error.stack}
                </pre>
              </details>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => reset()}
            className="px-4 py-2 text-sm font-mono bg-[var(--color-accent)] text-[var(--color-bg)] rounded hover:bg-[var(--color-accent-hover)] transition-colors focus-visible:outline-none focus-visible:ring-[var(--focus-ring)]"
          >
            [↻] Try Again
          </button>
          <button
            type="button"
            onClick={() => router.push("/admin")}
            className="px-4 py-2 text-sm font-mono border border-[var(--color-border)] rounded text-[var(--color-text)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] transition-colors focus-visible:outline-none focus-visible:ring-[var(--focus-ring)]"
          >
            [←] Admin Dashboard
          </button>
          <button
            type="button"
            onClick={() => router.push("/")}
            className="px-4 py-2 text-sm font-mono border border-[var(--color-border)] rounded text-[var(--color-text)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] transition-colors focus-visible:outline-none focus-visible:ring-[var(--focus-ring)]"
          >
            [⌂] Home
          </button>
        </div>

        {/* Help Text */}
        <div className="mt-8 p-4 border-l-3 border-[var(--color-text-dim)] bg-[var(--color-surface)]">
          <p className="text-sm font-mono text-[var(--color-text-muted)]">
            If this error persists, check the browser console for more details
            or verify the sandbox API is running.
          </p>
        </div>
      </div>
    </div>
  )
}
