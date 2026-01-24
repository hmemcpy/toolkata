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
        readonly theme: "light" | "dark"
        readonly scalaVersion: string
        readonly dependencies: readonly string[]
      },
    ) => void
  }
}

interface ScastieEmbedProps {
  /**
   * The Scala code to display in the playground.
   */
  readonly code: string

  /**
   * Scala version (default: "3.3.1").
   */
  readonly scalaVersion?: string

  /**
   * List of dependencies (e.g., ["org.typelevel::cats-effect::3.5.0"]).
   */
  readonly dependencies?: readonly string[]

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
 */
export function ScastieEmbed({
  code,
  scalaVersion = "3.3.1",
  dependencies = [],
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

          window.ScastieEmbed(embedId, code, {
            theme,
            scalaVersion,
            dependencies: dependencies as string[],
          })
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
  }, [code, theme, scalaVersion, dependencies])

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
