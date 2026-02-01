"use client"

import { useState, useCallback, useRef, useEffect } from "react"
import type { GitHubPullRequest, SnippetValidationResult } from "@/services/cms-client"

/**
 * PRDialog component props.
 */
interface PRDialogProps {
  /** Whether the dialog is open */
  readonly isOpen: boolean
  /** Callback when dialog is closed */
  readonly onClose: () => void
  /** Source branch with changes */
  readonly branch: string
  /** Target branch (default: main) */
  readonly baseBranch?: string
  /** Callback when PR is created */
  readonly onCreate: (title: string, body: string) => void
  /** Whether PR creation is in progress */
  readonly isLoading: boolean
  /** Error message to display */
  readonly error?: string
  /** Validation results for the branch */
  readonly validationResults?: readonly SnippetValidationResult[]
  /** Whether validation is in progress */
  readonly isValidating?: boolean
  /** Callback to run validation */
  readonly onValidate?: () => void
  /** Created PR info (shown after successful creation) */
  readonly createdPR?: GitHubPullRequest
}

/**
 * Default PR body template.
 */
const PR_BODY_TEMPLATE = `## Summary

<!-- Brief description of the changes -->

## Changes

<!-- List the changes made -->
-

## Testing

<!-- How to test the changes -->
- [ ] Content renders correctly
- [ ] Snippet validation passes
- [ ] No broken links

---
🤖 Created via Content CMS
`

/**
 * PRDialog component.
 *
 * Pull request creation dialog for the CMS.
 *
 * Features:
 * - Branch confirmation
 * - Title editor (auto-filled from commits)
 * - Body editor with template
 * - Create PR button
 * - Validation check before create
 * - Success state with PR link
 *
 * Follows the terminal aesthetic design system.
 *
 * @example
 * ```tsx
 * <PRDialog
 *   isOpen={showPRDialog}
 *   onClose={() => setShowPRDialog(false)}
 *   branch="feature/update-tutorial"
 *   onCreate={handleCreatePR}
 *   isLoading={isCreatingPR}
 *   validationResults={validationResults}
 * />
 * ```
 */
