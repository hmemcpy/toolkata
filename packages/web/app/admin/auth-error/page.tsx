import Link from "next/link"

/**
 * Admin authentication error page.
 *
 * Displayed when NextAuth encounters an error during sign-in.
 * Common causes:
 * - Email not in ADMIN_EMAILS allowlist
 * - OAuth provider error
 * - Misconfigured environment variables
 */
export default function AuthErrorPage() {
  return (
    <div className="flex min-h-screen bg-[var(--color-bg)]">
      {/* Sidebar (visual only on error page) */}
      <div className="w-64 border-r border-[var(--color-border)] bg-[var(--color-surface)] hidden md:flex flex-col">
        <div className="border-b border-[var(--color-border)] p-4">
          <Link
            href="/"
            className="group flex items-center gap-2 focus-visible:outline-none focus-visible:ring-[var(--focus-ring)] rounded"
          >
            <span className="text-lg font-semibold">
              <span className="text-[var(--color-text)]">tool</span>
              <span className="text-[var(--color-accent)]">kata</span>
            </span>
            <span className="text-xs text-[var(--color-text-muted)]">/admin</span>
          </Link>
        </div>
      </div>

      {/* Error message */}
      <main className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <div className="bg-[var(--color-surface)] border border-[var(--color-error)] rounded-lg p-8">
            <h1 className="text-2xl font-semibold mb-2 text-[var(--color-error)]">
              Authentication Error
            </h1>
            <p className="text-sm text-[var(--color-text-muted)] mb-6">
              Unable to sign in to the admin dashboard.
            </p>

            <div className="space-y-4">
              <div>
                <h2 className="text-sm font-semibold text-[var(--color-text)] mb-2">
                  Possible reasons:
                </h2>
                <ul className="text-xs text-[var(--color-text-muted)] space-y-1 list-disc list-inside">
                  <li>Your email is not in the admin allowlist</li>
                  <li>OAuth provider is temporarily unavailable</li>
                  <li>Environment variables are misconfigured</li>
                </ul>
              </div>

              <div className="pt-4 border-t border-[var(--color-border)]">
                <Link
                  href="/admin/login"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--color-accent)] text-[var(--color-bg)] text-sm font-semibold font-mono rounded hover:bg-[var(--color-accent-hover)] transition-colors focus-visible:outline-none focus-visible:ring-[var(--focus-ring)]"
                >
                  <span>[↻]</span>
                  <span>Try again</span>
                </Link>
              </div>

              <div className="pt-4">
                <Link
                  href="/"
                  className="text-sm text-[var(--color-text-muted)] hover:text-[var(--color-accent)] focus-visible:outline-none focus-visible:ring-[var(--focus-ring)] rounded font-mono"
                >
                  ← Back to home
                </Link>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
