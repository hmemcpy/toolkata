export function Footer() {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="border-t border-[var(--color-border)]">
      <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-[var(--color-text-muted)] font-mono">
          {/* Copyright */}
          <div className="text-[var(--color-text-dim)] text-xs">
            <span className="text-[var(--color-text-dim)]">©</span> {currentYear}{" "}
            <a
              href="https://x.com/hmemcpy"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-[var(--color-accent)] transition-colors"
            >
              Igal Tabachnik
            </a>
          </div>

          {/* Links */}
          <div className="flex items-center gap-4">
            <a
              href="https://github.com/hmemcpy/toolkata"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-[var(--color-accent)] transition-colors"
            >
              GitHub
            </a>
            <span className="text-[var(--color-text-dim)]">·</span>
            <a href="/help" className="hover:text-[var(--color-accent)] transition-colors">
              Help
            </a>
            <span className="text-[var(--color-text-dim)]">·</span>
            <a href="/about" className="hover:text-[var(--color-accent)] transition-colors">
              About
            </a>
            <span className="text-[var(--color-text-dim)]">·</span>
            <a href="/terms" className="hover:text-[var(--color-accent)] transition-colors">
              Terms
            </a>
          </div>
        </div>
      </div>
    </footer>
  )
}
