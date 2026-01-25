/**
 * ScastieEmbed - Embeddable Scala playground component.
 *
 * Uses Scastie's embedded.js API to provide an interactive Scala playground.
 * Falls back to static code display if Scastie is unavailable.
 *
 * @example
 * ```tsx
 * <ScastieEmbed
 *   code="val x = 42"
 *   scalaVersion="3.3.1"
 *   dependencies={["org.typelevel::cats-effect::3.5.0"]}
 *   theme="dark"
 * />
 * ```
 */

"use client"

import { useEffect, useRef, useState } from "react"

declare global {
  interface Window {
    ScastieEmbed?: (
      embedId: string,
      code: string,
      options: {
        readonly theme?: "light" | "dark"
        readonly scalaVersion?: string
        readonly dependencies?: readonly string[]
        readonly isWorksheetMode?: boolean
        readonly sbtConfig?: string
        readonly targetType?: "jvm" | "js" | "dotty" | "typelevel"
        readonly base64UUID?: string
        readonly user?: string
        readonly update?: number
      },
    ) => void
  }
}

interface ScastieEmbedProps {
  /**
   * The Scala code to display in the playground.
   * Not used when snippetId is provided.
   */
  readonly code?: string

  /**
   * Base64 UUID of a saved Scastie snippet to embed.
   * When provided, the code prop is ignored and the saved snippet is loaded.
   *
   * @example
   * ```tsx
   * <ScastieEmbed snippetId="CJ8KTL98QAiWvoVUPI3kXg" />
   * ```
   */
  readonly snippetId?: string

  /**
   * Username for user-specific snippets.
   * Use with snippetId to load a user's saved snippet.
   *
   * @example
   * ```tsx
   * <ScastieEmbed
   *   snippetId="33D4P3ysQCq2em2MRiv5sQ"
   *   user="MasseGuillaume"
   * />
   * ```
   */
  readonly user?: string

  /**
   * Update index for snippet version.
   * Use with snippetId and user to load a specific version.
   *
   * @example
   * ```tsx
   * <ScastieEmbed
   *   snippetId="33D4P3ysQCq2em2MRiv5sQ"
   *   user="MasseGuillaume"
   *   update={1}
   * />
   * ```
   */
  readonly update?: number

  /**
   * Scala version (default: "3.3.1").
   * Only used when snippetId is not provided.
   */
  readonly scalaVersion?: string

  /**
   * List of dependencies (e.g., ["org.typelevel::cats-effect::3.5.0"]).
   * Only used when snippetId is not provided.
   */
  readonly dependencies?: readonly string[]

  /**
   * Whether to use worksheet mode (default: false).
   * Only used when snippetId is not provided.
   */
  readonly isWorksheetMode?: boolean

  /**
   * Additional sbt configuration (default: "").
   * Only used when snippetId is not provided.
   */
  readonly sbtConfig?: string

  /**
   * Target type for compilation (default: "jvm").
   * Only used when snippetId is not provided.
   */
  readonly targetType?: "jvm" | "js" | "dotty" | "typelevel"

  /**
   * Theme for the playground (default: "dark").
   */
  readonly theme?: "light" | "dark"

  /**
   * Fallback content to show if Scastie fails to load.
   */
  readonly fallback?: React.ReactNode
}

/**
 * Script loader status for Scastie.
 */
type ScriptLoadStatus = "loading" | "loaded" | "error" | "timeout"

// Track script loading state (monitored for debugging)
const scriptLoadState: { status: ScriptLoadStatus } = { status: "loading" }
let scriptLoadPromise: Promise<boolean> | null = null

/**
 * Load Scastie embedded.js script once.
 */
function loadScastieScript(): Promise<boolean> {
  if (scriptLoadPromise) {
    return scriptLoadPromise
  }

  scriptLoadPromise = new Promise((resolve) => {
    // Check if already loaded
    if (typeof window !== "undefined" && window.ScastieEmbed) {
      scriptLoadState.status = "loaded"
      resolve(true)
      return
    }

    // Set timeout for script loading
    const timeoutId = setTimeout(() => {
      scriptLoadState.status = "timeout"
      console.warn("Scastie script loading timed out after 10s")
      resolve(false)
    }, 10000)

    // Load script
    const script = document.createElement("script")
    script.src = "https://scastie.scala-lang.org/embedded.js"
    script.async = true
    script.onload = () => {
      clearTimeout(timeoutId)
      scriptLoadState.status = "loaded"
      resolve(true)
    }
    script.onerror = () => {
      clearTimeout(timeoutId)
      scriptLoadState.status = "error"
      console.error("Failed to load Scastie script")
      resolve(false)
    }

    document.head.appendChild(script)
  })

  return scriptLoadPromise
}

/**
 * Scastie playground embed component.
 *
 * Displays an interactive Scala playground using Scastie's embedded API.
 * Falls back to static code display if Scastie is unavailable.
 *
 * Supports two modes:
 * 1. Saved snippet: Provide `snippetId` to load a pre-configured snippet
 * 2. Inline code: Provide `code` with optional scalaVersion, dependencies, etc.
 */
export function ScastieEmbed({
  code = "",
  snippetId,
  user,
  update,
  scalaVersion = "3.3.1",
  dependencies = [],
  isWorksheetMode = false,
  sbtConfig = "",
  targetType = "jvm",
  theme = "dark",
  fallback,
}: ScastieEmbedProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [isLoaded, setIsLoaded] = useState(false)
  const [hasError, setHasError] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function loadAndEmbed() {
      if (cancelled) return

      const scriptLoaded = await loadScastieScript()

      if (cancelled) return

      if (!scriptLoaded) {
        setHasError(true)
        return
      }

      setIsLoaded(true)

      // Embed the code
      if (containerRef.current && typeof window.ScastieEmbed === "function") {
        try {
          const embedId = `scastie-${Math.random().toString(36).substr(2, 9)}`
          containerRef.current.id = embedId

          // Build options based on mode
          const options = snippetId
            ? ({
                theme,
                base64UUID: snippetId,
                ...(user !== undefined && { user }),
                ...(update !== undefined && { update }),
              } as const)
            : ({
                theme,
                scalaVersion,
                dependencies: dependencies as string[],
                isWorksheetMode,
                ...(sbtConfig && { sbtConfig }),
                targetType,
              } as const)

          window.ScastieEmbed(embedId, code, options)
        } catch (error) {
          console.error("Error embedding Scastie:", error)
          setHasError(true)
        }
      }
    }

    loadAndEmbed()

    return () => {
      cancelled = true
    }
  }, [code, snippetId, user, update, theme, scalaVersion, dependencies, isWorksheetMode, sbtConfig, targetType])

  // Fallback: static code block
  if (hasError || !isLoaded) {
    if (fallback) {
      return <>{fallback}</>
    }

    return (
      <div className="my-4 rounded border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
        <pre className="overflow-x-auto text-sm text-[var(--color-text)]">
          <code>{code}</code>
        </pre>
        {!isLoaded && (
          <p className="mt-2 text-xs text-[var(--color-text-muted)]">
            Loading Scala playground...
          </p>
        )}
        {hasError && (
          <p className="mt-2 text-xs text-[var(--color-warning)]">
            Scala playground unavailable. Run locally to try the code.
          </p>
        )}
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      className="my-4 overflow-hidden rounded border border-[var(--color-border)]"
      style={{ minHeight: "300px" }}
    />
  )
}
