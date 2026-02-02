"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { signOut } from "../../lib/auth"

/**
 * Admin sidebar navigation.
 *
 * Displays navigation links for all admin sections:
 * - Dashboard (/admin)
 * - Content (/admin/cms) - CMS for editing MDX content
 * - Rate Limits (/admin/rate-limits)
 * - Containers (/admin/containers)
 * - Metrics (/admin/metrics)
 *
 * Active route is highlighted with accent color.
 * Includes logout button that signs out via NextAuth.
 *
 * Terminal aesthetic: dark bg, monospace font, green accent.
 */
export function AdminSidebar() {
  const pathname = usePathname()

  const isActive = (href: string) => pathname.startsWith(href)

  return (
    <aside className="w-64 border-r border-[var(--color-border)] bg-[var(--color-surface)] hidden md:block">
      <div className="flex h-full flex-col">
        {/* Logo/Brand */}
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

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-4 space-y-6">
          {/* Dashboard */}
          <div>
            <Link
              href="/admin"
              className={`flex items-center gap-2 px-3 py-2 text-sm font-mono transition-colors rounded focus-visible:outline-none focus-visible:ring-[var(--focus-ring)] ${
                pathname === "/admin"
                  ? "bg-[var(--color-accent-bg)] text-[var(--color-accent)]"
                  : "text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-hover)]"
              }`}
            >
              <span className="text-xs">[▓]</span>
              <span>Dashboard</span>
            </Link>
          </div>

          {/* Content section */}
          <div>
            <h3 className="px-3 mb-2 text-xs font-mono text-[var(--color-text-dim)] uppercase tracking-wider">
              Content
            </h3>
            <ul className="space-y-1">
              <li>
                <Link
                  href="/admin/cms"
                  className={`flex items-center gap-2 px-3 py-2 text-sm font-mono transition-colors rounded focus-visible:outline-none focus-visible:ring-[var(--focus-ring)] ${
                    isActive("/admin/cms")
                      ? "bg-[var(--color-accent-bg)] text-[var(--color-accent)]"
                      : "text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-hover)]"
                  }`}
                >
                  <span className="text-xs">[✎]</span>
                  <span>Editor</span>
                </Link>
              </li>
            </ul>
          </div>

          {/* Sandbox section */}
          <div>
            <h3 className="px-3 mb-2 text-xs font-mono text-[var(--color-text-dim)] uppercase tracking-wider">
              Sandbox
            </h3>
            <ul className="space-y-1">
              <li>
                <Link
                  href="/admin/rate-limits"
                  className={`flex items-center gap-2 px-3 py-2 text-sm font-mono transition-colors rounded focus-visible:outline-none focus-visible:ring-[var(--focus-ring)] ${
                    isActive("/admin/rate-limits")
                      ? "bg-[var(--color-accent-bg)] text-[var(--color-accent)]"
                      : "text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-hover)]"
                  }`}
                >
                  <span className="text-xs">[≈]</span>
                  <span>Rate Limits</span>
                </Link>
              </li>
              <li>
                <Link
                  href="/admin/containers"
                  className={`flex items-center gap-2 px-3 py-2 text-sm font-mono transition-colors rounded focus-visible:outline-none focus-visible:ring-[var(--focus-ring)] ${
                    isActive("/admin/containers")
                      ? "bg-[var(--color-accent-bg)] text-[var(--color-accent)]"
                      : "text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-hover)]"
                  }`}
                >
                  <span className="text-xs">[⌘]</span>
                  <span>Containers</span>
                </Link>
              </li>
              <li>
                <Link
                  href="/admin/metrics"
                  className={`flex items-center gap-2 px-3 py-2 text-sm font-mono transition-colors rounded focus-visible:outline-none focus-visible:ring-[var(--focus-ring)] ${
                    isActive("/admin/metrics")
                      ? "bg-[var(--color-accent-bg)] text-[var(--color-accent)]"
                      : "text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-hover)]"
                  }`}
                >
                  <span className="text-xs">[≡]</span>
                  <span>Metrics</span>
                </Link>
              </li>
            </ul>
          </div>
        </nav>

        {/* User actions */}
        <div className="border-t border-[var(--color-border)] p-4">
          <form action={async () => {
            await signOut({ redirectTo: "/" })
          }}>
            <button
              type="submit"
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-[var(--color-text-muted)] font-mono transition-colors rounded hover:text-[var(--color-error)] hover:bg-[var(--color-surface-hover)] focus-visible:outline-none focus-visible:ring-[var(--focus-ring)]"
            >
              <span className="text-xs">[×]</span>
              <span>Logout</span>
            </button>
          </form>
        </div>
      </div>
    </aside>
  )
}

/**
 * Mobile admin navigation (bottom bar for small screens).
 * To be implemented when mobile admin UI is needed.
 */
export function AdminMobileNav() {
  const pathname = usePathname()

  const navItems = [
    { href: "/admin", label: "Dash", icon: "[▓]" },
    { href: "/admin/cms", label: "Content", icon: "[✎]" },
    { href: "/admin/rate-limits", label: "Limits", icon: "[≈]" },
    { href: "/admin/containers", label: "Containers", icon: "[⌘]" },
    { href: "/admin/metrics", label: "Metrics", icon: "[≡]" },
  ] as const

  const isActive = (href: string) => {
    if (href === "/admin") {
      return pathname === "/admin"
    }
    return pathname.startsWith(href)
  }

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 border-t border-[var(--color-border)] bg-[var(--color-surface)] z-50">
      <ul className="flex items-center justify-around">
        {navItems.map((item) => (
          <li key={item.href}>
            <Link
              href={item.href}
              className={`flex flex-col items-center px-3 py-2 text-xs font-mono transition-colors focus-visible:outline-none focus-visible:ring-[var(--focus-ring)] ${
                isActive(item.href)
                  ? "text-[var(--color-accent)]"
                  : "text-[var(--color-text-muted)]"
              }`}
            >
              <span className="text-[10px]">{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  )
}
