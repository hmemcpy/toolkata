import { signIn } from "../../../lib/auth"

/**
 * Admin login page.
 *
 * This page is shown when unauthenticated users try to access /admin routes.
 * Clicking "Sign in with Google" redirects to NextAuth Google OAuth flow.
 *
 * After successful authentication:
 * - If email is in ADMIN_EMAILS, redirected to /admin
 * - If email is not in ADMIN_EMAILS, sign-in is blocked
 */
export default function AdminLoginPage() {
  return (
    <div className="flex min-h-screen bg-[var(--color-bg)]">
      {/* Sidebar (visual only on login page) */}
      <div className="w-64 border-r border-[var(--color-border)] bg-[var(--color-surface)] hidden md:flex flex-col">
        <div className="border-b border-[var(--color-border)] p-4">
          <a
            href="/"
            className="group flex items-center gap-2 focus-visible:outline-none focus-visible:ring-[var(--focus-ring)] rounded"
          >
            <span className="text-lg font-semibold">
              <span className="text-[var(--color-text)]">tool</span>
              <span className="text-[var(--color-accent)]">kata</span>
            </span>
            <span className="text-xs text-[var(--color-text-muted)]">/admin</span>
          </a>
        </div>
      </div>

      {/* Login form */}
      <main className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg p-8">
            <h1 className="text-2xl font-semibold mb-2">
              <span className="text-[var(--color-text)]">Admin </span>
              <span className="text-[var(--color-accent)]">Login</span>
            </h1>
            <p className="text-sm text-[var(--color-text-muted)] mb-6">
              Sign in with your Google account to access the admin dashboard.
            </p>

            <form
              action={async () => {
                "use server"
                await signIn("google", { redirectTo: "/admin" })
              }}
            >
              <button
                type="submit"
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-[var(--color-accent)] text-[var(--color-bg)] text-sm font-semibold font-mono rounded hover:bg-[var(--color-accent-hover)] transition-colors focus-visible:outline-none focus-visible:ring-[var(--focus-ring)]"
              >
                <span>[→]</span>
                <span>Sign in with Google</span>
              </button>
            </form>

            <div className="mt-6 pt-6 border-t border-[var(--color-border)]">
              <p className="text-xs text-[var(--color-text-dim)]">
                Access is restricted to authorized admin emails only.
              </p>
            </div>
          </div>

          <div className="mt-4 text-center">
            <a
              href="/"
              className="text-sm text-[var(--color-text-muted)] hover:text-[var(--color-accent)] focus-visible:outline-none focus-visible:ring-[var(--focus-ring)] rounded font-mono"
            >
              ← Back to home
            </a>
          </div>
        </div>
      </main>
    </div>
  )
}
