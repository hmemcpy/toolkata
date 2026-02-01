"use client"

import { useCallback, useMemo } from "react"
import type { SnippetValidationResult, SnippetError } from "@/services/cms-client"

/**
 * ValidationPanel component props.
 */
interface ValidationPanelProps {
  /** Validation results to display */
  readonly results: readonly SnippetValidationResult[]
  /** Callback when an error is clicked (jumps to line in editor) */
  readonly onErrorClick: (file: string, line: number) => void
  /** Callback when the panel is dismissed */
  readonly onDismiss: () => void
  /** Callback to re-run validation */
  readonly onRerun?: () => void
  /** Whether validation is in progress */
  readonly isValidating?: boolean
}

/**
 * Get icon for error type.
 */
function getErrorIcon(type: SnippetError["type"]): string {
  switch (type) {
    case "syntax":
      return "⚠"
    case "compilation":
      return "✕"
    case "runtime":
      return "⚡"
    case "missing-image":
      return "🖼"
    default:
      return "•"
  }
}

/**
 * Get color class for error type.
 */
function getErrorColorClass(type: SnippetError["type"]): string {
  switch (type) {
    case "syntax":
      return "text-[var(--color-warning)]"
    case "compilation":
      return "text-[var(--color-error)]"
    case "runtime":
      return "text-[var(--color-error)]"
    case "missing-image":
      return "text-[var(--color-warning)]"
    default:
      return "text-[var(--color-text-muted)]"
  }
}

/**
 * Get background color class for error type.
 */
function getErrorBgClass(type: SnippetError["type"]): string {
  switch (type) {
    case "syntax":
      return "bg-[rgba(255,220,0,0.1)] hover:bg-[rgba(255,220,0,0.15)]"
    case "compilation":
      return "bg-[rgba(255,65,54,0.1)] hover:bg-[rgba(255,65,54,0.15)]"
    case "runtime":
      return "bg-[rgba(255,65,54,0.1)] hover:bg-[rgba(255,65,54,0.15)]"
    case "missing-image":
      return "bg-[rgba(255,220,0,0.1)] hover:bg-[rgba(255,220,0,0.15)]"
    default:
      return "bg-[var(--color-surface-hover)] hover:bg-[var(--color-border)]"
  }
}

/**
 * Get file name from path.
 */
function getFileName(path: string): string {
  const parts = path.split("/")
  return parts[parts.length - 1] ?? path
}

/**
 * ValidationPanel component.
 *
 * Shows validation errors from snippet validation.
 *
 * Features:
 * - Error list with line numbers
 * - Severity icons by error type
 * - Click to jump to line in editor
 * - Summary badge showing total errors/files
 * - Re-run validation button
 * - Dismissible
 *
 * Follows the terminal aesthetic design system.
 *
 * @example
 * ```tsx
 * <ValidationPanel
 *   results={validationResults}
 *   onErrorClick={(file, line) => jumpToLine(file, line)}
 *   onDismiss={() => setShowValidation(false)}
 *   onRerun={() => runValidation()}
 * />
 * ```
 */
