import type { ReactNode } from "react"
import Link from "next/link"

/**
 * CMS layout for content management pages.
 *
 * Provides:
 * - Full-width container (removes parent max-width constraint)
 * - Back navigation to admin dashboard
 * - Common wrapper for CMS pages (main editor + history)
 *
 * Child pages handle their own state and branch selection
 * since each has different requirements.
 */
export default function CMSLayout(props: {
  readonly children: ReactNode
}) {
  return (
    <div className="-mx-6 md:-mx-8 -mt-6 md:-mt-8 h-[calc(100vh-2rem)]">
      {/* CMS header with navigation */}
      <div className="flex items-center gap-3 px-4 py-2 border-b border-[var(--color-border)] bg-[var(--color-surface-elevated)]">
        <Link
          href="/admin"
          className="text-xs font-mono text-[var(--color-text-muted)] hover:text-[var(--color-accent)] transition-colors"
        >
          ← admin
        </Link>
        <span className="text-[var(--color-text-dim)]">/</span>
        <span className="text-xs font-mono text-[var(--color-text)]">cms</span>
      </div>

      {/* CMS content */}
      <div className="h-[calc(100%-2.5rem)]">{props.children}</div>
    </div>
  )
}
