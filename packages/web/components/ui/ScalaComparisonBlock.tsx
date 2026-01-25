/**
 * ScalaComparisonBlock - Side-by-side ZIO vs Cats Effect code comparison.
 *
 * Displays two code blocks side by side for comparing ZIO and Cats Effect code.
 * Uses color coding to distinguish between the two libraries.
 *
 * @example
 * ```tsx
 * <ScalaComparisonBlock
 *   zioCode="ZIO.succeed(42)"
 *   catsEffectCode="IO.pure(42)"
 *   zioComment="Lift pure value into effect"
 *   catsEffectComment="Same in Cats Effect"
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
 * Shows ZIO code (blue) on the left and Cats Effect code (purple) on the right.
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
      {/* ZIO column (blue) */}
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

      {/* Cats Effect column (purple) */}
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
    </div>
  )
}