export function ValidationPanel(props: ValidationPanelProps) {
  const { results, onErrorClick, onDismiss, onRerun, isValidating } = props

  // Calculate summary statistics
  const summary = useMemo(() => {
    let totalErrors = 0
    let filesWithErrors = 0
    let filesValid = 0

    for (const result of results) {
      if (result.valid) {
        filesValid++
      } else {
        filesWithErrors++
        totalErrors += result.errors.length
      }
    }

    return { totalErrors, filesWithErrors, filesValid, totalFiles: results.length }
  }, [results])

  // Handle error click
  const handleErrorClick = useCallback(
    (file: string, line: number) => {
      onErrorClick(file, line)
    },
    [onErrorClick],
  )

  // Check if all validation passed
  const allPassed = summary.totalErrors === 0 && summary.totalFiles > 0

  return (
    <div className="flex flex-col bg-[var(--color-surface)] border-t border-[var(--color-border)] max-h-64 overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-3 py-2 border-b border-[var(--color-border)] bg-[var(--color-bg)]">
        {/* Summary badge */}
        <div
          className={`flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-mono ${
            allPassed
              ? "bg-[var(--color-accent-glow)] text-[var(--color-accent)]"
              : "bg-[rgba(255,65,54,0.1)] text-[var(--color-error)]"
          }`}
        >
          {allPassed ? (
            <>
              <span>✓</span>
              <span>All {summary.totalFiles} files valid</span>
            </>
          ) : (
            <>
              <span>✕</span>
              <span>
                {summary.totalErrors} error{summary.totalErrors !== 1 ? "s" : ""} in{" "}
                {summary.filesWithErrors} file{summary.filesWithErrors !== 1 ? "s" : ""}
              </span>
            </>
          )}
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Re-run button */}
        {onRerun && (
          <button
            type="button"
            onClick={onRerun}
            disabled={isValidating}
            className="px-2 py-1 text-xs font-mono text-[var(--color-text-muted)] hover:text-[var(--color-accent)] border border-[var(--color-border)] rounded hover:border-[var(--color-accent)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Re-run validation"
          >
            {isValidating ? "[...]" : "[↻] Re-run"}
          </button>
        )}

        {/* Dismiss button */}
        <button
          type="button"
          onClick={onDismiss}
          className="p-1 text-xs font-mono text-[var(--color-text-dim)] hover:text-[var(--color-text)] transition-colors"
          aria-label="Dismiss validation panel"
        >
          ✕
        </button>
      </div>

      {/* Error list */}
      <div className="flex-1 overflow-y-auto">
        {results.length === 0 ? (
          <div className="flex items-center justify-center h-full p-4">
            <p className="text-sm font-mono text-[var(--color-text-dim)]">
              No validation results
            </p>
          </div>
        ) : allPassed ? (
          <div className="flex items-center justify-center h-full p-4">
            <div className="text-center">
              <span className="text-2xl mb-2 block">✓</span>
              <p className="text-sm font-mono text-[var(--color-accent)]">
                All snippets validated successfully
              </p>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-[var(--color-border)]">
            {results
              .filter((r) => !r.valid)
              .map((result) => (
                <div key={result.file} className="py-2 px-3">
                  {/* File header */}
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-xs font-mono text-[var(--color-text-dim)]">📄</span>
                    <span className="text-xs font-mono text-[var(--color-text)] truncate">
                      {getFileName(result.file)}
                    </span>
                    <span className="text-xs font-mono text-[var(--color-text-dim)]">
                      ({result.errors.length} error{result.errors.length !== 1 ? "s" : ""})
                    </span>
                  </div>

                  {/* Errors */}
                  <div className="space-y-1 ml-4">
                    {result.errors.map((error, errorIndex) => (
                      <button
                        key={`${result.file}-${error.line}-${errorIndex}`}
                        type="button"
                        onClick={() => handleErrorClick(result.file, error.line)}
                        className={`w-full flex items-start gap-2 px-2 py-1.5 rounded text-left transition-colors ${getErrorBgClass(error.type)}`}
                      >
                        {/* Icon */}
                        <span
                          className={`text-xs flex-shrink-0 mt-0.5 ${getErrorColorClass(error.type)}`}
                        >
                          {getErrorIcon(error.type)}
                        </span>

                        {/* Line number */}
                        <span className="text-xs font-mono text-[var(--color-text-dim)] flex-shrink-0">
                          L{error.line}
                          {error.column !== undefined ? `:${error.column}` : ""}
                        </span>

                        {/* Message */}
                        <span className="text-xs font-mono text-[var(--color-text)] flex-1 break-words">
                          {error.message}
                        </span>

                        {/* Error type badge */}
                        <span
                          className={`text-[10px] font-mono px-1 py-0.5 rounded ${getErrorColorClass(error.type)} opacity-70 flex-shrink-0`}
                        >
                          {error.type}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  )
}

/**
 * Compact validation summary badge.
 *
 * Use this to show a summary in the toolbar without the full panel.
 */
export function ValidationSummary(props: {
  readonly results: readonly SnippetValidationResult[]
  readonly onClick: () => void
  readonly isValidating?: boolean
}) {
  const { results, onClick, isValidating } = props

  const summary = useMemo(() => {
    let totalErrors = 0
    for (const result of results) {
      if (!result.valid) {
        totalErrors += result.errors.length
      }
    }
    return { totalErrors, totalFiles: results.length }
  }, [results])

  if (results.length === 0) {
    return null
  }

  const allPassed = summary.totalErrors === 0

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={isValidating}
      className={`flex items-center gap-1.5 px-2 py-1 rounded text-xs font-mono transition-colors ${
        allPassed
          ? "bg-[var(--color-accent-glow)] text-[var(--color-accent)] hover:bg-[rgba(57,217,108,0.2)]"
          : "bg-[rgba(255,65,54,0.1)] text-[var(--color-error)] hover:bg-[rgba(255,65,54,0.15)]"
      } disabled:opacity-50 disabled:cursor-not-allowed`}
      aria-label={
        allPassed
          ? "All files valid, click to view details"
          : `${summary.totalErrors} errors found, click to view`
      }
    >
      {isValidating ? (
        <>
          <span className="animate-spin">↻</span>
          <span>Validating...</span>
        </>
      ) : allPassed ? (
        <>
          <span>✓</span>
          <span>{summary.totalFiles} valid</span>
        </>
      ) : (
        <>
          <span>✕</span>
          <span>{summary.totalErrors} errors</span>
        </>
      )}
    </button>
  )
}
