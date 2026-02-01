"use client"

import { Component, useCallback, useEffect, useMemo, useState } from "react"
import type { ReactNode } from "react"
import { serialize } from "next-mdx-remote/serialize"
import { MDXRemote, type MDXRemoteSerializeResult } from "next-mdx-remote"
import { useDebouncedCallback } from "use-debounce"
import remarkGfm from "remark-gfm"
import { mdxComponents } from "@/components/mdx/MDXComponents"

/**
 * Frontmatter schema for MDX content.
 */
interface Frontmatter {
  readonly title?: string
  readonly step?: number
  readonly description?: string
  readonly gitCommands?: readonly string[]
  readonly jjCommands?: readonly string[]
  readonly [key: string]: unknown
}

/**
 * Props for MDXPreview component.
 */
interface MDXPreviewProps {
  /** Raw MDX content to preview */
  readonly content: string
  /** Optional parsed frontmatter (if available externally) */
  readonly frontmatter?: Frontmatter
  /** Error message from parent (e.g., syntax error in frontmatter) */
  readonly error?: string
  /** Debounce delay in ms for preview updates (default: 500) */
  readonly debounceDelay?: number
  /** Callback when scroll position changes (for sync scroll) */
  readonly onScroll?: (scrollTop: number, scrollHeight: number) => void
  /** External scroll position to sync to (percentage 0-1) */
  readonly scrollPosition?: number
}

/**
 * Compile state for MDX content.
 */
interface CompileState {
  readonly status: "idle" | "compiling" | "success" | "error"
  readonly compiled?: MDXRemoteSerializeResult<Record<string, unknown>, Frontmatter>
  readonly error?: string
}

/**
 * Error boundary for catching render errors in MDX.
 */
interface ErrorBoundaryState {
  readonly hasError: boolean
  readonly error?: Error
}

interface ErrorBoundaryProps {
  readonly children: ReactNode
  readonly fallback: (error: Error) => ReactNode
  readonly onError?: (error: Error) => void
}

class MDXErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  override componentDidCatch(error: Error) {
    this.props.onError?.(error)
  }

  override render() {
    if (this.state.hasError && this.state.error) {
      return this.props.fallback(this.state.error)
    }

    return this.props.children
  }
}

/**
 * Parse frontmatter from MDX content.
 * Simple YAML-like frontmatter parsing.
 */
