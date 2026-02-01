"use client"

import { useState, useCallback, useRef, useEffect, useMemo } from "react"
import type { GitHubBranch } from "@/services/cms-client"

/**
 * BranchSelector component props.
 */
interface BranchSelectorProps {
  /** List of available branches from GitHub */
  readonly branches: readonly GitHubBranch[]
  /** Currently selected branch name */
  readonly selectedBranch: string
  /** Callback when a branch is selected */
  readonly onSelect: (branch: string) => void
  /** Callback when a new branch is created */
  readonly onCreate: (name: string) => void
  /** Whether the branch list is loading */
  readonly isLoading?: boolean
  /** Whether branch creation is in progress */
  readonly isCreating?: boolean
  /** Error message to display */
  readonly error?: string
  /** Whether there are unsaved changes */
  readonly hasUnsavedChanges?: boolean
  /** Default branch name for showing protected status */
  readonly defaultBranch?: string
}

/**
 * Validate branch name format.
 *
 * GitHub branch names must:
 * - Not start with a dot or slash
 * - Not contain consecutive dots or slashes
 * - Not end with .lock or a dot
 * - Not contain spaces or special characters
 */
function validateBranchName(name: string): string | null {
  if (!name || name.trim() === "") {
    return "Branch name is required"
  }

  const trimmed = name.trim()

  if (trimmed.startsWith(".") || trimmed.startsWith("/")) {
    return "Cannot start with . or /"
  }

  if (trimmed.endsWith(".lock") || trimmed.endsWith(".")) {
    return "Cannot end with .lock or ."
  }

  if (/[~^:?*\[\]\\@{}\s]/.test(trimmed)) {
    return "Cannot contain special characters or spaces"
  }

  if (/\.\./.test(trimmed) || /\/\//.test(trimmed)) {
    return "Cannot contain consecutive dots or slashes"
  }

  if (trimmed.length > 250) {
    return "Branch name too long (max 250 chars)"
  }

  return null
}

/**
 * Format branch name for display (shorten long names).
 */
function formatBranchName(name: string, maxLength = 30): string {
  if (name.length <= maxLength) return name
  return `${name.slice(0, maxLength - 3)}...`
}

/**
 * BranchSelector component.
 *
 * Select/create branches for editing in the CMS.
 *
 * Features:
 * - Dropdown with existing branches
 * - Current branch indicator
 * - Create new branch option with name validation
 * - Protected branch indicator
 * - Unsaved changes warning before switching
 *
 * Follows the terminal aesthetic design system.
 *
 * @example
 * ```tsx
 * <BranchSelector
 *   branches={branches}
 *   selectedBranch={currentBranch}
 *   onSelect={handleBranchSelect}
 *   onCreate={handleBranchCreate}
 *   hasUnsavedChanges={isDirty}
 * />
 * ```
 */
