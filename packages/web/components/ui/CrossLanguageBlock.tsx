/**
 * CrossLanguageBlock - Side-by-side ZIO (Scala) vs Effect (TypeScript) code comparison.
 *
 * Displays two code blocks side by side for comparing ZIO and Effect code.
 * Tutorial direction: ZIO (what you know) → Effect (what you're learning).
 * ZIO shown on left (red #DC322F), Effect on right (blue #3178C6).
 *
 * Uses server-side Shiki highlighting to avoid flash of unstyled content.
 *
 * @example
 * ```tsx
 * <CrossLanguageBlock
 *   zioCode="ZIO.succeed(42)"
 *   effectCode="Effect.succeed(42)"
 *   zioComment="ZIO 2 syntax"
 *   effectComment="Effect equivalent"
 * />
 * ```
 */

import { codeToHtml } from "shiki"

interface CrossLanguageBlockProps {
  /**
   * ZIO (Scala) code to display (left column).
   */
  readonly zioCode: string

  /**
   * Effect (TypeScript) code to display (right column).
   */
  readonly effectCode: string

  /**
   * Optional comment for ZIO code.
   */
  readonly zioComment?: string

  /**
   * Optional comment for Effect code.
   */
  readonly effectComment?: string
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
 * Side-by-side comparison block for cross-language code.
 *
 * Shows ZIO (Scala) code (red) on the left and Effect (TypeScript) code (blue) on the right.
 * This matches the tutorial direction: ZIO → Effect.
 * Uses server-side Shiki highlighting for instant rendering without flash.
 */
export async function CrossLanguageBlock({
  zioCode,
  effectCode,
  zioComment,
  effectComment,
}: CrossLanguageBlockProps) {
  // Server-side syntax highlighting - no loading state needed
  const [zioHtml, effectHtml] = await Promise.all([
    codeToHtml(normalizeCode(zioCode), {
      lang: "scala",
      theme: "github-dark",
    }),
    codeToHtml(normalizeCode(effectCode), {
      lang: "typescript",
      theme: "github-dark",
    }),
  ])

  return (
    <div className="my-6 grid grid-cols-1 gap-4 md:grid-cols-2">
      {/* ZIO column (red) - what you know */}
      <div className="overflow-hidden rounded border border-[var(--color-border-focus)] bg-[var(--color-zio-bg)]">
        <div className="border-b border-[var(--color-border-focus)] px-4 py-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-[var(--color-zio)]">
            ZIO (Scala)
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

      {/* Effect column (blue) - what you're learning */}
      <div className="overflow-hidden rounded border border-[var(--color-border-focus)] bg-[var(--color-effect-bg)]">
        <div className="border-b border-[var(--color-border-focus)] px-4 py-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-[var(--color-effect)]">
            Effect (TypeScript)
          </span>
        </div>
        <div className="p-4">
          <div
            className="shiki-container text-sm"
            dangerouslySetInnerHTML={{ __html: effectHtml }}
            style={{ background: "transparent" }}
          />
          {effectComment && (
            <p className="mt-3 border-t border-[var(--color-border)] pt-3 text-xs text-[var(--color-text-muted)]">
              {effectComment}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
