/**
 * CodeBlock - Simple terminal-style code block.
 *
 * @example
 * ```tsx
 * <CodeBlock code="jj status" language="bash" />
 * ```
 */

interface CodeBlockProps {
  /**
   * The code to display.
   */
  readonly code: string

  /**
   * The language (for future use, currently unused).
   */
  readonly language: string
}

/**
 * Simple code block with terminal aesthetic.
 */
export function CodeBlock({ code }: CodeBlockProps) {
  return (
    <pre className="my-4 overflow-x-auto rounded border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
      <code className="text-sm !text-[var(--color-accent)]">{code}</code>
    </pre>
  )
}