export function PRDialog(props: PRDialogProps) {
  const {
    isOpen,
    onClose,
    branch,
    baseBranch = "main",
    onCreate,
    isLoading,
    error,
    validationResults,
    isValidating,
    onValidate,
    createdPR,
  } = props

  // Form state
  const [title, setTitle] = useState("")
  const [body, setBody] = useState(PR_BODY_TEMPLATE)
  const [titleError, setTitleError] = useState<string | null>(null)

  // Refs
  const titleInputRef = useRef<HTMLInputElement>(null)
  const dialogRef = useRef<HTMLDivElement>(null)

  // Compute validation status
  const hasValidationErrors =
    validationResults?.some((r) => !r.valid && r.errors.length > 0) ?? false

  // Reset form when dialog opens
  useEffect(() => {
    if (isOpen) {
      // Auto-fill title from branch name
      const suggestedTitle = formatBranchAsTitle(branch)
      setTitle(suggestedTitle)
      setBody(PR_BODY_TEMPLATE)
      setTitleError(null)

      // Focus title input
      setTimeout(() => {
        titleInputRef.current?.focus()
        titleInputRef.current?.select()
      }, 50)
    }
  }, [isOpen, branch])

  // Handle escape key
  useEffect(() => {
    if (!isOpen) return

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && !isLoading) {
        onClose()
      }
    }

    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [isOpen, isLoading, onClose])

  // Handle title change
  const handleTitleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setTitle(value)
    setTitleError(validateTitle(value))
  }, [])

  // Handle body change
  const handleBodyChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setBody(e.target.value)
  }, [])

  // Handle form submission
  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault()

      const error = validateTitle(title)
      if (error) {
        setTitleError(error)
        return
      }

      onCreate(title.trim(), body.trim())
    },
    [title, body, onCreate],
  )

  // Handle close
  const handleClose = useCallback(() => {
    if (!isLoading) {
      onClose()
    }
  }, [isLoading, onClose])

  // Handle backdrop click
  const handleBackdropClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget && !isLoading) {
        onClose()
      }
    },
    [isLoading, onClose],
  )

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-50"
      onClick={handleBackdropClick}
      onKeyDown={(e) => {
        if (e.key === "Escape" && !isLoading) {
          onClose()
        }
      }}
      role="presentation"
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60" />

      {/* Dialog */}
      <div
        ref={dialogRef}
        className="relative bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg shadow-lg w-full max-w-xl mx-4 max-h-[90vh] overflow-hidden flex flex-col"
        role="dialog"
        aria-labelledby="pr-dialog-title"
        aria-modal="true"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--color-border)]">
          <h2
            id="pr-dialog-title"
            className="text-base font-mono font-semibold text-[var(--color-text)]"
          >
            {createdPR ? "Pull Request Created" : "Create Pull Request"}
          </h2>
          <button
            type="button"
            onClick={handleClose}
            disabled={isLoading}
            className="text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed p-1"
            aria-label="Close dialog"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {createdPR ? (
            // Success state
            <PRSuccessView pr={createdPR} onClose={onClose} />
          ) : (
            // Form
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Branch info */}
              <div className="flex items-center gap-2 text-sm font-mono text-[var(--color-text-muted)]">
                <span className="px-2 py-0.5 bg-[var(--color-surface-hover)] rounded">
                  {branch}
                </span>
                <span>→</span>
                <span className="px-2 py-0.5 bg-[var(--color-surface-hover)] rounded">
                  {baseBranch}
                </span>
              </div>

              {/* Error message */}
              {error && (
                <div className="p-3 text-sm font-mono text-[var(--color-error)] bg-[rgba(255,65,54,0.1)] border border-[var(--color-error)]/30 rounded">
                  {error}
                </div>
              )}

              {/* Validation status */}
              <ValidationStatusBadge
                {...(validationResults !== undefined ? { results: validationResults } : {})}
                {...(isValidating !== undefined ? { isValidating } : {})}
                {...(onValidate !== undefined ? { onValidate } : {})}
              />

              {/* Title input */}
              <div className="space-y-1">
                <label
                  htmlFor="pr-title"
                  className="block text-sm font-mono text-[var(--color-text-muted)]"
                >
                  Title
                </label>
                <input
                  ref={titleInputRef}
                  id="pr-title"
                  type="text"
                  value={title}
                  onChange={handleTitleChange}
                  placeholder="Enter PR title..."
                  className="w-full px-3 py-2 text-sm font-mono bg-[var(--color-bg)] border border-[var(--color-border)] rounded text-[var(--color-text)] placeholder-[var(--color-text-dim)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:border-[var(--color-accent)]"
                  aria-invalid={!!titleError}
                  aria-describedby={titleError ? "pr-title-error" : undefined}
                  disabled={isLoading}
                />
                {titleError && (
                  <p
                    id="pr-title-error"
                    className="text-xs font-mono text-[var(--color-error)]"
                  >
                    {titleError}
                  </p>
                )}
              </div>

              {/* Body textarea */}
              <div className="space-y-1">
                <label
                  htmlFor="pr-body"
                  className="block text-sm font-mono text-[var(--color-text-muted)]"
                >
                  Description
                </label>
                <textarea
                  id="pr-body"
                  value={body}
                  onChange={handleBodyChange}
                  placeholder="Describe your changes..."
                  rows={10}
                  className="w-full px-3 py-2 text-sm font-mono bg-[var(--color-bg)] border border-[var(--color-border)] rounded text-[var(--color-text)] placeholder-[var(--color-text-dim)] resize-y min-h-[150px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:border-[var(--color-accent)]"
                  disabled={isLoading}
                />
                <p className="text-xs font-mono text-[var(--color-text-dim)]">
                  Supports Markdown formatting
                </p>
              </div>
            </form>
          )}
        </div>

        {/* Footer */}
        {!createdPR && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-[var(--color-border)] bg-[var(--color-bg)]">
            {/* Validation warning */}
            {hasValidationErrors && (
              <p className="text-xs font-mono text-[var(--color-warning)]">
                ⚠ Content has validation errors
              </p>
            )}
            {!hasValidationErrors && <div />}

            {/* Actions */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleClose}
                disabled={isLoading}
                className="px-3 py-1.5 text-sm font-mono text-[var(--color-text)] border border-[var(--color-border)] rounded hover:bg-[var(--color-surface-hover)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isLoading || !!titleError || !title.trim()}
                className="px-3 py-1.5 text-sm font-mono text-[var(--color-bg)] bg-[var(--color-accent)] border border-[var(--color-accent)] rounded hover:bg-[var(--color-accent-hover)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-surface)]"
              >
                {isLoading ? "Creating..." : "Create Pull Request"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

/**
 * Format branch name as PR title.
 */
function formatBranchAsTitle(branchName: string): string {
  // Remove common prefixes
  let title = branchName
    .replace(/^(feature|fix|docs|refactor|chore|content)\//, "")
    .replace(/^cms-/, "")

  // Replace hyphens and underscores with spaces
  title = title.replace(/[-_]/g, " ")

  // Capitalize first letter
  title = title.charAt(0).toUpperCase() + title.slice(1)

  return title
}

/**
 * Validate PR title.
 */
function validateTitle(title: string): string | null {
  if (!title || title.trim() === "") {
    return "Title is required"
  }

  if (title.trim().length < 5) {
    return "Title must be at least 5 characters"
  }

  if (title.trim().length > 200) {
    return "Title must be less than 200 characters"
  }

  return null
}

/**
 * Validation status badge.
 */
function ValidationStatusBadge(props: {
  readonly results?: readonly SnippetValidationResult[]
  readonly isValidating?: boolean
  readonly onValidate?: () => void
}) {
  const { results, isValidating, onValidate } = props

  if (isValidating) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 text-sm font-mono text-[var(--color-text-muted)] bg-[var(--color-surface-hover)] rounded">
        <span className="animate-pulse">⟳</span>
        <span>Validating content...</span>
      </div>
    )
  }

  if (results === undefined) {
    return (
      <div className="flex items-center justify-between px-3 py-2 text-sm font-mono text-[var(--color-text-muted)] bg-[var(--color-surface-hover)] rounded">
        <span>Content not validated</span>
        {onValidate && (
          <button
            type="button"
            onClick={onValidate}
            className="text-[var(--color-accent)] hover:underline"
          >
            Run validation
          </button>
        )}
      </div>
    )
  }

  const errorCount = results.filter((r) => !r.valid).length
  const totalCount = results.length

  if (errorCount === 0) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 text-sm font-mono text-[var(--color-accent)] bg-[var(--color-accent-bg)] rounded">
        <span>✓</span>
        <span>
          {totalCount} {totalCount === 1 ? "file" : "files"} validated
        </span>
      </div>
    )
  }

  return (
    <div className="flex items-center justify-between px-3 py-2 text-sm font-mono text-[var(--color-warning)] bg-[rgba(249,115,22,0.1)] rounded">
      <div className="flex items-center gap-2">
        <span>⚠</span>
        <span>
          {errorCount} of {totalCount} files have errors
        </span>
      </div>
      {onValidate && (
        <button
          type="button"
          onClick={onValidate}
          className="hover:underline"
        >
          Re-run
        </button>
      )}
    </div>
  )
}

