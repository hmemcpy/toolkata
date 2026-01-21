"use client"

import { useState } from "react"
import Link from "next/link"

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
          className="text-xl font-bold text-[var(--color-text)] hover:text-[var(--color-accent)] focus-visible:outline-none focus-visible:ring-[var(--focus-ring)]"
          onClick={closeMobileMenu}
        >
          toolkata<span className="text-[var(--color-accent)]">_</span>
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden items-center gap-6 sm:flex">
          <a
            href="https://github.com/hmemcpy/jj-kata"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text)] focus-visible:outline-none focus-visible:ring-[var(--focus-ring)]"
          >
            [GitHub]
          </a>
          <Link
            href="/help"
            className="text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text)] focus-visible:outline-none focus-visible:ring-[var(--focus-ring)]"
          >
            [?Help]
          </Link>
        </div>

        {/* Mobile menu button */}
        <button
          type="button"
          className="sm:hidden focus-visible:outline-none focus-visible:ring-[var(--focus-ring)]"
          onClick={toggleMobileMenu}
          aria-expanded={mobileMenuOpen}
          aria-label="Toggle navigation menu"
        >
          <span className="text-sm text-[var(--color-text-muted)]">
            {mobileMenuOpen ? "[Close]" : "[≡]"}
          </span>
        </button>
      </nav>

      {/* Mobile Navigation */}
      {mobileMenuOpen && (
        <div className="border-t border-[var(--color-border)] sm:hidden">
          <div className="space-y-2 px-4 py-4">
            <a
              href="https://github.com/hmemcpy/jj-kata"
              target="_blank"
              rel="noopener noreferrer"
              className="block text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text)] focus-visible:outline-none focus-visible:ring-[var(--focus-ring)]"
              onClick={closeMobileMenu}
            >
              [GitHub]
            </a>
            <Link
              href="/help"
              className="block text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text)] focus-visible:outline-none focus-visible:ring-[var(--focus-ring)]"
              onClick={closeMobileMenu}
            >
              [?Help]
            </Link>
          </div>
        </div>
      )}
    </header>
  )
}
