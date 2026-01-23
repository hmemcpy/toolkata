export function Footer() {
  return (
    <footer className="border-t border-[var(--color-border)]">
      <div className="mx-auto max-w-7xl px-4 py-[13px] sm:px-6 lg:px-8">
        <div className="flex items-center justify-center gap-4 text-sm text-[var(--color-text-muted)] font-mono">
          <a
            href="https://github.com/hmemcpy/toolkata"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-[var(--color-accent)] transition-colors"
          >
            GitHub
          </a>
          <a href="/about" className="hover:text-[var(--color-accent)] transition-colors">
            About
          </a>
          <a href="/terms" className="hover:text-[var(--color-accent)] transition-colors">
            Terms
          </a>
        </div>
      </div>
    </footer>
  )
}