/**
 * Success view after PR is created.
 */
function PRSuccessView(props: {
  readonly pr: GitHubPullRequest
  readonly onClose: () => void
}) {
  const { pr, onClose } = props

  return (
    <div className="text-center space-y-4 py-4">
      {/* Success icon */}
      <div className="text-4xl text-[var(--color-accent)]">✓</div>

      {/* PR info */}
      <div className="space-y-2">
        <h3 className="text-lg font-mono font-semibold text-[var(--color-text)]">
          PR #{pr.number} Created
        </h3>
        <p className="text-sm font-mono text-[var(--color-text-muted)]">
          {pr.title}
        </p>
      </div>

      {/* Branch info */}
      <div className="flex items-center justify-center gap-2 text-sm font-mono text-[var(--color-text-dim)]">
        <span className="px-2 py-0.5 bg-[var(--color-surface-hover)] rounded">
          {pr.head.ref}
        </span>
        <span>→</span>
        <span className="px-2 py-0.5 bg-[var(--color-surface-hover)] rounded">
          {pr.base.ref}
        </span>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-center gap-3 pt-2">
        <a
          href={pr.htmlUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-mono text-[var(--color-bg)] bg-[var(--color-accent)] rounded hover:bg-[var(--color-accent-hover)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]"
        >
          <span>View on GitHub</span>
          <span>↗</span>
        </a>
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 text-sm font-mono text-[var(--color-text)] border border-[var(--color-border)] rounded hover:bg-[var(--color-surface-hover)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]"
        >
          Close
        </button>
      </div>
    </div>
  )
}
