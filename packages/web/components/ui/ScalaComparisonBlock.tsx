/**
 * ScalaComparisonBlock - Side-by-side ZIO vs Cats Effect code comparison.
 *
 * Displays two code blocks side by side for comparing ZIO and Cats Effect code.
 * Uses color coding to distinguish between the two libraries.
 * Respects direction toggle: normal shows ZIO left, Cats Effect right.
 * When reversed, shows Cats Effect left, ZIO right.
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
import { useDirectionContext } from "../../contexts/DirectionContext"

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
 * Code column data for rendering.
 */
interface CodeColumn {
  readonly label: string
  readonly code: string
  readonly html: string
  readonly comment: string | undefined
  readonly bgClass: string
  readonly labelClass: string
}

/**
 * Side-by-side comparison block for Scala code.
 *
 * Shows ZIO code (blue) and Cats Effect code (purple) side by side.
 * When direction is reversed (via DirectionContext), the columns swap.
 * Uses Shiki for client-side syntax highlighting.
 */
export function ScalaComparisonBlock({
  zioCode,
  catsEffectCode,
  zioComment,
  catsEffectComment,
  language = "scala",
}: ScalaComparisonBlockProps) {
  const { isReversed } = useDirectionContext()
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

  // ZIO column data
  const zioColumn: CodeColumn = {
    label: "ZIO",
    code: zioCode,
    html: zioHtml,
    comment: zioComment,
    bgClass: "bg-[var(--color-zio-bg)]",
    labelClass: "text-[var(--color-zio)]",
  }

  // Cats Effect column data
  const ceColumn: CodeColumn = {
    label: "Cats Effect",
    code: catsEffectCode,
    html: ceHtml,
    comment: catsEffectComment,
    bgClass: "bg-[var(--color-ce-bg)]",
    labelClass: "text-[var(--color-ce)]",
  }

  // Swap columns based on direction
  // Normal (ZIO→CE): ZIO left, CE right
  // Reversed (CE→ZIO): CE left, ZIO right
  const leftColumn = isReversed ? ceColumn : zioColumn
  const rightColumn = isReversed ? zioColumn : ceColumn

  const renderColumn = (column: CodeColumn) => (
    <div className={`overflow-hidden rounded border border-[var(--color-border)] ${column.bgClass}`}>
      <div className="border-b border-[var(--color-border)] px-4 py-2">
        <span className={`text-xs font-semibold uppercase tracking-wide ${column.labelClass}`}>
          {column.label}
        </span>
      </div>
      <div className="p-4">
        {isLoading ? (
          <pre className="overflow-x-auto text-sm text-[var(--color-text)]">
            <code>{column.code}</code>
          </pre>
        ) : (
          <div
            className="shiki-container text-sm"
            dangerouslySetInnerHTML={{ __html: column.html }}
            style={{ background: "transparent" }}
          />
        )}
        {column.comment && (
          <p className="mt-2 text-xs text-[var(--color-text-muted)]">
            {column.comment}
          </p>
        )}
      </div>
    </div>
  )

  return (
    <div className="my-6 grid grid-cols-1 gap-4 md:grid-cols-2">
      {renderColumn(leftColumn)}
      {renderColumn(rightColumn)}
    </div>
  )
}
