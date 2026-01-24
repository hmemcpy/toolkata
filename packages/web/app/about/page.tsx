import Image from "next/image"
import { Footer } from "../../components/ui/Footer"
import { Header } from "../../components/ui/Header"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "About | toolkata",
  description: "About toolkata - learn developer tools through hands-on practice",
}

export default function AboutPage() {
  return (
    <div className="bg-[var(--color-bg)] min-h-screen flex flex-col">
      <Header />

      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8 flex-1">
        {/* Hero Logo */}
        <div className="flex items-center gap-4 mb-10">
          <Image
            src="/logo.svg"
            alt="toolkata logo"
            width={180}
            height={155}
            className="w-[180px] h-auto"
            priority
          />
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold font-mono mb-1">
              <span className="text-[var(--color-text)]">tool</span>
              <span className="text-[var(--color-accent)]">kata</span>
            </h1>
            <p className="text-[var(--color-text-muted)] text-sm">
              <span className="text-[var(--color-text-dim)]">kata</span>
              <span className="mx-2 text-[var(--color-text-dim)]">(型)</span>
              <span className="italic">the art of learning through deliberate practice</span>
            </p>
          </div>
        </div>

        {/* Content */}
        <div className="space-y-6 font-mono text-sm text-[var(--color-text-muted)]">
          <p>
            Interactive tutorials for learning tool X if you already know tool Y.
          </p>

          <p>
            Side-by-side command comparisons. Sandboxed terminal for practice.
          </p>

          <p>
            Progress stored in browser. No account required.
          </p>

          <div className="pt-4 border-t border-[var(--color-border)] space-y-2">
            <p>
              <a
                href="https://github.com/hmemcpy/toolkata"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[var(--color-accent)] hover:underline"
              >
                Source on GitHub
              </a>
            </p>
            <p>
              Built by{" "}
              <a
                href="https://x.com/hmemcpy"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[var(--color-text)] hover:text-[var(--color-accent)] transition-colors"
              >
                Igal Tabachnik
              </a>
            </p>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}