export function BranchSelector(props: BranchSelectorProps) {
  const {
    branches,
    selectedBranch,
    onSelect,
    onCreate,
    isLoading,
    isCreating,
    error,
    hasUnsavedChanges,
    defaultBranch,
  } = props

  // Dropdown open state
  const [isOpen, setIsOpen] = useState(false)
  // Create mode state
  const [isCreateMode, setIsCreateMode] = useState(false)
  // New branch name input
  const [newBranchName, setNewBranchName] = useState("")
  // Validation error for new branch name
  const [validationError, setValidationError] = useState<string | null>(null)
  // Pending branch switch (for unsaved changes confirmation)
  const [pendingSwitch, setPendingSwitch] = useState<string | null>(null)

  // Refs for click outside handling
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Find current branch info
  const currentBranch = useMemo(
    () => branches.find((b) => b.name === selectedBranch),
    [branches, selectedBranch],
  )

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!isOpen) return

    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
        setIsCreateMode(false)
        setNewBranchName("")
        setValidationError(null)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [isOpen])

  // Focus input when entering create mode
  useEffect(() => {
    if (isCreateMode && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isCreateMode])

  // Handle dropdown toggle
  const handleToggle = useCallback(() => {
    if (!isOpen) {
      setIsCreateMode(false)
      setNewBranchName("")
      setValidationError(null)
    }
    setIsOpen(!isOpen)
  }, [isOpen])

  // Handle branch selection
  const handleSelect = useCallback(
    (branchName: string) => {
      if (branchName === selectedBranch) {
        setIsOpen(false)
        return
      }

      if (hasUnsavedChanges) {
        setPendingSwitch(branchName)
      } else {
        onSelect(branchName)
        setIsOpen(false)
      }
    },
    [selectedBranch, hasUnsavedChanges, onSelect],
  )

  // Confirm branch switch (discard unsaved changes)
  const handleConfirmSwitch = useCallback(() => {
    if (pendingSwitch) {
      onSelect(pendingSwitch)
      setPendingSwitch(null)
      setIsOpen(false)
    }
  }, [pendingSwitch, onSelect])

  // Cancel branch switch
  const handleCancelSwitch = useCallback(() => {
    setPendingSwitch(null)
  }, [])

  // Handle create mode toggle
  const handleEnterCreateMode = useCallback(() => {
    setIsCreateMode(true)
    setNewBranchName("")
    setValidationError(null)
  }, [])

  // Handle new branch name input
  const handleNameChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setNewBranchName(value)
    setValidationError(validateBranchName(value))
  }, [])

  // Handle branch creation
  const handleCreate = useCallback(() => {
    const error = validateBranchName(newBranchName)
    if (error) {
      setValidationError(error)
      return
    }

    // Check if branch already exists
    if (branches.some((b) => b.name === newBranchName.trim())) {
      setValidationError("Branch already exists")
      return
    }

    onCreate(newBranchName.trim())
    setIsCreateMode(false)
    setNewBranchName("")
    setValidationError(null)
    setIsOpen(false)
  }, [newBranchName, branches, onCreate])

  // Handle keyboard events for create input
  const handleCreateKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !validationError && newBranchName.trim()) {
        e.preventDefault()
        handleCreate()
      }
      if (e.key === "Escape") {
        e.preventDefault()
        setIsCreateMode(false)
        setNewBranchName("")
        setValidationError(null)
      }
    },
    [validationError, newBranchName, handleCreate],
  )

  // Handle keyboard events for dropdown
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault()
        setIsOpen(false)
        setIsCreateMode(false)
      }
    },
    [],
  )

  return (
    <div ref={containerRef} className="relative" onKeyDown={handleKeyDown}>
      {/* Trigger button */}
      <button
        type="button"
        onClick={handleToggle}
        disabled={isLoading}
        className={`
          inline-flex items-center gap-2
          min-h-[36px] px-3 py-1.5
          font-mono text-sm
          border border-[var(--color-border)]
          rounded
          bg-[var(--color-surface)]
          hover:bg-[var(--color-surface-hover)]
          focus:outline-none
          focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]
          transition-colors duration-[var(--transition-fast)]
          disabled:opacity-50 disabled:cursor-not-allowed
        `}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={`Current branch: ${selectedBranch}`}
      >
        {/* Branch icon */}
        <span className="text-[var(--color-text-muted)]">⎇</span>

        {/* Branch name */}
        <span className={`${currentBranch?.protected ? "text-[var(--color-warning)]" : "text-[var(--color-text)]"}`}>
          {isLoading ? "..." : formatBranchName(selectedBranch)}
        </span>

        {/* Protected indicator */}
        {currentBranch?.protected && (
          <span className="text-xs text-[var(--color-warning)]" title="Protected branch">
            🔒
          </span>
        )}

        {/* Dropdown arrow */}
        <span className="text-[var(--color-text-dim)] text-xs ml-1">{isOpen ? "▲" : "▼"}</span>
      </button>

      {/* Dropdown menu */}
      {isOpen && (
        <div
          className="absolute top-full left-0 mt-1 min-w-[240px] max-w-[320px] bg-[var(--color-surface)] border border-[var(--color-border)] rounded shadow-lg z-50"
          role="listbox"
          aria-label="Select branch"
          tabIndex={-1}
        >
          {/* Error message */}
          {error && (
            <div className="px-3 py-2 text-xs font-mono text-[var(--color-error)] bg-[rgba(255,65,54,0.1)] border-b border-[var(--color-border)]">
              {error}
            </div>
          )}

          {/* Branch list */}
          <div className="max-h-48 overflow-y-auto">
            {branches.length === 0 && !isLoading ? (
              <div className="px-3 py-4 text-sm font-mono text-[var(--color-text-dim)] text-center">
                No branches found
              </div>
            ) : (
              branches.map((branch) => (
                <button
                  key={branch.name}
                  type="button"
                  role="option"
                  aria-selected={branch.name === selectedBranch}
                  onClick={() => handleSelect(branch.name)}
                  className={`
                    w-full flex items-center gap-2 px-3 py-2 text-sm font-mono text-left
                    transition-colors
                    ${
                      branch.name === selectedBranch
                        ? "bg-[var(--color-accent-bg)] text-[var(--color-accent)]"
                        : "text-[var(--color-text)] hover:bg-[var(--color-surface-hover)]"
                    }
                  `}
                >
                  {/* Check mark for selected */}
                  <span className="w-4 text-center">
                    {branch.name === selectedBranch ? "✓" : ""}
                  </span>

                  {/* Branch name */}
                  <span className="flex-1 truncate">{branch.name}</span>

                  {/* Protected/default badges */}
                  {branch.protected && (
                    <span className="text-xs text-[var(--color-warning)]" title="Protected">
                      🔒
                    </span>
                  )}
                  {branch.name === defaultBranch && (
                    <span className="text-[10px] px-1 py-0.5 rounded bg-[var(--color-surface-hover)] text-[var(--color-text-dim)]">
                      default
                    </span>
                  )}
                </button>
              ))
            )}
          </div>

          {/* Divider */}
          <div className="border-t border-[var(--color-border)]" />

          {/* Create branch section */}
          {isCreateMode ? (
            <div className="p-3 space-y-2">
              <div className="flex items-center gap-2">
                <input
                  ref={inputRef}
                  type="text"
                  value={newBranchName}
                  onChange={handleNameChange}
                  onKeyDown={handleCreateKeyDown}
                  placeholder="new-branch-name"
                  className="flex-1 px-2 py-1.5 text-sm font-mono bg-[var(--color-bg)] border border-[var(--color-border)] rounded text-[var(--color-text)] placeholder-[var(--color-text-dim)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:border-[var(--color-accent)]"
                  aria-label="New branch name"
                  aria-invalid={!!validationError}
                  aria-describedby={validationError ? "branch-name-error" : undefined}
                />
                <button
                  type="button"
                  onClick={handleCreate}
                  disabled={!!validationError || !newBranchName.trim() || isCreating}
                  className="px-2 py-1.5 text-sm font-mono text-[var(--color-accent)] border border-[var(--color-accent)] rounded hover:bg-[var(--color-accent-bg)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  aria-label="Create branch"
                >
                  {isCreating ? "..." : "✓"}
                </button>
              </div>

              {/* Validation error */}
              {validationError && (
                <p id="branch-name-error" className="text-xs font-mono text-[var(--color-error)]">
                  {validationError}
                </p>
              )}

              {/* Help text */}
              <p className="text-xs font-mono text-[var(--color-text-dim)]">
                Creates from {selectedBranch}
              </p>
            </div>
          ) : (
            <button
              type="button"
              onClick={handleEnterCreateMode}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm font-mono text-[var(--color-accent)] hover:bg-[var(--color-surface-hover)] transition-colors"
            >
              <span className="w-4 text-center">+</span>
              <span>Create new branch</span>
            </button>
          )}
        </div>
      )}

      {/* Unsaved changes confirmation dialog */}
      {pendingSwitch && (
        <div className="fixed inset-0 flex items-center justify-center z-50">
          {/* Backdrop - click or Escape to close */}
          <div
            className="absolute inset-0 bg-black/50"
            onClick={handleCancelSwitch}
            onKeyDown={(e) => e.key === "Escape" && handleCancelSwitch()}
            role="presentation"
          />

          {/* Dialog */}
          <div
            className="relative bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg shadow-lg p-4 max-w-sm mx-4"
            role="alertdialog"
            aria-labelledby="unsaved-changes-title"
            aria-describedby="unsaved-changes-description"
          >
            <h3
              id="unsaved-changes-title"
              className="text-sm font-mono font-semibold text-[var(--color-text)] mb-2"
            >
              Unsaved Changes
            </h3>
            <p
              id="unsaved-changes-description"
              className="text-sm font-mono text-[var(--color-text-muted)] mb-4"
            >
              You have unsaved changes. Switching branches will discard them.
            </p>
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={handleCancelSwitch}
                className="px-3 py-1.5 text-sm font-mono text-[var(--color-text)] border border-[var(--color-border)] rounded hover:bg-[var(--color-surface-hover)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmSwitch}
                className="px-3 py-1.5 text-sm font-mono text-[var(--color-error)] border border-[var(--color-error)] rounded hover:bg-[rgba(255,65,54,0.1)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-error)]"
              >
                Discard & Switch
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * Compact branch indicator for use in headers.
 *
 * Shows current branch name with protected status.
 * Click navigates to branch selector or shows branch info.
 */
export function BranchIndicator(props: {
  readonly branchName: string
  readonly isProtected?: boolean
  readonly onClick?: () => void
}) {
  const { branchName, isProtected, onClick } = props

  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1.5 px-2 py-1 text-xs font-mono text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors"
      aria-label={`Branch: ${branchName}${isProtected ? " (protected)" : ""}`}
    >
      <span>⎇</span>
      <span className={isProtected ? "text-[var(--color-warning)]" : undefined}>
        {formatBranchName(branchName, 20)}
      </span>
      {isProtected && <span title="Protected">🔒</span>}
    </button>
  )
}
