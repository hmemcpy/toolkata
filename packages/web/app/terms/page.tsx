import { Footer } from "../../components/ui/Footer"
import { Header } from "../../components/ui/Header"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Terms of Use | toolkata",
  description: "Terms of use for toolkata",
}

export default function TermsPage() {
  return (
    <div className="bg-[var(--color-bg)] min-h-screen flex flex-col">
      <Header />

      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8 flex-1">
        {/* Page Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 text-[var(--color-text-dim)] font-mono text-sm mb-2">
            <span>$</span>
            <span>cat terms.md</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold font-mono text-[var(--color-text)]">
            Terms of Use
          </h1>
        </div>

        {/* Content */}
        <div className="space-y-8 font-mono text-sm">
          {/* Acceptance */}
          <section>
            <h2 className="text-lg font-bold text-[var(--color-text)] mb-4 flex items-center gap-2">
              <span className="text-[var(--color-accent)]">1.</span>
              Acceptance of Terms
            </h2>
            <div className="border-l-2 border-[var(--color-border)] pl-4 text-[var(--color-text-muted)]">
              <p>
                By accessing and using toolkata, you accept and agree to be bound by these terms. If
                you do not agree, do not use this service.
              </p>
            </div>
          </section>

          {/* Service Description */}
          <section>
            <h2 className="text-lg font-bold text-[var(--color-text)] mb-4 flex items-center gap-2">
              <span className="text-[var(--color-accent)]">2.</span>
              Service Description
            </h2>
            <div className="border-l-2 border-[var(--color-border)] pl-4 text-[var(--color-text-muted)]">
              <p>
                toolkata provides educational tutorials and interactive sandbox environments for
                learning developer tools. The service is provided &quot;as is&quot; without
                warranties.
              </p>
            </div>
          </section>

          {/* Sandbox Usage */}
          <section>
            <h2 className="text-lg font-bold text-[var(--color-text)] mb-4 flex items-center gap-2">
              <span className="text-[var(--color-accent)]">3.</span>
              Sandbox Usage
            </h2>
            <div className="border-l-2 border-[var(--color-border)] pl-4 text-[var(--color-text-muted)] space-y-3">
              <p>The interactive sandbox is provided for educational purposes. You agree to:</p>
              <ul className="space-y-2 ml-4">
                <li className="flex gap-2">
                  <span className="text-[var(--color-text-dim)]">•</span>
                  <span>Use it only for learning the tools presented</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-[var(--color-text-dim)]">•</span>
                  <span>Not attempt to circumvent security measures</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-[var(--color-text-dim)]">•</span>
                  <span>Not use it for any malicious purposes</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-[var(--color-text-dim)]">•</span>
                  <span>Not abuse the service or consume excessive resources</span>
                </li>
              </ul>
              <p>
                Sessions are ephemeral and automatically destroyed. Do not enter sensitive
                information.
              </p>
            </div>
          </section>

          {/* Content */}
          <section>
            <h2 className="text-lg font-bold text-[var(--color-text)] mb-4 flex items-center gap-2">
              <span className="text-[var(--color-accent)]">4.</span>
              Content
            </h2>
            <div className="border-l-2 border-[var(--color-border)] pl-4 text-[var(--color-text-muted)]">
              <p>
                Tutorial content is provided for educational purposes. While we strive for accuracy,
                we make no guarantees. Always refer to official documentation for authoritative
                information.
              </p>
            </div>
          </section>

          {/* Privacy */}
          <section>
            <h2 className="text-lg font-bold text-[var(--color-text)] mb-4 flex items-center gap-2">
              <span className="text-[var(--color-accent)]">5.</span>
              Privacy
            </h2>
            <div className="border-l-2 border-[var(--color-border)] pl-4 text-[var(--color-text-muted)] space-y-3">
              <p>toolkata respects your privacy:</p>
              <ul className="space-y-2 ml-4">
                <li className="flex gap-2">
                  <span className="text-[var(--color-text-dim)]">•</span>
                  <span>Progress is stored locally in your browser</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-[var(--color-text-dim)]">•</span>
                  <span>No account or personal information required</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-[var(--color-text-dim)]">•</span>
                  <span>Sandbox sessions are ephemeral and not logged</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-[var(--color-text-dim)]">•</span>
                  <span>We may collect anonymous usage statistics</span>
                </li>
              </ul>
            </div>
          </section>

          {/* Modifications */}
          <section>
            <h2 className="text-lg font-bold text-[var(--color-text)] mb-4 flex items-center gap-2">
              <span className="text-[var(--color-accent)]">6.</span>
              Modifications
            </h2>
            <div className="border-l-2 border-[var(--color-border)] pl-4 text-[var(--color-text-muted)]">
              <p>
                We reserve the right to modify these terms at any time. Continued use after changes
                constitutes acceptance of the new terms.
              </p>
            </div>
          </section>

          {/* Contact */}
          <section>
            <h2 className="text-lg font-bold text-[var(--color-text)] mb-4 flex items-center gap-2">
              <span className="text-[var(--color-accent)]">7.</span>
              Contact
            </h2>
            <div className="border border-[var(--color-border)] bg-[var(--color-surface)] p-4 text-[var(--color-text-muted)]">
              <p className="mb-3">Questions about these terms?</p>
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

          {/* Last Updated */}
          <div className="pt-4 border-t border-[var(--color-border)] text-[var(--color-text-dim)] text-xs">
            Last updated: January 2025
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}
