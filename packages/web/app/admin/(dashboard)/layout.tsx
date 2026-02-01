import type { ReactNode } from "react"
import { AdminMobileNav, AdminSidebar } from "@/components/admin/AdminSidebar"

/**
 * Admin layout with sidebar navigation.
 *
 * Authentication is handled by middleware.ts - all /admin routes
 * (except /admin/login and /admin/auth-error) require:
 * 1. Authenticated session (via NextAuth)
 * 2. Admin email authorization (via ADMIN_EMAILS allowlist)
 *
 * Layout includes:
 * - Sidebar navigation: Dashboard, Rate Limits, Containers, Metrics
 * - Terminal aesthetic styling (dark bg, monospace, green accent)
 */
export default function AdminLayout(props: {
  readonly children: ReactNode
}) {
  return (
    <div className="flex min-h-screen bg-[var(--color-bg)]">
      {/* Sidebar navigation (desktop) */}
      <AdminSidebar />

      {/* Main content area */}
      <main className="flex-1 p-6 md:p-8 pb-20 md:pb-8">
        <div className="mx-auto max-w-7xl">{props.children}</div>
      </main>

      {/* Mobile navigation */}
      <AdminMobileNav />
    </div>
  )
}
