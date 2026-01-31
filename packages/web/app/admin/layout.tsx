import type { ReactNode } from "react"
import { redirect } from "next/navigation"
import { auth } from "../../lib/auth"
import { AdminMobileNav, AdminSidebar } from "../../components/admin/AdminSidebar"

/**
 * Admin layout with authentication protection.
 *
 * All /admin routes require:
 * 1. Authenticated session (via NextAuth)
 * 2. Admin email authorization (via ADMIN_EMAILS allowlist)
 *
 * Non-authenticated users are redirected to /admin/login
 * Authenticated but non-admin users are redirected to /
 *
 * Layout includes:
 * - Sidebar navigation: Dashboard, Rate Limits, Containers, Metrics
 * - Terminal aesthetic styling (dark bg, monospace, green accent)
 */
export default async function AdminLayout(props: {
  readonly children: ReactNode
}) {
  const session = await auth()

  // Redirect to login if not authenticated
  if (!session?.user) {
    redirect("/admin/login")
  }

  // Redirect to home if authenticated but not admin
  if (!session.user.isAdmin) {
    redirect("/")
  }

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
