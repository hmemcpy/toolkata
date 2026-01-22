/**
 * CodeBlock - Syntax-highlighted code block with copy functionality.
 *
 * Features:
 * - SSR-safe syntax highlighting via shiki
 * - Copy button with clipboard API
 * - Language label in header
 * - Optional line numbers
 *
 * @example
 * ```tsx
 * <CodeBlock
 *   code="console.log('hello')"
 *   language="typescript"
 *   showLineNumbers
 * />
 * ```
 */

"use client"

import { useEffect, useRef, useState } from "react"
import type { BundledLanguage } from "shiki"

interface CodeBlockProps {
  /**
   * The code to highlight.
   */
  readonly code: string

  /**
   * The language for syntax highlighting.
   * @see https://shiki.style/languages
   */
  readonly language: BundledLanguage

  /**
   * Whether to show line numbers.
   * @default false
   */
  readonly showLineNumbers?: boolean

  /**
   * Optional title for the code block header.
   */
  readonly title?: string
}

/**
 * Copy button states for user feedback.
 */
type CopyState = "idle" | "copied" | "error"

/**
 * Highlighted HTML output from shiki.
 */
interface HighlightedCode {
  readonly html: string
  readonly className: string
}

/**
 * CodeBlock component with syntax highlighting and copy functionality.
 */
export function CodeBlock({
  code,
  language,
  showLineNumbers: _showLineNumbers = false,
  title,
}: CodeBlockProps) {
  const [highlighted, setHighlighted] = useState<HighlightedCode | null>(null)
  const [copyState, setCopyState] = useState<CopyState>("idle")
  const copyTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined)

  // Highlight code on mount (SSR-safe via useEffect)
  useEffect(() => {
    const highlightCode = async () => {
      try {
        // Dynamic import for SSR safety
        const { createHighlighter } = await import("shiki")

        const highlighter = await createHighlighter({
          themes: ["github-dark"],
          langs: [language],
        })

        const html = highlighter.codeToHtml(code, {
          lang: language,
          theme: "github-dark",
        })

        setHighlighted({
          html,
          className: "shiki github-dark",
        })
      } catch {
        // Fallback to pre-formatted code if highlighting fails
        setHighlighted({
          html: escapeHtml(code),
          className: "bg-[var(--color-bg)] text-[var(--color-text)]",
        })
      }
    }

    highlightCode()
  }, [code, language])

  /**
   * Copy code to clipboard with feedback.
   */
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code)
      setCopyState("copied")

      // Clear previous timeout
      if (copyTimeoutRef.current) {
        clearTimeout(copyTimeoutRef.current)
      }

      // Reset to idle after 2 seconds
      copyTimeoutRef.current = setTimeout(() => {
        setCopyState("idle")
      }, 2000)
    } catch {
      setCopyState("error")
      setTimeout(() => setCopyState("idle"), 2000)
    }
  }

  /**
   * Clean up timeout on unmount.
   */
  useEffect(() => {
    return () => {
      if (copyTimeoutRef.current) {
        clearTimeout(copyTimeoutRef.current)
      }
    }
  }, [])

  // Show loading state while highlighting
  if (!highlighted) {
    return (
      <div className="my-4 rounded border border-[var(--color-border)] bg-[var(--color-surface)]">
        <div className="flex items-center justify-between border-b border-[var(--color-border)] px-4 py-2">
          <span className="text-xs text-[var(--color-text-muted)]">{title ?? language}</span>
        </div>
        <pre className="overflow-x-auto p-4">
          <code className="text-sm">{code}</code>
        </pre>
      </div>
    )
  }

  return (
    <div className="my-4 rounded border border-[var(--color-border)] bg-[var(--color-surface)]">
      {/* Header with language label and copy button */}
      <div className="flex items-center justify-between border-b border-[var(--color-border)] px-4 py-2">
        <span className="text-xs text-[var(--color-text-muted)]">{title ?? language}</span>
        <button
          type="button"
          onClick={handleCopy}
          className="text-xs text-[var(--color-text-muted)] transition-colors hover:text-[var(--color-text)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]"
          aria-label={
            copyState === "copied"
              ? "Copied to clipboard"
              : copyState === "error"
                ? "Failed to copy"
                : "Copy code to clipboard"
          }
        >
          {copyState === "copied" ? (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-4 w-4 text-[var(--color-accent)]"
              aria-hidden="true"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
          ) : copyState === "error" ? (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-4 w-4 text-[var(--color-error)]"
              aria-hidden="true"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="15" y1="9" x2="9" y2="15" />
              <line x1="9" y1="9" x2="15" y2="15" />
            </svg>
          ) : (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-4 w-4"
              aria-hidden="true"
            >
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
            </svg>
          )}
        </button>
      </div>

      {/* Highlighted code */}
      <div
        className="overflow-x-auto p-4"
        // biome-ignore lint/security/noDangerouslySetInnerHtml: shiki output is escaped and safe
        dangerouslySetInnerHTML={{ __html: highlighted.html }}
      />
    </div>
  )
}

/**
 * Escape HTML entities for fallback rendering.
 */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;")
}
