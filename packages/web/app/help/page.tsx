import { Footer } from "../../components/ui/Footer"
import { Header } from "../../components/ui/Header"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Help | toolkata",
  description: "Get help with toolkata - keyboard shortcuts, FAQ, and support",
}

export default function HelpPage() {
  return (
    <div className="bg-[var(--color-bg)] min-h-screen flex flex-col">
      <Header />

      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8 flex-1">
        {/* Page Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 text-[var(--color-text-dim)] font-mono text-sm mb-2">
            <span>$</span>
            <span>man toolkata</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold font-mono text-[var(--color-text)]">
            Help
          </h1>
        </div>

        {/* Content */}
        <div className="space-y-8 font-mono">
          {/* Getting Started */}
          <section>
            <h2 className="text-lg font-bold text-[var(--color-text)] mb-4 flex items-center gap-2">
              <span className="text-[var(--color-accent)]">#</span>
              Getting Started
            </h2>
            <div className="border border-[var(--color-border)] bg-[var(--color-surface)] p-4 text-sm">
              <ol className="space-y-3 text-[var(--color-text-muted)]">
                <li className="flex gap-3">
                  <span className="text-[var(--color-accent)]">1.</span>
                  <span>Choose a tool pairing from the home page (e.g., jj ← git)</span>
                </li>
                <li className="flex gap-3">
                  <span className="text-[var(--color-accent)]">2.</span>
                  <span>Work through the steps in order</span>
                </li>
                <li className="flex gap-3">
                  <span className="text-[var(--color-accent)]">3.</span>
                  <span>Use the interactive sandbox to practice commands</span>
                </li>
                <li className="flex gap-3">
                  <span className="text-[var(--color-accent)]">4.</span>
                  <span>Your progress is saved automatically in your browser</span>
                </li>
              </ol>
            </div>
          </section>

          {/* Keyboard Shortcuts */}
          <section>
            <h2 className="text-lg font-bold text-[var(--color-text)] mb-4 flex items-center gap-2">
              <span className="text-[var(--color-accent)]">#</span>
              Keyboard Shortcuts
            </h2>
            <div className="border border-[var(--color-border)] bg-[var(--color-surface)]">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--color-border)]">
                    <th className="text-left p-3 text-[var(--color-text-dim)]">Key</th>
                    <th className="text-left p-3 text-[var(--color-text-dim)]">Action</th>
                  </tr>
                </thead>
                <tbody className="text-[var(--color-text-muted)]">
                  <tr className="border-b border-[var(--color-border)]">
                    <td className="p-3">
                      <kbd className="bg-[var(--color-bg)] px-2 py-1 rounded text-[var(--color-text)]">←</kbd>
                    </td>
                    <td className="p-3">Previous step</td>
                  </tr>
                  <tr className="border-b border-[var(--color-border)]">
                    <td className="p-3">
                      <kbd className="bg-[var(--color-bg)] px-2 py-1 rounded text-[var(--color-text)]">→</kbd>
                    </td>
                    <td className="p-3">Next step</td>
                  </tr>
                  <tr className="border-b border-[var(--color-border)]">
                    <td className="p-3">
                      <kbd className="bg-[var(--color-bg)] px-2 py-1 rounded text-[var(--color-text)]">?</kbd>
                    </td>
                    <td className="p-3">Show keyboard shortcuts</td>
                  </tr>
                  <tr className="border-b border-[var(--color-border)]">
                    <td className="p-3">
                      <kbd className="bg-[var(--color-bg)] px-2 py-1 rounded text-[var(--color-text)]">Esc</kbd>
                    </td>
                    <td className="p-3">Close sidebar / Exit terminal focus</td>
                  </tr>
                  <tr>
                    <td className="p-3">
                      <kbd className="bg-[var(--color-bg)] px-2 py-1 rounded text-[var(--color-text)]">t</kbd>
                    </td>
                    <td className="p-3">Toggle terminal sidebar</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          {/* FAQ */}
          <section>
            <h2 className="text-lg font-bold text-[var(--color-text)] mb-4 flex items-center gap-2">
              <span className="text-[var(--color-accent)]">#</span>
              FAQ
            </h2>
            <div className="space-y-4">
              <div className="border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
                <p className="text-[var(--color-text)] mb-2">
                  <span className="text-[var(--color-accent)]">Q:</span> How is my progress saved?
                </p>
                <p className="text-[var(--color-text-muted)] text-sm">
                  <span className="text-[var(--color-text-dim)]">A:</span> Progress is stored in your
                  browser&apos;s localStorage. No account required. Clear your browser data to reset.
                </p>
              </div>

              <div className="border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
                <p className="text-[var(--color-text)] mb-2">
                  <span className="text-[var(--color-accent)]">Q:</span> What happens when the sandbox
                  expires?
                </p>
                <p className="text-[var(--color-text-muted)] text-sm">
                  <span className="text-[var(--color-text-dim)]">A:</span> Sessions last 5 minutes. When
                  expired, click &quot;Restart&quot; to get a fresh sandbox. Your lesson progress is
                  preserved.
                </p>
              </div>

              <div className="border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
                <p className="text-[var(--color-text)] mb-2">
                  <span className="text-[var(--color-accent)]">Q:</span> Can I use toolkata offline?
                </p>
                <p className="text-[var(--color-text-muted)] text-sm">
                  <span className="text-[var(--color-text-dim)]">A:</span> The lessons can be read
                  offline, but the interactive sandbox requires an internet connection.
                </p>
              </div>

              <div className="border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
                <p className="text-[var(--color-text)] mb-2">
                  <span className="text-[var(--color-accent)]">Q:</span> The sandbox isn&apos;t working.
                  What do I do?
                </p>
                <p className="text-[var(--color-text-muted)] text-sm">
                  <span className="text-[var(--color-text-dim)]">A:</span> Click &quot;Use static
                  mode&quot; to copy commands and run them locally. The sandbox may be temporarily
                  unavailable during high traffic.
                </p>
              </div>
            </div>
          </section>

          {/* Support */}
          <section>
            <h2 className="text-lg font-bold text-[var(--color-text)] mb-4 flex items-center gap-2">
              <span className="text-[var(--color-accent)]">#</span>
              Support
            </h2>
            <div className="border border-[var(--color-border)] bg-[var(--color-surface)] p-4 text-sm text-[var(--color-text-muted)]">
              <p className="mb-3">Found a bug or have a suggestion?</p>
              <a
                href="https://github.com/hmemcpy/toolkata/issues"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-[var(--color-accent)] hover:underline"
              >
                <span>→</span>
                <span>Open an issue on GitHub</span>
              </a>
            </div>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  )
}