function parseFrontmatter(content: string): { frontmatter: Frontmatter; body: string } {
  const lines = content.split("\n")
  if (lines[0]?.trim() !== "---") {
    return { frontmatter: {}, body: content }
  }

  let endIndex = -1
  for (let i = 1; i < lines.length; i++) {
    if (lines[i]?.trim() === "---") {
      endIndex = i
      break
    }
  }

  if (endIndex === -1) {
    return { frontmatter: {}, body: content }
  }

  const frontmatterLines = lines.slice(1, endIndex)
  const frontmatter: Record<string, unknown> = {}

  for (const line of frontmatterLines) {
    const colonIndex = line.indexOf(":")
    if (colonIndex === -1) continue

    const key = line.slice(0, colonIndex).trim()
    const valueRaw = line.slice(colonIndex + 1).trim()

    // Handle arrays like ["item1", "item2"]
    if (valueRaw.startsWith("[") && valueRaw.endsWith("]")) {
      try {
        frontmatter[key] = JSON.parse(valueRaw.replace(/'/g, '"'))
      } catch {
        frontmatter[key] = valueRaw
      }
    } else if (valueRaw.startsWith('"') && valueRaw.endsWith('"')) {
      frontmatter[key] = valueRaw.slice(1, -1)
    } else if (!Number.isNaN(Number(valueRaw))) {
      frontmatter[key] = Number(valueRaw)
    } else {
      frontmatter[key] = valueRaw
    }
  }

  const body = lines.slice(endIndex + 1).join("\n")
  return { frontmatter, body }
}

/**
 * MDXPreview component.
 *
 * Live preview of MDX content with app components.
 *
 * Features:
 * - Compiles MDX on the client with debouncing
 * - Uses the same components as the production site
 * - Error boundary for catching render errors
 * - Frontmatter display
 * - Sync scroll with editor (optional)
 *
 * Follows the terminal aesthetic design system.
 *
 * @example
 * ```tsx
 * <MDXPreview
 *   content={mdxContent}
 *   debounceDelay={500}
 * />
 * ```
 */
export function MDXPreview(props: MDXPreviewProps) {
  const {
    content,
    frontmatter: externalFrontmatter,
    error: externalError,
    debounceDelay = 500,
    onScroll,
    scrollPosition,
  } = props

  const [compileState, setCompileState] = useState<CompileState>({
    status: "idle",
  })
  const [renderError, setRenderError] = useState<Error | null>(null)

  // Parse frontmatter from content
  const { frontmatter: parsedFrontmatter } = useMemo(
    () => parseFrontmatter(content),
    [content],
  )

  // Use external frontmatter if provided, otherwise use parsed
  const frontmatter = externalFrontmatter ?? parsedFrontmatter

  // Compile MDX content
  const compileMDX = useCallback(async (mdxContent: string) => {
    if (!mdxContent.trim()) {
      setCompileState({ status: "idle" })
      return
    }

    setCompileState((prev) => ({ ...prev, status: "compiling" }))
    setRenderError(null)

    try {
      const { body: bodyContent } = parseFrontmatter(mdxContent)

      const compiled = await serialize<Record<string, unknown>, Frontmatter>(
        bodyContent,
        {
          mdxOptions: {
            remarkPlugins: [remarkGfm],
            format: "mdx",
            development: false,
          },
          parseFrontmatter: false,
        },
      )

      setCompileState({
        status: "success",
        compiled,
      })
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err)
      setCompileState({
        status: "error",
        error: errorMessage,
      })
    }
  }, [])

  // Debounced compile
  const debouncedCompile = useDebouncedCallback(compileMDX, debounceDelay)

  // Trigger compile when content changes
  useEffect(() => {
    debouncedCompile(content)
  }, [content, debouncedCompile])

  // Handle scroll events for sync
  const handleScroll = useCallback(
    (e: React.UIEvent<HTMLDivElement>) => {
      const target = e.target as HTMLDivElement
      onScroll?.(target.scrollTop, target.scrollHeight)
    },
    [onScroll],
  )

  // Sync scroll position from external source (percentage 0-1)
  useEffect(() => {
    if (scrollPosition !== undefined) {
      const previewElement = document.getElementById("mdx-preview-scroll")
      if (previewElement) {
        // Convert percentage to actual scroll position
        const targetScrollTop = scrollPosition * previewElement.scrollHeight
        previewElement.scrollTop = targetScrollTop
      }
    }
  }, [scrollPosition])

  // Handle render error
  const handleRenderError = useCallback((error: Error) => {
    setRenderError(error)
  }, [])

  // Determine display error
  const displayError = externalError ?? compileState.error ?? renderError?.message

  return (
    <div className="flex flex-col h-full bg-[var(--color-surface)]">
      {/* Header */}
      <div className="flex items-center gap-3 px-3 py-2 border-b border-[var(--color-border)] bg-[var(--color-bg)]">
        <span className="text-xs font-mono text-[var(--color-text-muted)]">Preview</span>

        {/* Compile status */}
        {compileState.status === "compiling" && (
          <span className="text-xs font-mono text-[var(--color-text-dim)] animate-pulse">
            Compiling...
          </span>
        )}
        {compileState.status === "success" && !displayError && (
          <span className="text-xs font-mono text-[var(--color-accent)]">Ready</span>
        )}
        {displayError && (
          <span className="text-xs font-mono text-[var(--color-error)]">Error</span>
        )}
      </div>

      {/* Frontmatter display */}
      {frontmatter.title && (
        <div className="px-4 py-3 border-b border-[var(--color-border)] bg-[rgba(57,217,108,0.05)]">
          <h1 className="text-lg font-semibold text-[var(--color-text)] font-mono">
            {frontmatter.title}
          </h1>
          {frontmatter.description && (
            <p className="text-sm text-[var(--color-text-muted)] mt-1">
              {frontmatter.description}
            </p>
          )}
          {frontmatter.step !== undefined && (
            <span className="inline-block mt-2 px-2 py-0.5 text-xs font-mono bg-[var(--color-bg)] border border-[var(--color-border)] rounded">
              Step {frontmatter.step}
            </span>
          )}
        </div>
      )}

      {/* Error display */}
      {displayError && (
        <div className="px-4 py-3 border-b border-[var(--color-border)] bg-[rgba(255,65,54,0.1)]">
          <div className="flex items-start gap-2">
            <span className="text-[var(--color-error)]">!</span>
            <div>
              <p className="text-sm font-mono text-[var(--color-error)] font-semibold">
                Preview Error
              </p>
              <pre className="mt-1 text-xs font-mono text-[var(--color-error)] whitespace-pre-wrap overflow-x-auto max-h-32 overflow-y-auto">
                {displayError}
              </pre>
            </div>
          </div>
        </div>
      )}

      {/* Preview content */}
      <div
        id="mdx-preview-scroll"
        className="flex-1 overflow-auto px-4 py-6"
        onScroll={handleScroll}
      >
        {compileState.status === "idle" && !content.trim() && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <span className="text-4xl mb-4">!</span>
            <p className="text-sm text-[var(--color-text-muted)] font-mono">
              No content to preview
            </p>
            <p className="text-xs text-[var(--color-text-dim)] font-mono mt-1">
              Start typing MDX in the editor
            </p>
          </div>
        )}

        {compileState.status === "compiling" && (
          <div className="flex items-center justify-center h-32">
            <span className="text-sm font-mono text-[var(--color-text-dim)] animate-pulse">
              Compiling MDX...
            </span>
          </div>
        )}

        {compileState.status === "success" && compileState.compiled && !displayError && (
          <MDXErrorBoundary
            fallback={(error) => (
              <div className="p-4 border border-[var(--color-error)] rounded bg-[rgba(255,65,54,0.1)]">
                <p className="text-sm font-mono text-[var(--color-error)] font-semibold">
                  Render Error
                </p>
                <pre className="mt-2 text-xs font-mono text-[var(--color-error)] whitespace-pre-wrap">
                  {error.message}
                </pre>
              </div>
            )}
            onError={handleRenderError}
          >
            <article className="prose prose-invert max-w-none prose-pre:bg-[var(--color-bg)] prose-pre:border prose-pre:border-[var(--color-border)] prose-pre:rounded prose-code:text-[var(--color-accent)] prose-code:before:content-none prose-code:after:content-none prose-headings:font-mono prose-headings:text-[var(--color-text)] prose-p:text-[var(--color-text-muted)] prose-strong:text-[var(--color-text)] prose-a:text-[var(--color-accent)] prose-a:no-underline hover:prose-a:underline">
              <MDXRemote {...compileState.compiled} components={mdxComponents} />
            </article>
          </MDXErrorBoundary>
        )}

        {compileState.status === "error" && (
          <div className="flex flex-col items-center justify-center h-32 text-center">
            <span className="text-2xl mb-2 text-[var(--color-error)]">!</span>
            <p className="text-sm text-[var(--color-error)] font-mono">
              Failed to compile MDX
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

/**
 * Skeleton loader for MDXPreview.
 */
export function MDXPreviewSkeleton() {
  return (
    <div className="flex flex-col h-full bg-[var(--color-surface)]">
      {/* Header skeleton */}
      <div className="flex items-center gap-3 px-3 py-2 border-b border-[var(--color-border)] bg-[var(--color-bg)]">
        <div className="h-4 w-16 bg-[var(--color-border)] rounded animate-pulse" />
      </div>

      {/* Content skeleton */}
      <div className="flex-1 p-4 space-y-4">
        <div className="h-6 w-3/4 bg-[var(--color-border)] rounded animate-pulse" />
        <div className="space-y-2">
          <div className="h-4 w-full bg-[var(--color-border)] rounded animate-pulse" />
          <div className="h-4 w-5/6 bg-[var(--color-border)] rounded animate-pulse" />
          <div className="h-4 w-4/5 bg-[var(--color-border)] rounded animate-pulse" />
        </div>
        <div className="h-24 w-full bg-[var(--color-border)] rounded animate-pulse" />
        <div className="space-y-2">
          <div className="h-4 w-full bg-[var(--color-border)] rounded animate-pulse" />
          <div className="h-4 w-2/3 bg-[var(--color-border)] rounded animate-pulse" />
        </div>
      </div>
    </div>
  )
}
