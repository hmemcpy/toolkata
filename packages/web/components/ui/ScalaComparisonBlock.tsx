/**
 * ScalaComparisonBlock - Side-by-side Cats Effect vs ZIO code comparison.
 *
 * Displays two code blocks side by side for comparing Cats Effect and ZIO code.
 * Tutorial direction: Cats Effect (what you know) → ZIO (what you're learning).
 * Cats Effect shown on left (purple), ZIO on right (blue).
 *
 * Uses server-side Shiki highlighting to avoid flash of unstyled content.
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

import { codeToHtml } from "shiki"

interface ScalaComparisonBlockProps {
  /**
   * ZIO code to display (right column).
   */
  readonly zioCode: string

  /**
   * Cats Effect code to display (left column).
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

  /**
   * Whether to validate this snippet during build-time snippet validation.
   * Set to false to skip validation for pseudo-code or teaching examples.
   * This prop is only used by the validation system, not for rendering.
   */
  readonly validate?: boolean

  /**
   * Additional imports to add to the validation prelude for this snippet.
   * Merged with the pairing-level imports during validation.
   * This prop is only used by the validation system, not for rendering.
   */
  readonly extraImports?: readonly string[]
}

/**
 * Process code using stripMargin-style formatting (like Scala).
 *
 * Each line starting with `|` has everything before and including the `|` stripped.
 * This preserves intentional indentation that would otherwise be lost to JSX/MDX
 * whitespace normalization.
 *
 * @example
 * ```
 * // Input:
 * `|import zio._
 * |
 * |val x =
 * |  ZIO.succeed(42)`
 *
 * // Output:
 * import zio._
 *
 * val x =
 *   ZIO.succeed(42)
 * ```
 */
function normalizeCode(code: string): string {
  const lines = code.split("\n")

  // Apply stripMargin: remove everything up to and including `|` on each line
  const strippedLines = lines.map((line) => {
    const pipeIndex = line.indexOf("|")
    if (pipeIndex !== -1) {
      return line.slice(pipeIndex + 1)
    }
    return line
  })

  // Remove leading blank lines
  let startIndex = 0
  while (startIndex < strippedLines.length && strippedLines[startIndex]?.trim() === "") {
    startIndex++
  }

  // Remove trailing blank lines
  let endIndex = strippedLines.length - 1
  while (endIndex >= startIndex && strippedLines[endIndex]?.trim() === "") {
    endIndex--
  }

  return strippedLines.slice(startIndex, endIndex + 1).join("\n")
}

/**
 * Side-by-side comparison block for Scala code.
 *
 * Shows Cats Effect code (purple) on the left and ZIO code (blue) on the right.
 * This matches the tutorial direction: Cats Effect → ZIO.
 * Uses server-side Shiki highlighting for instant rendering without flash.
 */
export async function ScalaComparisonBlock({
  zioCode,
  catsEffectCode,
  zioComment,
  catsEffectComment,
  language = "scala",
  // validate and extraImports are only used by the validation system
  validate: _validate,
  extraImports: _extraImports,
}: ScalaComparisonBlockProps) {
  // Server-side syntax highlighting - no loading state needed
  const [ceHtml, zioHtml] = await Promise.all([
    codeToHtml(normalizeCode(catsEffectCode), {
      lang: language,
      theme: "github-dark",
    }),
    codeToHtml(normalizeCode(zioCode), {
      lang: language,
      theme: "github-dark",
    }),
  ])

  return (
    <div className="my-6 grid grid-cols-1 gap-4 md:grid-cols-2">
      {/* Cats Effect column (purple) - what you know */}
      <div className="overflow-hidden rounded border border-[var(--color-border-focus)] bg-[var(--color-ce-bg)]">
        <div className="border-b border-[var(--color-border-focus)] px-4 py-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-[var(--color-ce)]">
            Cats Effect
          </span>
        </div>
        <div className="p-4">
          <div
            className="shiki-container text-sm"
            dangerouslySetInnerHTML={{ __html: ceHtml }}
            style={{ background: "transparent" }}
          />
          {catsEffectComment && (
            <p className="mt-3 border-t border-[var(--color-border)] pt-3 text-xs text-[var(--color-text-muted)]">
              {catsEffectComment}
            </p>
          )}
        </div>
      </div>

      {/* ZIO column (blue) - what you're learning */}
      <div className="overflow-hidden rounded border border-[var(--color-border-focus)] bg-[var(--color-zio-bg)]">
        <div className="border-b border-[var(--color-border-focus)] px-4 py-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-[var(--color-zio)]">
            ZIO
          </span>
        </div>
        <div className="p-4">
          <div
            className="shiki-container text-sm"
            dangerouslySetInnerHTML={{ __html: zioHtml }}
            style={{ background: "transparent" }}
          />
          {zioComment && (
            <p className="mt-3 border-t border-[var(--color-border)] pt-3 text-xs text-[var(--color-text-muted)]">
              {zioComment}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
