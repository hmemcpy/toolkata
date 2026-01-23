"use client"

import Image from "next/image"
import Link from "next/link"
import { useState } from "react"

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const toggleMobileMenu = () => {
    setMobileMenuOpen((prev) => !prev)
  }

  const closeMobileMenu = () => {
    setMobileMenuOpen(false)
  }

  return (
    <header className="border-b border-[var(--color-border)]">
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <Link
          href="/"
          className="group flex items-center gap-3 focus-visible:outline-none focus-visible:ring-[var(--focus-ring)] rounded"
          onClick={closeMobileMenu}
        >
          {/* Logo icon */}
          <Image
            src="/logo-mark.svg"
            alt=""
            width={70}
            height={60}
            className="h-[60px] w-auto hidden sm:block"
            priority
          />

          <div className="flex flex-col">
            <span className="text-lg font-semibold leading-tight">
              <span className="text-[var(--color-text)]">tool</span>
              <span className="text-[var(--color-accent)]">kata</span>
            </span>
            <span className="text-xs text-[var(--color-text-muted)] hidden sm:block">
              Master tools through practice
            </span>
          </div>
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden items-center gap-1 sm:flex">
          <NavLink href="https://github.com/hmemcpy/toolkata" external>
            github
          </NavLink>
          <span className="text-[var(--color-text-dim)]">│</span>
          <NavLink href="/help">help</NavLink>
          <span className="text-[var(--color-text-dim)]">│</span>
          <span className="text-[10px] text-[var(--color-text-dim)] font-mono">
            {process.env.NEXT_PUBLIC_GIT_SHA?.slice(0, 7) ?? "dev"}
          </span>
        </div>

        {/* Mobile menu button */}
        <button
          type="button"
          className="sm:hidden focus-visible:outline-none focus-visible:ring-[var(--focus-ring)] p-2 rounded"
          onClick={toggleMobileMenu}
          aria-expanded={mobileMenuOpen}
          aria-label="Toggle navigation menu"
        >
          <span className="text-sm text-[var(--color-accent)] font-mono">
            {mobileMenuOpen ? "[×]" : "[≡]"}
          </span>
        </button>
      </nav>

      {/* Mobile Navigation */}
      {mobileMenuOpen && (
        <div className="border-t border-[var(--color-border)] sm:hidden bg-[var(--color-surface)]">
          <div className="px-4 py-4 space-y-1">
            <MobileNavLink
              href="https://github.com/hmemcpy/toolkata"
              onClick={closeMobileMenu}
              external
            >
              → github
            </MobileNavLink>
            <MobileNavLink href="/help" onClick={closeMobileMenu}>
              → help
            </MobileNavLink>
            <div className="pt-2 border-t border-[var(--color-border)] mt-2">
              <span className="text-[10px] text-[var(--color-text-dim)] font-mono">
                toolkata {process.env.NEXT_PUBLIC_GIT_SHA?.slice(0, 7) ?? "dev"} · progress stored
                locally
              </span>
            </div>
          </div>
        </div>
      )}
    </header>
  )
}

function NavLink({
  href,
  children,
  external = false,
}: {
  readonly href: string
  readonly children: React.ReactNode
  readonly external?: boolean
}) {
  const className =
    "text-xs text-[var(--color-text-muted)] hover:text-[var(--color-accent)] focus-visible:outline-none focus-visible:ring-[var(--focus-ring)] transition-colors px-2 py-1 rounded font-mono uppercase tracking-wider"

  if (external) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={className}>
        {children}
      </a>
    )
  }

  return (
    <Link href={href} className={className}>
      {children}
    </Link>
  )
}

function MobileNavLink({
  href,
  children,
  onClick,
  external = false,
}: {
  readonly href: string
  readonly children: React.ReactNode
  readonly onClick: () => void
  readonly external?: boolean
}) {
  const className =
    "block text-sm text-[var(--color-text-muted)] hover:text-[var(--color-accent)] focus-visible:outline-none focus-visible:ring-[var(--focus-ring)] py-2 font-mono transition-colors"

  if (external) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={className}
        onClick={onClick}
      >
        {children}
      </a>
    )
  }

  return (
    <Link href={href} className={className} onClick={onClick}>
      {children}
    </Link>
  )
}
