/**
 * ScalaComparisonBlock - Side-by-side Cats Effect vs ZIO code comparison.
 *
 * Displays two code blocks side by side for comparing Cats Effect and ZIO code.
 * Tutorial direction: Cats Effect (what you know) → ZIO (what you're learning).
 * Cats Effect shown on left (purple), ZIO on right (blue).
 *
 * @example
 * ```tsx
 * <ScalaComparisonBlock
 *   catsEffectCode="IO.pure(42)"
 *   zioCode="ZIO.succeed(42)"
 *   catsEffectComment="Cats Effect 3 syntax"
 *   zioComment="ZIO 2 equivalent"
 * />
 * ```
 */

"use client"

import { useEffect, useState } from "react"
import {
  createHighlighter,
  type BundledLanguage,
  type BundledTheme,
} from "shiki"

interface ScalaComparisonBlockProps {
  /**
   * ZIO code to display (left column).
   */
  readonly zioCode: string

  /**
   * Cats Effect code to display (right column).
   */
  readonly catsEffectCode: string

  /**
   * Optional comment for ZIO code.
   */
  readonly zioComment?: string

  /**
   * Optional comment for Cats Effect code.
   */
  readonly catsEffectComment?: string

  /**
   * Optional language for syntax highlighting (default: "scala").
   */
  readonly language?: string
}

/**
 * Side-by-side comparison block for Scala code.
 *
 * Shows Cats Effect code (purple) on the left and ZIO code (blue) on the right.
 * This matches the tutorial direction: Cats Effect → ZIO.
 * Uses Shiki for client-side syntax highlighting.
 */
export function ScalaComparisonBlock({
  zioCode,
  catsEffectCode,
  zioComment,
  catsEffectComment,
  language = "scala",
}: ScalaComparisonBlockProps) {
  const [zioHtml, setZioHtml] = useState<string>("")
  const [ceHtml, setCeHtml] = useState<string>("")
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function highlightCode() {
      try {
        const highlighter = await createHighlighter({
          themes: ["github-dark"],
          langs: [language as BundledLanguage],
        })

        if (cancelled) return

        const zioHighlighted = highlighter.codeToHtml(zioCode, {
          lang: language as BundledLanguage,
          theme: "github-dark" as BundledTheme,
        })

        const ceHighlighted = highlighter.codeToHtml(catsEffectCode, {
          lang: language as BundledLanguage,
          theme: "github-dark" as BundledTheme,
        })

        if (cancelled) return

        setZioHtml(zioHighlighted)
        setCeHtml(ceHighlighted)
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    }

    highlightCode()

    return () => {
      cancelled = true
    }
  }, [zioCode, catsEffectCode, language])

  return (
    <div className="my-6 grid grid-cols-1 gap-4 md:grid-cols-2">
      {/* Cats Effect column (purple) - what you know */}
      <div className="overflow-hidden rounded border border-[var(--color-border)] bg-[var(--color-ce-bg)]">
        <div className="border-b border-[var(--color-border)] px-4 py-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-[var(--color-ce)]">
            Cats Effect
          </span>
        </div>
        <div className="p-4">
          {isLoading ? (
            <pre className="overflow-x-auto text-sm text-[var(--color-text)]">
              <code>{catsEffectCode}</code>
            </pre>
          ) : (
            <div
              className="shiki-container text-sm"
              dangerouslySetInnerHTML={{ __html: ceHtml }}
              style={{ background: "transparent" }}
            />
          )}
          {catsEffectComment && (
            <p className="mt-2 text-xs text-[var(--color-text-muted)]">
              {catsEffectComment}
            </p>
          )}
        </div>
      </div>

      {/* ZIO column (blue) - what you're learning */}
      <div className="overflow-hidden rounded border border-[var(--color-border)] bg-[var(--color-zio-bg)]">
        <div className="border-b border-[var(--color-border)] px-4 py-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-[var(--color-zio)]">
            ZIO
          </span>
        </div>
        <div className="p-4">
          {isLoading ? (
            <pre className="overflow-x-auto text-sm text-[var(--color-text)]">
              <code>{zioCode}</code>
            </pre>
          ) : (
            <div
              className="shiki-container text-sm"
              dangerouslySetInnerHTML={{ __html: zioHtml }}
              style={{ background: "transparent" }}
            />
          )}
          {zioComment && (
            <p className="mt-2 text-xs text-[var(--color-text-muted)]">
              {zioComment}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
