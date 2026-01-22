/**
 * MDX component mapping for custom MDX elements.
 *
 * Maps MDX elements to React components for rendering in content pages.
 *
 * @example
 * ```tsx
 * import { MDXComponents } from "@/components/mdx/MDXComponents"
 * import { useMDXComponents } from "@mdx-js/react"
 *
 * export function useCustomMDXComponents(components: MDXComponents) {
 *   return useMDXComponents(components)
 * }
 * ```
 */

import type { BundledLanguage } from "shiki"
import { Callout } from "../ui/Callout"
import { CodeBlock } from "../ui/CodeBlock"
import { SideBySide } from "../ui/SideBySide"

/**
 * Props for code elements in MDX.
 */
interface CodeProps {
  readonly children: string
  readonly className?: string
}

/**
 * Props for pre elements in MDX.
 */
interface PreProps {
  readonly children: React.ReactElement<CodeProps>
}

/**
 * Extract language from className (e.g., "language-bash" -> "bash").
 */
function extractLanguage(className: string | undefined): BundledLanguage | "plaintext" {
  if (!className) return "plaintext"
  const match = className.match(/language-(\w+)/)
  return (match?.[1] as BundledLanguage) ?? "plaintext"
}

/**
 * Map pre > code elements to CodeBlock component.
 *
 * This handles both single-line and multi-line code blocks.
 */
export function Pre({ children }: PreProps) {
  const codeElement = children as React.ReactElement<CodeProps>
  const code = codeElement.props.children
  const language = extractLanguage(codeElement.props.className)

  return <CodeBlock code={code} language={language as BundledLanguage} />
}

/**
 * Map inline code elements to styled span.
 */
export function Code({ children, className }: CodeProps) {
  const language = extractLanguage(className)

  // If this is inside a pre block, let Pre handle it
  if (language !== "plaintext") {
    return <code className={className}>{children}</code>
  }

  return (
    <code className="rounded bg-[var(--color-surface)] px-1.5 py-0.5 text-sm text-[var(--color-text)]">
      {children}
    </code>
  )
}

/**
 * MDX component mappings.
 *
 * These components are available for use in MDX content.
 */
export const mdxComponents = {
  pre: Pre,
  code: Code,
  SideBySide,
  Callout,
  // TODO: Implement InteractiveTerminal component (task 8.2)
  // Terminal: InteractiveTerminal,
}

/**
 * Type for MDX components.
 */
export type MDXComponents = typeof mdxComponents
